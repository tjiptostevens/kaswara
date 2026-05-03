// supabase/functions/send-whatsapp/index.ts
// Edge Function: kirim pesan WhatsApp pengingat iuran via Fonnte API.
// Simpan WA_API_TOKEN sebagai Supabase secret (dari https://fonnte.com).

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
    const waToken = Deno.env.get('WA_API_TOKEN') ?? ''

    if (!waToken) {
      return new Response(JSON.stringify({ error: 'WA_API_TOKEN tidak dikonfigurasi' }), {
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
    // Kirim ke satu nomor (per-baris dari IuranPage)
    const { no_hp, pesan, organisasi_id } = body

    if (!no_hp || !pesan || !organisasi_id) {
      return new Response(JSON.stringify({ error: 'no_hp, pesan, dan organisasi_id wajib diisi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pastikan pemanggil adalah bendahara/ketua
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

    // Normalise nomor HP ke format Fonnte (628xxx)
    // Asumsi: nomor HP Indonesia dimulai dengan 0 atau +62
    const normalised = no_hp.replace(/\D/g, '').replace(/^0/, '62')

    const formData = new FormData()
    formData.append('target', normalised)
    formData.append('message', pesan)
    formData.append('countryCode', '62')

    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: waToken },
      body: formData,
    })

    const result = await res.json().catch(() => ({}))

    if (!res.ok || result?.status === false) {
      return new Response(
        JSON.stringify({ error: result?.reason ?? result?.detail ?? 'Gagal mengirim WhatsApp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ success: true, detail: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
