"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { supabase } from "../../lib/supabase";

// Konfigurasi Batas Waktu & Toleransi
const BATAS_PAGI = { jam: 8, menit: 45 }; // 08.30 + Toleransi 15 menit
const BATAS_SIANG = { jam: 13, menit: 40 }; // 13.30 + Toleransi 10 menit

// Konfigurasi Koordinat Pusat & Radius Maksimal (Meter) Sesuai Instruksi Baru
const ITERA_COORDS = { lat: -5.361523, lng: 105.310523 };
const RADIUS_MAKSIMAL = 200; // Sangat ketat: Hanya 200 meter dari titik

const MASTER_PESERTA = [
  "Donni Rides Imanuel Simanungkalit",
  "Otniel Faraytoda Simatupang",
  "Aditya Arya Wijaya",
  "M. Ragoz Rayhan",
  "Alif Muhammad Iqbal",
  "Tubagus Aan Kurniawan",
  "Pasqual Rey Marvin Manurung",
  "Erlangga Hadi Pratama",
  "Muhammad Agung Ramadhan",
  "Michelle Ivana Adelin",
  "Dwi Atika Aulia",
];

const MASTER_ASISTEN = [
  "Septy Engel",
  "Tias Murdyani",
  "Muhammad Fadhil Alfitra Budi",
  "Al Mukhlisin",
  "Dea Ilham Firdaus",
  "Bintang Aditya Pratama",
  "Muhammad Afiq Ahnaf Sadakatullah",
  "Jonatan Sitinjak",
  "Felira Dwi Maharani",
  "Muhammad Hakim Maarif",
  "Adriel Siregar",
  "Rifqi Fadilah",
  "Reza Mahendra",
  "Alvin Saputra",
  "Aldy Rizki Siahaan"
];

interface NotaAbsen {
  nama: string;
  jenis: string;
  waktu: string;
  statusKehadiran: string;
}

export default function Absensi() {
  const [jalur, setJalur] = useState<string>("peserta");
  const [nama, setNama] = useState<string>("");
  const [langkah, setLangkah] = useState<number>(1);
  const [lokasi, setLokasi] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<string>("");
  const [nota, setNota] = useState<NotaAbsen | null>(null);
  const webcamRef = useRef<any>(null);

  const [rekomendasi, setRekomendasi] = useState<string[]>([]);
  const [tampilkanSaran, setTampilkanSaran] = useState<boolean>(false);

  // State Kendali Kamera
  const [kameraDepan, setKameraDepan] = useState<boolean>(true);
  const [isMirrored, setIsMirrored] = useState<boolean>(false);

  // STATE: Jam Digital Live untuk Detektor Keterlambatan Real-Time
  const [waktuLive, setWaktuLive] = useState<Date | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const j = searchParams.get('jalur');
    if (j === 'asisten') setJalur('asisten');
  }, []);

  // Efek untuk memutar jam secara live ketika kamera terbuka (Langkah 2)
  useEffect(() => {
    if (langkah === 2) {
      setWaktuLive(new Date());
      const interval = setInterval(() => setWaktuLive(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [langkah]);

  const daftarNamaAktif = jalur === 'asisten' ? MASTER_ASISTEN : MASTER_PESERTA;

  const handleKetikNama = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nilaiInput = e.target.value;
    setNama(nilaiInput);

    if (nilaiInput.trim() !== "") {
      const hasilFilter = daftarNamaAktif.filter((n) =>
        n.toLowerCase().includes(nilaiInput.toLowerCase())
      );
      setRekomendasi(hasilFilter);
      setTampilkanSaran(true);
    } else {
      setRekomendasi([]);
      setTampilkanSaran(false);
    }
  };

  const pilihNamaRekomendasi = (namaTerpilih: string) => {
    setNama(namaTerpilih);
    setTampilkanSaran(false);
  };

  // Kalkulator Spasial Haversine Formula
  const hitungJarakMeter = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const lanjutKeKamera = () => {
    if (!nama) return setStatus("Mohon isi nama terlebih dahulu.");
    if (!daftarNamaAktif.includes(nama)) return setStatus(`Nama tidak terdaftar di sistem ${jalur === 'asisten' ? 'Asisten' : 'KP'}.`);

    setStatus("Verifying location compliance...");
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        const jarakKeItera = hitungJarakMeter(userLat, userLng, ITERA_COORDS.lat, ITERA_COORDS.lng);

        if (jarakKeItera > RADIUS_MAKSIMAL) {
          setStatus(`Access Denied: You are outside the authorized zone (${Math.round(jarakKeItera)} meters away). Maximum perimeter allowance is ${RADIUS_MAKSIMAL}m.`);
          return;
        }

        setLokasi({ lat: userLat, lng: userLng });
        setLangkah(2);
        setStatus("");
      },
      (err) => setStatus(`GPS Failed: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const kirimData = useCallback(async (jenis: string) => {
    setStatus("saving data...");

    try {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (!imageSrc) return setStatus("Failed to capture photo. Please try again.");
      
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      const namaBerkas = `${Date.now()}-${nama.replace(/\s+/g, '-')}.jpg`;

      const { error: uploadError } = await supabase.storage.from('foto-absen').upload(namaBerkas, blob);
      if (uploadError) return setStatus(`Failed to upload photo: ${uploadError.message}`);

      const { data } = supabase.storage.from('foto-absen').getPublicUrl(namaBerkas);
      const finalFotoUrl = data.publicUrl;

      const waktuSekarang = new Date();
      const jam = waktuSekarang.getHours();
      const menit = waktuSekarang.getMinutes();
      
      let statusKehadiran = "Tepat Waktu";
      
      if (jenis === "MASUK") {
        if (jam > BATAS_PAGI.jam || (jam === BATAS_PAGI.jam && menit > BATAS_PAGI.menit)) {
          statusKehadiran = "Terlambat";
        }
      } else if (jenis === "SIANG") {
        if (jam > BATAS_SIANG.jam || (jam === BATAS_SIANG.jam && menit > BATAS_SIANG.menit)) {
          statusKehadiran = "Terlambat";
        }
      }

      const { error: dbError } = await supabase.from('absensi').insert([{
        nama_peserta: nama,
        jenis_absen: jenis,
        peran: jalur.toUpperCase(),
        latitude: lokasi?.lat,
        longitude: lokasi?.lng,
        foto_url: finalFotoUrl
      }]);

      if (dbError) return setStatus(`Failed to save data: ${dbError.message}`);

      setNota({
        nama: nama,
        jenis: jenis === "MASUK" ? "Absen Pagi" : "Absen Siang",
        waktu: waktuSekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB",
        statusKehadiran: statusKehadiran
      });
      
      setLangkah(3);
      setStatus("");

      setTimeout(() => { 
        setLangkah(1); 
        setNama(""); 
        setNota(null);
        window.location.href = "/"; 
      }, 4000);

    } catch (error) {
      setStatus("An error occurred. Please try again.");
    }
  }, [nama, lokasi, jalur]);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 font-sans text-black selection:bg-blue-100 overflow-hidden">
      
      <div className="absolute inset-0 bg-[url('/bg-plts.jpg')] bg-cover bg-center bg-no-repeat bg-fixed z-0"></div>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-0"></div>

      <div className={`relative z-10 bg-white p-6 sm:p-8 rounded-[2rem] shadow-2xl w-full max-w-md mx-auto border border-gray-100 border-t-[6px] transition-all duration-500 ${jalur === 'asisten' ? 'border-t-amber-400' : 'border-t-blue-600'}`}>
        
        {langkah !== 3 && (
          <>
            <div className="flex flex-col items-center mb-6 sm:mb-8 mt-1">
              <img src="/logo-plts.png" alt="Logo PLTS" className="h-10 sm:h-14 object-contain mb-3 sm:mb-4" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight text-center">Presensi {jalur === 'asisten' ? 'Asisten' : 'Peserta KP'}</h1>
            </div>

            {langkah === 1 && (
              <div className="flex flex-col gap-4 sm:gap-5">
                <div className="relative">
                  <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Nama Lengkap</label>
                  <input 
                    type="text" 
                    placeholder="Ketik Nama Anda..." 
                    value={nama}
                    onChange={handleKetikNama}
                    onFocus={() => nama && setTampilkanSaran(true)}
                    className="w-full bg-gray-50 border border-gray-200 p-3 sm:p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-black text-base placeholder-gray-400 transition-all"
                  />
                  {tampilkanSaran && rekomendasi.length > 0 && (
                    <div className="absolute left-0 right-0 top-full bg-white border border-gray-100 rounded-xl shadow-xl mt-2 z-50 max-h-48 overflow-y-auto overflow-hidden">
                      {rekomendasi.map((namaSaran) => (
                        <div
                          key={namaSaran}
                          onClick={() => pilihNamaRekomendasi(namaSaran)}
                          className="p-3 sm:p-3.5 hover:bg-gray-50 text-gray-800 text-sm cursor-pointer border-b border-gray-50 last:border-none transition-colors"
                        >
                          {namaSaran}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={lanjutKeKamera} 
                  className={`w-full py-3.5 sm:py-4 rounded-xl font-semibold text-white text-sm sm:text-base shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${jalur === 'asisten' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Continue
                </button>
                <button onClick={() => window.location.href = "/"} className="text-xs sm:text-sm font-medium text-gray-400 hover:text-gray-600 mt-2 transition-colors text-center w-full">
                  Back to Home
                </button>
              </div>
            )}

            {langkah === 2 && (
              <div className="flex flex-col gap-4 sm:gap-5 items-center animate-fade-in">
                
                <div className="w-full rounded-2xl overflow-hidden shadow-inner border border-gray-100 bg-gray-50 aspect-[3/4] sm:aspect-auto flex items-center justify-center bg-black relative group">
                  <Webcam 
                    ref={webcamRef} 
                    screenshotFormat="image/jpeg" 
                    videoConstraints={{ facingMode: kameraDepan ? "user" : "environment" }} 
                    mirrored={isMirrored}
                    className="w-full h-full object-cover" 
                  />
                  
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <button 
                      onClick={() => setKameraDepan(!kameraDepan)}
                      className="bg-black/40 hover:bg-black/70 text-white p-2.5 rounded-full backdrop-blur-md transition-all shadow-lg border border-white/20"
                      title="Ganti Kamera Depan/Belakang"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    </button>
                    <button 
                      onClick={() => setIsMirrored(!isMirrored)}
                      className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-lg border border-white/20 ${isMirrored ? 'bg-blue-600/90 text-white' : 'bg-black/40 hover:bg-black/70 text-white'}`}
                      title="Nyalakan/Matikan Efek Cermin"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                    </button>
                  </div>
                </div>

                <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Time</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    {waktuLive ? waktuLive.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "--:--:--"} WIB
                  </span>
                </div>

                {waktuLive && (
                  <div className="w-full space-y-2">
                    {(waktuLive.getHours() > BATAS_PAGI.jam || (waktuLive.getHours() === BATAS_PAGI.jam && waktuLive.getMinutes() > BATAS_PAGI.menit)) && waktuLive.getHours() < 12 && (
                      <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 p-3 rounded-xl animate-fade-in shadow-sm">
                        <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        <p className="text-[11px] font-medium text-rose-700 leading-snug">
                          Anda telah melewati batas Absen Pagi. Log Anda akan tercatat sebagai <span className="font-extrabold">Terlambat</span>.
                        </p>
                      </div>
                    )}
                    
                    {(waktuLive.getHours() > BATAS_SIANG.jam || (waktuLive.getHours() === BATAS_SIANG.jam && waktuLive.getMinutes() > BATAS_SIANG.menit)) && waktuLive.getHours() >= 12 && (
                      <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 p-3 rounded-xl animate-fade-in shadow-sm">
                        <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        <p className="text-[11px] font-medium text-rose-700 leading-snug">
                          Anda telah melewati batas Absen Siang. Log Anda akan tercatat sebagai <span className="font-extrabold">Terlambat</span>.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3 w-full mt-1 sm:mt-2">
                  <button onClick={() => kirimData('MASUK')} className="flex-1 bg-gray-900 hover:bg-black transition-all text-white py-3.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base shadow-sm hover:shadow-md">
                    Absen Pagi
                  </button>
                  <button onClick={() => kirimData('SIANG')} className="flex-1 bg-white border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all text-gray-900 py-3.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base">
                    Absen Siang
                  </button>
                </div>
                {/* PERBAIKAN SINTAKS ERROR: Mengganti operator logika "||" dengan eksekusi urut block statement */}
                <button onClick={() => { setLokasi(null); setLangkah(1); }} className="text-xs sm:text-sm font-medium text-gray-400 hover:text-gray-600 mt-2 transition-colors">
                  Cancel
                </button>
              </div>
            )}

            {status && (
              <div className="mt-5 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs sm:text-sm text-gray-700 font-medium text-center animate-pulse">
                {status}
              </div>
            )}
          </>
        )}

        {langkah === 3 && nota && (
          <div className="flex flex-col items-center text-center py-2 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">Presensi Sukses!</h1>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-8">Digital Log Saved</p>

            <div className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl p-5 text-left flex flex-col gap-4 mb-8">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-0.5">Nama Personel</span>
                <span className="text-base font-bold text-gray-900 leading-tight block">{nota.nama}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100/70">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-0.5">Tipe Log</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold ${nota.jenis === 'Absen Pagi' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                    {nota.jenis}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-0.5">Waktu Sistem</span>
                  <span className="text-sm font-semibold text-gray-800">{nota.waktu}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100/70 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Status Waktu</span>
                <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase ${
                  nota.statusKehadiran === 'Tepat Waktu' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                  'bg-rose-50 text-rose-600 border border-rose-200'
                }`}>
                  {nota.statusKehadiran}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 font-medium animate-pulse">
              Redirecting to home screen...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}