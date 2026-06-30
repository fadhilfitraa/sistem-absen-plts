"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface Tugas {
  id: string;
  nama_tugas: string;
  deadline: string;
  keterangan_tugas: string;
}

export default function HalamanPengumpulanTugas() {
  const [isMounted, setIsMounted] = useState(false);
  const [daftarTugas, setDaftarTugas] = useState<Tugas[]>([]);
  const [daftarNama, setDaftarNama] = useState<string[]>([]);
  const [memuat, setMemuat] = useState(true);

  // State Layar
  const [tugasTerpilih, setTugasTerpilih] = useState<Tugas | null>(null);

  // State Form (Pengaman ?? "" ditambahkan di render untuk mencegah error React)
  const [namaPeserta, setNamaPeserta] = useState("");
  const [rekomendasi, setRekomendasi] = useState<string[]>([]);
  const [tampilkanSaran, setTampilkanSaran] = useState(false);
  
  // State Tipe Pengumpulan
  const [tipePengumpulan, setTipePengumpulan] = useState<'LINK' | 'FILE'>('LINK');
  const [linkTugas, setLinkTugas] = useState("");
  const [fileTugas, setFileTugas] = useState<File | null>(null);
  
  // State Status & Waktu Berjalan
  const [statusAksi, setStatusAksi] = useState("");
  const [waktuSekarang, setWaktuSekarang] = useState<Date>(new Date());
  const [sukses, setSukses] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    ambilData();
    const interval = setInterval(() => setWaktuSekarang(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const ambilData = async () => {
    setMemuat(true);
    const { data: tugas } = await supabase.from('master_tugas').select('*').order('deadline', { ascending: true });
    if (tugas) setDaftarTugas(tugas as Tugas[]);

    const { data: personel } = await supabase.from('master_personel').select('nama').eq('peran', 'PESERTA').order('nama', { ascending: true });
    
    let daftarEntitasDiizinkan: string[] = [];
    if (personel) {
      daftarEntitasDiizinkan = personel.map(p => p.nama);
    }
    
    daftarEntitasDiizinkan.push(
      "Kelompok Irradiance (I)", 
      "Kelompok Photovoltaic (PV)", 
      "Kelompok Watt-Peak (WP)"
    );

    setDaftarNama(daftarEntitasDiizinkan);
    setMemuat(false);
  };

  const handleKetikNama = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nilai = e.target.value || "";
    setNamaPeserta(nilai);

    if (nilai.trim() !== "") {
      const hasilFilter = daftarNama.filter((n) => n.toLowerCase().includes(nilai.toLowerCase()));
      setRekomendasi(hasilFilter);
      setTampilkanSaran(true);
    } else {
      setRekomendasi([]);
      setTampilkanSaran(false);
    }
  };

  const pilihNama = (nama: string) => {
    setNamaPeserta(nama);
    setTampilkanSaran(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        alert("Ukuran file terlalu besar! Maksimal 15MB untuk menjamin kelancaran unggah.");
        e.target.value = "";
        return;
      }
      setFileTugas(file);
    }
  };

  const kalkulasiSisaWaktu = (deadlineISO: string) => {
    const selisihMs = new Date(deadlineISO).getTime() - waktuSekarang.getTime();

    if (selisihMs < 0) {
      const sisaAbsolut = Math.abs(selisihMs);
      const hari = Math.floor(sisaAbsolut / (1000 * 60 * 60 * 24));
      const jam = Math.floor((sisaAbsolut % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return { teks: `Terlambat ${hari} Hari ${jam} Jam`, isTelat: true };
    } else {
      const hari = Math.floor(selisihMs / (1000 * 60 * 60 * 24));
      const jam = Math.floor((selisihMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const menit = Math.floor((selisihMs % (1000 * 60 * 60)) / (1000 * 60));
      const detik = Math.floor((selisihMs % (1000 * 60)) / 1000);
      return { 
        teks: hari > 0 ? `Sisa ${hari} Hari ${jam} Jam Lagi` : `Sisa ${jam}j ${menit}m ${detik}d Lagi`, 
        isTelat: false 
      };
    }
  };

  const kirimTugas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tugasTerpilih) return;
    
    // Validasi
    if (tipePengumpulan === 'LINK' && !linkTugas.trim()) return setStatusAksi("Harap masukkan tautan tugas!");
    if (tipePengumpulan === 'FILE' && !fileTugas) return setStatusAksi("Harap unggah file!");

    setStatusAksi("Memproses...");
    setMemuat(true);

    let finalLinkTautan = linkTugas;

    // ALUR UNGGAH FILE KE GOOGLE DRIVE DENGAN BYPASS CORS
  if (tipePengumpulan === 'FILE' && fileTugas) {
      try {
        const reader = new FileReader();
        finalLinkTautan = await new Promise((resolve, reject) => {
          reader.readAsDataURL(fileTugas);
          reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            try {
              // Kirim sebagai text/plain untuk bypass CORS
              const response = await fetch("https://script.google.com/macros/s/AKfycbyXACoGuSReInacIeFu0ljDX-XVMFyTlTKw5XCFu84Hadc1U0NVUpfl7tvbx4xsmlUIOA/exec", {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                  data: base64String,
                  mimetype: fileTugas.type,
                  filename: `${namaPeserta}_${fileTugas.name}`
                })
              });
              const result = await response.json();
              if (result.status === "success") resolve(result.url);
              else reject(new Error(result.message));
            } catch (err) { reject(err); }
          };
        });
      } catch (err: any) {
        setStatusAksi("Gagal upload ke Drive: " + err.message);
        setMemuat(false);
        return;
      }
    }

    setStatusAksi("Menyimpan riwayat ke sistem...");
    const isTerlambat = new Date().getTime() > new Date(tugasTerpilih.deadline).getTime();
    const statusPengumpulan = isTerlambat ? "Terlambat" : "Tepat Waktu";

    const { error } = await supabase.from('pengumpulan_tugas').insert([{
      tugas_id: tugasTerpilih.id,
      nama_peserta: namaPeserta,
      link_tautan: finalLinkTautan,
      status_waktu: new Date().getTime() > new Date(tugasTerpilih.deadline).getTime() ? "Terlambat" : "Tepat Waktu"
    }]);

    if (!error) setSukses(true);
    else setStatusAksi("Database error: " + error.message);
    setMemuat(false);
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen flex flex-col items-center pt-12 pb-24 px-4 sm:px-6 bg-[#FDFDFD] font-sans text-slate-900 selection:bg-blue-100">
      
      <div className="w-full max-w-lg z-10">
        
        {/* Header App (Elegan & Bersih) */}
        <div className="flex flex-col items-center mb-10">
          <img src="/logo-plts.png" alt="Logo PLTS" className="h-14 object-contain mb-5" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-center">Portal Penugasan</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">UPT PLTS ITERA</p>
        </div>

        {memuat && !sukses && !statusAksi ? (
          <div className="bg-white rounded-[2rem] p-10 flex justify-center border border-slate-100 shadow-xl">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : sukses ? (
          <div className="bg-white rounded-[2rem] p-10 text-center shadow-xl border border-slate-100 animate-fade-in">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Tugas Terkirim!</h2>
            <p className="text-sm text-slate-500 mb-8">Data pengumpulan tugas Anda telah tersimpan di sistem.</p>
            <button onClick={() => window.location.href = "/"} className="bg-slate-900 hover:bg-black text-white font-bold py-4 px-8 rounded-xl w-full transition-all shadow-md">Kembali ke Beranda</button>
          </div>
        ) : !tugasTerpilih ? (
          /* ================= LAYAR 1: PILIH TUGAS ================= */
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in">
            <div className="p-6 sm:p-8 border-b border-slate-50 bg-slate-50/50">
              <h2 className="text-lg font-extrabold text-slate-900">Daftar Tugas Aktif</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Pilih tugas yang ingin Anda kumpulkan.</p>
            </div>
            
            <div className="p-4 sm:p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              {daftarTugas.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">Belum ada tugas yang diterbitkan.</div>
              ) : (
                daftarTugas.map(tugas => {
                  const sisa = kalkulasiSisaWaktu(tugas.deadline);
                  return (
                    <div key={tugas.id} onClick={() => setTugasTerpilih(tugas)} className="group bg-white border border-slate-100 hover:border-blue-300 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{tugas.nama_tugas}</h3>
                        <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-md border ${sisa.isTelat ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {sisa.teks}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium truncate mt-1">Tenggat: {new Date(tugas.deadline).toLocaleString('id-ID')} WIB</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="p-5 bg-white border-t border-slate-100 text-center">
               <button onClick={() => window.location.href = "/"} className="text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors">← Kembali ke Beranda</button>
            </div>
          </div>
        ) : (
          /* ================= LAYAR 2: FORM PENGUMPULAN ================= */
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 w-full h-1.5 bg-blue-500"></div>
            
            <div className="p-6 sm:p-8">
              <button onClick={() => setTugasTerpilih(null)} className="text-xs font-bold text-slate-400 hover:text-slate-800 mb-6 flex items-center gap-1.5 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg> Kembali
              </button>

              <div className="mb-8">
                <h2 className="text-xl font-black text-slate-900 leading-tight mb-3">{tugasTerpilih.nama_tugas}</h2>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{tugasTerpilih.keterangan_tugas}</p>
                </div>
                
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sisa Waktu:</span>
                  <span className={`text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-md border ${kalkulasiSisaWaktu(tugasTerpilih.deadline).isTelat ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                    {kalkulasiSisaWaktu(tugasTerpilih.deadline).teks}
                  </span>
                </div>
              </div>

              <form onSubmit={kirimTugas} className="flex flex-col gap-6">
                
                {/* Autocomplete Nama */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Identitas (Peserta / Kelompok)</label>
                  <input 
                    type="text" 
                    value={namaPeserta ?? ""}
                    onChange={handleKetikNama}
                    onFocus={() => {
                      if (!namaPeserta) {
                        setRekomendasi(daftarNama);
                        setTampilkanSaran(true);
                      }
                    }}
                    placeholder="Ketik inisial kelompok atau nama Anda..." 
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-semibold text-sm transition-all placeholder:text-slate-400"
                    required
                  />
                  {tampilkanSaran && rekomendasi.length > 0 && (
                    <div className="absolute left-0 right-0 top-full bg-white border border-slate-100 rounded-xl shadow-xl mt-2 z-50 max-h-48 overflow-y-auto overflow-hidden">
                      {rekomendasi.map((namaSaran) => (
                        <div
                          key={namaSaran}
                          onClick={() => pilihNama(namaSaran)}
                          className={`p-4 hover:bg-slate-50 text-sm cursor-pointer border-b border-slate-50 last:border-none ${namaSaran.startsWith("Kelompok") ? 'font-black text-blue-700 bg-blue-50/30' : 'font-semibold text-slate-700'}`}
                        >
                          {namaSaran}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TOGGLE TIPE PENGUMPULAN */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bentuk Pengumpulan</label>
                  <div className="flex bg-slate-100 p-1.5 rounded-xl">
                    <button type="button" onClick={() => setTipePengumpulan('LINK')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${tipePengumpulan === 'LINK' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                      Tautan (Link)
                    </button>
                    <button type="button" onClick={() => setTipePengumpulan('FILE')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${tipePengumpulan === 'FILE' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                      Unggah (File)
                    </button>
                  </div>
                </div>

                {/* INPUT DINAMIS */}
                {tipePengumpulan === 'LINK' ? (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">URL Tautan Tugas</label>
                    <input 
                      type="url" 
                      value={linkTugas ?? ""}
                      onChange={(e) => setLinkTugas(e.target.value || "")}
                      placeholder="https://docs.google.com/..." 
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-semibold text-sm transition-all placeholder:text-slate-400"
                      required={tipePengumpulan === 'LINK'}
                    />
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wide">* Pastikan akses tautan diatur ke Publik.</p>
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih File Berkas</label>
                    <input 
                      type="file" 
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
                      className="w-full bg-slate-50 border border-dashed border-slate-300 p-4 rounded-xl focus:outline-none text-slate-600 font-medium text-sm transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                      required={tipePengumpulan === 'FILE'}
                    />
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wide">* Mendukung PDF, PPT, ZIP. (Maks 15MB).</p>
                  </div>
                )}

                {statusAksi && (
                  <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm font-bold text-center border border-blue-100 animate-pulse">{statusAksi}</div>
                )}

                <button type="submit" disabled={memuat} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-4 disabled:bg-slate-300 disabled:shadow-none">
                  {memuat ? 'Menyimpan Tugas...' : 'Kumpulkan Tugas'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}