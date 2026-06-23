"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface Absensi {
  id: string;
  nama_peserta: string;
  waktu_absen: string;
  jenis_absen: string;
  peran: string;
  latitude: number;
  longitude: number;
  foto_url: string;
}

export default function RekapitulasiAdmin() {
  const [isAksesDiberikan, setIsAksesDiberikan] = useState<boolean>(false);
  const [kataSandi, setKataSandi] = useState<string>("");

  const [dataAbsensi, setDataAbsensi] = useState<Absensi[]>([]);
  const [memuat, setMemuat] = useState<boolean>(true);
  const [namaTerpilih, setNamaTerpilih] = useState<string | null>(null);
  
  const [tabAktif, setTabAktif] = useState<'PESERTA' | 'ASISTEN'>('PESERTA');

  useEffect(() => {
    if (isAksesDiberikan) ambilData();
  }, [isAksesDiberikan]);

  const ambilData = async () => {
    setMemuat(true);
    const { data, error } = await supabase.from('absensi').select('*').order('waktu_absen', { ascending: false });
    if (!error && data) setDataAbsensi(data as Absensi[]);
    else setDataAbsensi([]);
    setMemuat(false);
  };

  const periksaSandi = (e: React.FormEvent) => {
    e.preventDefault();
    if (kataSandi === "afiqganteng") setIsAksesDiberikan(true);
    else { alert("Kata sandi salah! Akses ditolak."); setKataSandi(""); }
  };

  const hapusData = async (id: string) => {
    const konfirmasi = window.confirm("Hapus rekam jejak presensi ini?");
    if (!konfirmasi) return;
    setMemuat(true);
    const { error } = await supabase.from('absensi').delete().eq('id', id);
    if (!error) ambilData(); 
    else alert(`Gagal menghapus data: ${error.message}`);
    setMemuat(false);
  };

  // TAMPILAN 1: HALAMAN LOGIN (Tetap menggunakan efek kaca Premium)
  if (!isAksesDiberikan) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 font-sans text-slate-900 selection:bg-blue-100">
        <div className="absolute inset-0 bg-[url('/bg-plts.jpg')] bg-cover bg-center bg-no-repeat bg-fixed z-0"></div>
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-0"></div>

        <div className="relative z-10 bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-white/20 w-full max-w-sm overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          
          <div className="flex flex-col items-center mb-8 pt-2">
            <img src="/logo-plts.png" alt="Logo PLTS" className="h-14 object-contain mb-5" />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Rekapitulasi Absensi</h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Authorized Access Only</p>
          </div>

          <form onSubmit={periksaSandi} className="flex flex-col gap-5">
            <input 
              type="password" 
              placeholder="Masukkan Kata Sandi..." 
              value={kataSandi} 
              onChange={(e) => setKataSandi(e.target.value)} 
              className="w-full bg-slate-50/50 border border-slate-200 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder-slate-400 text-center tracking-widest transition-all" 
              required 
            />
            <button type="submit" className="w-full bg-slate-900 hover:bg-black transition-all text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5">
              Buka Akses
            </button>
          </form>
        </div>
      </div>
    );
  }

  const dataSesuaiTab = dataAbsensi.filter(d => (d.peran || 'PESERTA') === tabAktif);
  const dataDikelompokkan = dataSesuaiTab.reduce((hasil, baris) => {
    const nama = baris.nama_peserta;
    if (!hasil[nama]) hasil[nama] = [];
    hasil[nama].push(baris);
    return hasil;
  }, {} as Record<string, Absensi[]>);

  const daftarNama = Object.keys(dataDikelompokkan).sort();
  const detailData = namaTerpilih ? (dataDikelompokkan[namaTerpilih] || []) : [];
  if (namaTerpilih !== null && detailData.length === 0) setNamaTerpilih(null);

  const rekapPerHari = detailData.reduce((hasil, baris) => {
    const tanggal = new Date(baris.waktu_absen).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!hasil[tanggal]) hasil[tanggal] = [];
    hasil[tanggal].push(baris);
    return hasil;
  }, {} as Record<string, Absensi[]>);

  // TAMPILAN 2 & 3: DASBOR UTAMA YANG ELEGAN
  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-900 selection:bg-blue-100 pb-16">
      
      {/* Navbar Minimalis */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-plts.png" alt="Logo" className="h-10 object-contain drop-shadow-sm" />
            <div className="hidden md:block w-px h-8 bg-slate-200 mx-1"></div>
            <div>
              <h1 className="font-bold text-slate-900 tracking-tight hidden md:block leading-none">Rekapitulasi Presensi</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold hidden md:block mt-1">UPT PLTS ITERA</p>
            </div>
          </div>
          <button onClick={ambilData} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50 px-5 py-2.5 rounded-full transition-all shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            <span className="hidden sm:block">Refresh</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-10">
        
        {/* === TAMPILAN DAFTAR NAMA === */}
        {namaTerpilih === null ? (
          <div className="animate-fade-in">
            
            {/* Pill Tabs (Pengganti tombol abu-abu kaku) */}
            <div className="inline-flex bg-slate-100/80 p-1.5 rounded-2xl mb-10 border border-slate-200/50">
              <button 
                onClick={() => setTabAktif('PESERTA')} 
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${tabAktif === 'PESERTA' ? 'bg-white text-blue-600 shadow-[0_2px_10px_rgb(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path></svg>
                Data Peserta Kerja Praktik
              </button>
              <button 
                onClick={() => setTabAktif('ASISTEN')} 
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${tabAktif === 'ASISTEN' ? 'bg-white text-amber-600 shadow-[0_2px_10px_rgb(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                Data Asisten PLTS
              </button>
            </div>

            {memuat ? (
              <div className="flex justify-center items-center h-40"><p className="text-slate-400 font-medium animate-pulse">Synchronizing data...</p></div>
            ) : daftarNama.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">No Data Available</h3>
                <p className="text-slate-500 text-sm mt-1">Belum ada aktivitas presensi yang tercatat untuk kategori ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {daftarNama.map((nama) => (
                  <div 
                    key={nama} 
                    onClick={() => setNamaTerpilih(nama)} 
                    className="bg-white p-7 rounded-[1.5rem] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgb(0,0,0,0.06)] hover:border-slate-200 hover:-translate-y-1 cursor-pointer transition-all duration-300 group flex flex-col justify-between h-full relative overflow-hidden"
                  >
                    {/* Efek gradasi super tipis di sudut */}
                    <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${tabAktif === 'PESERTA' ? 'bg-blue-400' : 'bg-amber-400'}`}></div>
                    
                    <div className="relative z-10">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-white ${tabAktif === 'PESERTA' ? 'bg-blue-50/80 text-blue-600' : 'bg-amber-50/80 text-amber-600'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mb-1 leading-tight">{nama}</h2>
                    </div>
                    <div className="mt-6 flex items-center justify-between relative z-10">
                      <p className="text-xs text-slate-500 font-medium">Memiliki <span className={`font-bold text-sm ${tabAktif === 'PESERTA' ? 'text-blue-600' : 'text-amber-600'}`}>{dataDikelompokkan[nama].length}</span> rekam jejak</p>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white text-slate-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          
          /* === TAMPILAN DETAIL PER ORANG === */
          <div className="animate-fade-in max-w-5xl mx-auto">
            
            {/* Header Profil */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
              <div className="flex flex-col items-start gap-4">
                <button onClick={() => setNamaTerpilih(null)} className="text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                  Daftar Personel
                </button>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${tabAktif === 'PESERTA' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{namaTerpilih}</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Rekam Jejak Presensi &bull; {tabAktif}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Daftar Tabel per Tanggal (Tanpa kotak abu-abu yang mengganggu) */}
            <div className="flex flex-col gap-10">
              {Object.keys(rekapPerHari).map((tanggal) => (
                <div key={tanggal} className="flex flex-col">
                  
                  {/* Pemisah Tanggal yang Bersih */}
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{tanggal}</h2>
                    <div className="flex-1 h-px bg-slate-100"></div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{rekapPerHari[tanggal].length} Entri</span>
                  </div>
                  
                  {/* Tabel Elegan (Garis halus, latar putih bersih) */}
                  <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-xs text-slate-500 uppercase tracking-wider font-bold">
                          <tr>
                            <th className="px-6 py-4 border-b border-slate-100">Waktu Tercatat</th>
                            <th className="px-6 py-4 border-b border-slate-100 text-center">Status</th>
                            <th className="px-6 py-4 border-b border-slate-100 text-center">Titik Lokasi</th>
                            <th className="px-6 py-4 border-b border-slate-100 text-center">Visual</th>
                            <th className="px-6 py-4 border-b border-slate-100 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {rekapPerHari[tanggal].map((row) => {
                            const waktu = new Date(row.waktu_absen);
                            return (
                              <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-3 text-slate-700 font-semibold">
                                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    {waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-extrabold ${row.jenis_absen === 'MASUK' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${row.jenis_absen === 'MASUK' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                    {row.jenis_absen}
                                  </span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${row.latitude},${row.longitude}`} target="_blank" className="inline-flex items-center justify-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold text-xs transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    Lihat Peta
                                  </a>
                                </td>
                                <td className="px-6 py-5 flex justify-center">
                                  <a href={row.foto_url} target="_blank" className="relative inline-block">
                                    <img src={row.foto_url} className="w-10 h-10 object-cover rounded-xl shadow-sm border border-slate-200 group-hover:border-blue-400 group-hover:scale-110 transition-all duration-300" />
                                  </a>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <button onClick={() => hapusData(row.id)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all" title="Hapus Data">
                                    <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}