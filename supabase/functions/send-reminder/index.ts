// supabase/functions/send-reminder/index.ts
// Edge Function: kirim email pengingat iuran ke anggota yang belum bayar bulan ini.
// Menggunakan Resend API — simpan RESEND_API_KEY sebagai Supabase secret.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY tidak dikonfigurasi' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verifikasi JWT pemanggil
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerError } = await supabaseClient.auth.getUser()
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    const { organisasi_id, anggota_ids } = body

    if (!organisasi_id) {
      return new Response(JSON.stringify({ error: 'organisasi_id wajib diisi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pastikan pemanggil adalah bendahara/ketua di organisasi ini
    const { data: callerProfile } = await supabaseAdmin
      .from('anggota_organisasi')
      .select('role')
      .eq('user_id', caller.id)
      .eq('organisasi_id', organisasi_id)
      .eq('aktif', true)
      .single()

    if (!callerProfile || !['bendahara', 'ketua'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ambil nama organisasi
    const { data: org } = await supabaseAdmin
      .from('organisasi')
      .select('nama')
      .eq('id', organisasi_id)
      .single()
    const namaOrg = org?.nama ?? 'Organisasi Anda'

    // Ambil iuran yang belum bayar bulan ini
    const now = new Date()
    const periodePrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    let iuranQuery = supabaseAdmin
      .from('iuran_rutin')
      .select('id, jumlah, periode, anggota_organisasi(nama_lengkap, email, no_hp)')
      .eq('organisasi_id', organisasi_id)
      .eq('status', 'belum_bayar')
      .ilike('periode', `${periodePrefix}%`)

    if (anggota_ids?.length) {
      iuranQuery = iuranQuery.in('anggota_id', anggota_ids)
    }

    const { data: iuranList, error: iuranErr } = await iuranQuery
    if (iuranErr) {
      return new Response(JSON.stringify({ error: iuranErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!iuranList || iuranList.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'Tidak ada iuran yang belum dibayar bulan ini' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Filter hanya yang punya email
    const targets = iuranList.filter((i) => i.anggota_organisasi?.email)
    let sent = 0
    const errors: string[] = []

    for (const iuran of targets) {
      const anggota = iuran.anggota_organisasi
      const emailHtml = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e5e5;border-radius:8px;">
          <h2 style="color:#0f3d32;margin-bottom:8px;">Pengingat Iuran — ${namaOrg}</h2>
          <p style="color:#555;font-size:14px;">Yth. <strong>${anggota.nama_lengkap}</strong>,</p>
          <p style="color:#555;font-size:14px;">
            Iuran bulan <strong>${iuran.periode}</strong> sebesar
            <strong style="color:#1a6b5a;">Rp ${Number(iuran.jumlah).toLocaleString('id-ID')}</strong>
            belum tercatat lunas.
          </p>
          <p style="color:#555;font-size:14px;">Mohon segera melakukan pembayaran kepada bendahara atau sesuai petunjuk yang berlaku.</p>
          <p style="color:#999;font-size:12px;margin-top:24px;">Email ini dikirim otomatis oleh sistem Kaswara — ${namaOrg}</p>
        </div>
      `

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Kaswara <noreply@kaswara.app>',
          to: [anggota.email],
          subject: `[${namaOrg}] Pengingat Iuran ${iuran.periode}`,
          html: emailHtml,
        }),
      })

      if (res.ok) {
        sent++
      } else {
        const err = await res.json().catch(() => ({}))
        errors.push(`${anggota.email}: ${err?.message ?? res.statusText}`)
      }
    }

    return new Response(
      JSON.stringify({ sent, total: targets.length, errors: errors.length ? errors : undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
