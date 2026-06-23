"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { supabase } from "../../lib/supabase";

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
  "Alvin Saputra"
];

export default function Absensi() {
  const [jalur, setJalur] = useState<string>("peserta");
  const [nama, setNama] = useState<string>("");
  const [langkah, setLangkah] = useState<number>(1);
  const [lokasi, setLokasi] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<string>("");
  const webcamRef = useRef<any>(null);

  const [rekomendasi, setRekomendasi] = useState<string[]>([]);
  const [tampilkanSaran, setTampilkanSaran] = useState<boolean>(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const j = searchParams.get('jalur');
    if (j === 'asisten') setJalur('asisten');
  }, []);

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

  const lanjutKeKamera = () => {
    if (!nama) return setStatus("Mohon isi nama terlebih dahulu.");
    if (!daftarNamaAktif.includes(nama)) return setStatus(`Nama tidak terdaftar di sistem ${jalur === 'asisten' ? 'Asisten' : 'KP'}.`);

    setStatus("Location access requested...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLokasi({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLangkah(2);
        setStatus("");
      },
      (err) => setStatus(`GPS Failed: ${err.message}`)
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

      const { error: dbError } = await supabase.from('absensi').insert([{
        nama_peserta: nama,
        jenis_absen: jenis,
        peran: jalur.toUpperCase(),
        latitude: lokasi?.lat,
        longitude: lokasi?.lng,
        foto_url: finalFotoUrl
      }]);

      if (dbError) return setStatus(`Failed to save data: ${dbError.message}`);

      setStatus(`Successfully checked in for ${jenis} at ${new Date().toLocaleTimeString('id-ID')}`);

      setTimeout(() => { 
        setLangkah(1); setNama(""); setStatus(""); window.location.href = "/"; 
      }, 2000);

    } catch (error) {
      setStatus("An error occurred. Please try again.");
    }
  }, [nama, lokasi, jalur]);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 font-sans text-black selection:bg-blue-100 overflow-hidden">
      
      {/* Latar Belakang & Overlay Gelap */}
      <div className="absolute inset-0 bg-[url('/bg-plts.jpg')] bg-cover bg-center bg-no-repeat bg-fixed z-0"></div>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-0"></div>

      {/* PERBAIKAN MUTLAK DI SINI:
        Membuang elemen div terpisah dan menggunakan border-t-[6px] 
        dengan warna dinamis sesuai jalur langsung pada kartu utama.
      */}
      <div className={`relative z-10 bg-white p-6 sm:p-8 rounded-[2rem] shadow-2xl w-full max-w-md mx-auto border border-gray-100 border-t-[6px] ${jalur === 'asisten' ? 'border-t-amber-400' : 'border-t-blue-600'}`}>
        
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
                placeholder="Nama Lengkap Anda..." 
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
            <div className="w-full rounded-2xl overflow-hidden shadow-inner border border-gray-100 bg-gray-50 aspect-[3/4] sm:aspect-auto flex items-center justify-center bg-black">
              <Webcam 
                ref={webcamRef} 
                screenshotFormat="image/jpeg" 
                videoConstraints={{ facingMode: "user" }} 
                className="w-full h-full object-cover" 
              />
            </div>
            <p className="text-[10px] sm:text-[11px] font-mono text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg w-full text-center truncate">
              Koordinat: {lokasi?.lat}, {lokasi?.lng}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full mt-1 sm:mt-2">
              <button onClick={() => kirimData('MASUK')} className="flex-1 bg-gray-900 hover:bg-black transition-all text-white py-3.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base shadow-sm hover:shadow-md">
                Check In
              </button>
              <button onClick={() => kirimData('PULANG')} className="flex-1 bg-white border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all text-gray-900 py-3.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base">
                Check Out
              </button>
            </div>
            <button onClick={() => setLangkah(1)} className="text-xs sm:text-sm font-medium text-gray-400 hover:text-gray-600 mt-2 transition-colors">
              Cancel
            </button>
          </div>
        )}

        {status && (
          <div className="mt-5 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs sm:text-sm text-gray-700 font-medium text-center">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}