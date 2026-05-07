import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const PublikLandingPage = () => {
    const [kode, setKode] = useState('')
    const [preview, setPreview] = useState(null) // organisasi preview setelah cari
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [scanError, setScanError] = useState(null)
    const scannerRef = useRef(null)
    const qrRegionId = 'qr-reader-region'

    const startScanner = () => {
        setScanError(null)
        setScanning(true)
    }

    useEffect(() => {
        if (!scanning) return
        let html5QrCode
        const init = async () => {
            try {
                html5QrCode = new Html5Qrcode(qrRegionId)
                scannerRef.current = html5QrCode
                await html5QrCode.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 220, height: 220 } },
                    (decodedText) => {
                        const uuidMatch = decodedText.match(
                            /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
                        )
                        const uuid = uuidMatch ? uuidMatch[0] : decodedText
                        console.log('QR Code detected, UUID:', uuid)
                        setKode(uuid)
                        setPreview(null)
                        stopScanner()
                    },
                    () => { }
                )
            } catch (err) {
                setScanError('Kamera tidak dapat diakses. Pastikan izin kamera diberikan.')
                setScanning(false)
            }
        }
        init()
        return () => {
            try {
                if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(() => { })
            } catch (_) { }
        }
    }, [scanning])

    const stopScanner = () => {
        const instance = scannerRef.current
        scannerRef.current = null
        setScanning(false)
        if (instance) {
            try {
                if (instance.isScanning) {
                    instance.stop().catch(() => { })
                }
            } catch (_) { }
        }
    }

    useEffect(() => {
        return () => {
            try {
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(() => { })
                }
            } catch (_) { }
        }
    }, [])

    const handleCari = async (e) => {
        e.preventDefault()
        setError(null)
        setPreview(null)
        const trimmed = kode.trim()
        if (!trimmed) { setError('Masukkan UUID kode organisasi terlebih dahulu.'); return }

        setLoading(true)
        const { data, error: fetchErr } = await supabase
            .from('organisasi')
            .select('id, nama, tipe, alamat')
            .eq('id', trimmed)
            .single()
        setLoading(false)

        if (fetchErr || !data) {
            setError('Organisasi tidak ditemukan. Pastikan kode yang dimasukkan benar.')
            return
        }

        setPreview(data)
    }
    return (
        <div className="min-h-screen bg-warm relative overflow-hidden">
            {/* Decorative background ornaments */}
            <div className="bg-ornament opacity-60">
                <div className="bg-blob w-[60vw] h-[60vw] bg-brand/15 -top-[20vw] -left-[10vw]" />
                <div className="bg-blob w-[50vw] h-[50vw] bg-accent/15 bottom-[10vw] -right-[10vw]" />
                <div className="bg-blob w-[40vw] h-[40vw] bg-success/10 top-1/2 left-1/3 -translate-y-1/2" />
            </div>

            {/* Navbar publik */}
            <header className="glass-sidebar px-4 md:px-8 py-4 flex items-center justify-between border-b border-white/10 z-10 relative">
                {/* Logo */}
                <div className="flex items-center gap-3 justify-center">
                    <img src="/logo.png" alt="Kaswara logo" className="w-8 h-8 rounded shrink-0" />
                    <div>
                        <p className="text-[22px] font-bold text-white leading-none">
                            kas<span className="text-accent">wara</span>
                        </p>
                        <p className="text-[11px] text-white/40 mt-0.5">Kas Warga Negara</p>
                    </div>
                </div>
                <span className="text-[10px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                    Transparansi Publik
                </span>
            </header>
            <main className="p-4 md:p-8 relative z-10">
                <div className="max-w-2xl mx-auto text-center">
                    <form onSubmit={handleCari} className="space-y-4">
                        <Input
                            label="Kode Organisasi"
                            placeholder="Tempel UUID organisasi di sini"
                            value={kode}
                            onChange={(e) => { setKode(e.target.value); setPreview(null) }}
                            hint="Minta kode dari bendahara atau ketua organisasi"
                        />
                        <Button type="submit" variant="secondary" fullWidth loading={loading && !preview}>
                            Cari Organisasi
                        </Button>
                    </form>
                    {/* scan qr code */}
                    <div className="my-6">
                        <p className="text-sm text-stone mb-2">Atau pindai kode QR organisasi:</p>
                        {!scanning ? (
                            <button
                                type="button"
                                onClick={startScanner}
                                className="w-full border-2 border-dashed border-stone rounded-lg p-6 flex flex-col items-center gap-2 hover:border-brand/60 hover:bg-brand/5 transition-colors cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                                </svg>
                                <span className="text-sm text-stone">Klik untuk membuka kamera &amp; pindai QR</span>
                            </button>
                        ) : (
                            <div className="rounded-lg overflow-hidden border-2 border-brand/40">
                                <div id={qrRegionId} className="w-full" />
                                <button
                                    type="button"
                                    onClick={stopScanner}
                                    className="w-full py-2 text-sm text-stone bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    Batalkan Pemindaian
                                </button>
                            </div>
                        )}
                        {scanError && (
                            <p className="text-xs text-red-400 mt-2">{scanError}</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublikLandingPage;