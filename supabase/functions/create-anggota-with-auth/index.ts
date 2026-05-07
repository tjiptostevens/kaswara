// supabase/functions/create-anggota-with-auth/index.ts
// Edge Function: kirim undangan (invite) ke anggota baru + insert anggota_organisasi.
// Dijalankan server-side dengan service role key — kunci ini TIDAK pernah dikirim ke frontend.
// Anggota baru menerima email undangan dari Supabase dan menetapkan password sendiri.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const siteUrl = Deno.env.get("SITE_URL") ?? supabaseUrl;

    // Admin client (tidak pernah dikirim ke browser)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verifikasi JWT pemanggil menggunakan anon client
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseClient.auth.getUser();

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      email,
      nama_lengkap,
      nomor_anggota,
      no_hp,
      role,
      organisasi_id,
      aktif = true,
      can_manage_rab = false,
      can_manage_rap = false,
      can_approve_rab = false,
      can_approve_join_request = false,
    } = body;

    if (!email || !nama_lengkap || !role || !organisasi_id) {
      return new Response(
        JSON.stringify({
          error:
            "Field email, nama_lengkap, role, dan organisasi_id wajib diisi",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Hanya bendahara atau ketua yang boleh menambah anggota
    const { data: callerProfile } = await supabaseAdmin
      .from("anggota_organisasi")
      .select("role")
      .eq("user_id", caller.id)
      .eq("organisasi_id", organisasi_id)
      .eq("aktif", true)
      .single();

    if (
      !callerProfile ||
      !["bendahara", "ketua"].includes(callerProfile.role)
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Forbidden: hanya bendahara atau ketua yang bisa menambah anggota",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Cek apakah email sudah terdaftar di Kaswara
    // GoTrue admin API uses `search` (not `email`) for filtering; we then do an exact match.
    let existingUserId: string | null = null;
    const searchRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?search=${encodeURIComponent(email)}&page=1&per_page=50`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      },
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const users: any[] = Array.isArray(searchData.users)
        ? searchData.users
        : [];
      const match = users.find((u) => u.email === email);
      if (match) {
        existingUserId = match.id;
      }
    }

    // Cek apakah sudah menjadi anggota organisasi ini
    if (existingUserId) {
      const { data: existingMember } = await supabaseAdmin
        .from("anggota_organisasi")
        .select("id")
        .eq("user_id", existingUserId)
        .eq("organisasi_id", organisasi_id)
        .single();

      if (existingMember) {
        return new Response(
          JSON.stringify({
            error: "Pengguna ini sudah menjadi anggota organisasi",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    let newUserId: string;
    let existingUser = false;

    if (existingUserId) {
      // Pengguna sudah punya akun Kaswara — tambahkan langsung tanpa undangan
      newUserId = existingUserId;
      existingUser = true;
    } else {
      // Kirim undangan — Supabase membuat akun auth dan mengirim email invite ke anggota.
      // Anggota akan menetapkan passwordnya sendiri saat menerima link undangan.
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "invite",
          email,
          options: {
            redirectTo: `${siteUrl}/login`,
          },
        });

      if (inviteError) {
        // Fallback: jika gagal karena email sudah terdaftar, coba cari lagi dengan pencarian lebih luas
        const alreadyExists =
          inviteError.message.toLowerCase().includes("already") ||
          inviteError.message.toLowerCase().includes("registered") ||
          inviteError.message.toLowerCase().includes("exist");

        if (alreadyExists) {
          // Cari user berdasarkan email dengan page yang lebih besar
          const fallbackRes = await fetch(
            `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
            {
              headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                apikey: serviceRoleKey,
              },
            },
          );
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            const fallbackUsers: any[] = Array.isArray(fallbackData.users)
              ? fallbackData.users
              : [];
            const match = fallbackUsers.find((u) => u.email === email);
            if (match) {
              newUserId = match.id;
              existingUser = true;
            }
          }
        }

        if (!existingUser) {
          return new Response(JSON.stringify({ error: inviteError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        newUserId = inviteData.user.id;
      }
    }

    // Insert record anggota
    const { data: anggota, error: anggotaError } = await supabaseAdmin
      .from("anggota_organisasi")
      .insert({
        user_id: newUserId,
        organisasi_id,
        role,
        nama_lengkap,
        nomor_anggota: nomor_anggota || null,
        email,
        no_hp: no_hp || null,
        aktif,
        can_manage_rab,
        can_manage_rap,
        can_approve_rab,
        can_approve_join_request,
      })
      .select()
      .single();

    if (anggotaError) {
      // Rollback: hapus akun auth jika insert anggota gagal dan akun baru dibuat
      if (!existingUser) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
      }
      return new Response(JSON.stringify({ error: anggotaError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ data: anggota, existing_user: existingUser }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
