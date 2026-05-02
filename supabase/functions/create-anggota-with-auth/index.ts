// supabase/functions/create-anggota-with-auth/index.ts
// Edge Function: kirim undangan (invite) ke anggota baru + insert anggota_organisasi.
// Dijalankan server-side dengan service role key — kunci ini TIDAK pernah dikirim ke frontend.
// Anggota baru menerima email undangan dari Supabase dan menetapkan password sendiri.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const siteUrl = Deno.env.get('SITE_URL') ?? supabaseUrl

    // Admin client (tidak pernah dikirim ke browser)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Verifikasi JWT pemanggil menggunakan anon client
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseClient.auth.getUser()

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { email, nama_lengkap, nomor_anggota, no_hp, role, organisasi_id, aktif = true } = body

    if (!email || !nama_lengkap || !role || !organisasi_id) {
      return new Response(JSON.stringify({ error: 'Field email, nama_lengkap, role, dan organisasi_id wajib diisi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Hanya bendahara atau ketua yang boleh menambah anggota
    const { data: callerProfile } = await supabaseAdmin
      .from('anggota_organisasi')
      .select('role')
      .eq('user_id', caller.id)
      .eq('organisasi_id', organisasi_id)
      .eq('aktif', true)
      .single()

    if (!callerProfile || !['bendahara', 'ketua'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: hanya bendahara atau ketua yang bisa menambah anggota' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Kirim undangan — Supabase membuat akun auth dan mengirim email invite ke anggota.
    // Anggota akan menetapkan passwordnya sendiri saat menerima link undangan.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${siteUrl}/login`,
      },
    })

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newUserId = inviteData.user.id

    // Insert record anggota
    const { data: anggota, error: anggotaError } = await supabaseAdmin
      .from('anggota_organisasi')
      .insert({
        user_id: newUserId,
        organisasi_id,
        role,
        nama_lengkap,
        nomor_anggota: nomor_anggota || null,
        email,
        no_hp: no_hp || null,
        aktif,
      })
      .select()
      .single()

    if (anggotaError) {
      // Rollback: hapus akun auth jika insert anggota gagal
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      return new Response(JSON.stringify({ error: anggotaError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ data: anggota }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
