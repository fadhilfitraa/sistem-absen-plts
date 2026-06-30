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

  // State Form
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
        alert("File is too large! Maximum allowed size is 15MB.");
        e.target.value = "";
        return;
      }
      setFileTugas(file);
    }
  };

  const formatWaktuDeadline = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    }) + ' WIB';
  };

  const kalkulasiSisaWaktu = (deadlineISO: string) => {
    const selisihMs = new Date(deadlineISO).getTime() - waktuSekarang.getTime();

    if (selisihMs < 0) {
      const sisaAbsolut = Math.abs(selisihMs);
      const hari = Math.floor(sisaAbsolut / (1000 * 60 * 60 * 24));
      const jam = Math.floor((sisaAbsolut % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const menit = Math.floor((sisaAbsolut % (1000 * 60 * 60)) / (1000 * 60));
      return { teks: `Overdue by ${hari}d ${jam}h ${menit}m`, isTelat: true };
    } else {
      const hari = Math.floor(selisihMs / (1000 * 60 * 60 * 24));
      const jam = Math.floor((selisihMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const menit = Math.floor((selisihMs % (1000 * 60 * 60)) / (1000 * 60));
      const detik = Math.floor((selisihMs % (1000 * 60)) / 1000);
      return { 
        teks: hari > 0 ? `${hari}d ${jam}h Remaining` : `${jam}h ${menit}m ${detik}s Remaining`, 
        isTelat: false 
      };
    }
  };

  const kirimTugas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tugasTerpilih) return;
    
    // Validasi Bahasa Inggris
    if (tipePengumpulan === 'LINK' && !linkTugas.trim()) return setStatusAksi("Please provide a valid URL!");
    if (tipePengumpulan === 'FILE' && !fileTugas) return setStatusAksi("Please select a file to upload!");
    if (!daftarNama.includes(namaPeserta)) return setStatusAksi("Unregistered identity! Please select from the suggestions.");

    setStatusAksi("Processing submission...");
    setMemuat(true);

    let finalLinkTautan = linkTugas;

    if (tipePengumpulan === 'FILE' && fileTugas) {
      setStatusAksi("Uploading file (Please wait)...");
      try {
        const reader = new FileReader();
        finalLinkTautan = await new Promise((resolve, reject) => {
          reader.readAsDataURL(fileTugas);
          reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            try {
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
        setStatusAksi("Drive Upload Failed: " + err.message);
        setMemuat(false);
        return;
      }
    }

    setStatusAksi("Saving record to database...");
    const isTerlambat = new Date().getTime() > new Date(tugasTerpilih.deadline).getTime();
    
    // Status disimpan dalam bahasa Inggris (Pastikan Admin Panel disesuaikan jika perlu filter)
    const statusPengumpulan = isTerlambat ? "Overdue" : "On-Time";

    const { error } = await supabase.from('pengumpulan_tugas').insert([{
      tugas_id: tugasTerpilih.id,
      nama_peserta: namaPeserta,
      link_tautan: finalLinkTautan,
      status_waktu: statusPengumpulan
    }]);

    if (!error) setSukses(true);
    else setStatusAksi("Database Error: " + error.message);
    setMemuat(false);
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-purple-200">
      
      {/* Background Identik Landing Page */}
      <div className="absolute inset-0 bg-[url('/bg-plts.jpg')] bg-cover bg-center bg-no-repeat bg-fixed z-0"></div>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-0"></div>

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
        
        {/* Header App */}
        <div className="flex flex-col items-center mb-8 animate-fade-in text-center px-4">
          <img src="/logo-plts.png" alt="Logo PLTS" className="h-16 sm:h-20 object-contain mb-4 drop-shadow-lg" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight">Portal Pengumpulan Tugas</h1>
          <p className="mt-2 text-purple-200 font-medium tracking-widest uppercase text-[10px] sm:text-xs drop-shadow-md">UPT PLTS ITERA</p>
        </div>

        {memuat && !sukses && !statusAksi ? (
          <div className="bg-white/95 backdrop-blur-md rounded-[2rem] p-10 flex justify-center border border-white/20 shadow-xl w-full">
            <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
          </div>
        ) : sukses ? (
          <div className="bg-white/95 backdrop-blur-md rounded-[2rem] p-10 text-center shadow-xl border border-white/20 animate-fade-in w-full">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Submission Successful!</h2>
            <p className="text-sm text-slate-600 mb-8">Your work has been securely saved to the system.</p>
            <button onClick={() => window.location.href = "/"} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl w-full transition-all shadow-md">Return to Dashboard</button>
          </div>
        ) : !tugasTerpilih ? (
          /* ================= LAYAR 1: PILIH TUGAS ================= */
          <div className="bg-white/95 backdrop-blur-md rounded-[2rem] shadow-xl border border-white/20 overflow-hidden animate-fade-in w-full">
            <div className="p-6 sm:p-8 border-b border-purple-100 bg-white/50">
              <h2 className="text-xl font-extrabold text-slate-900">Active Assignments</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Select an assignment to submit your work.</p>
            </div>
            
            <div className="p-4 sm:p-6 flex flex-col gap-4 max-h-[55vh] overflow-y-auto">
              {daftarTugas.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-medium bg-white/50 rounded-xl border border-dashed border-purple-200">No active assignments published by Admin.</div>
              ) : (
                daftarTugas.map(tugas => {
                  const sisa = kalkulasiSisaWaktu(tugas.deadline);
                  return (
                    <div key={tugas.id} onClick={() => setTugasTerpilih(tugas)} className="group bg-white border border-purple-100 hover:border-purple-400 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-lg shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors text-base">{tugas.nama_tugas}</h3>
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-600 transition-colors shrink-0">
                          <svg className="w-4 h-4 text-purple-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 w-fit">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                          <span className="text-xs font-bold text-slate-700">{formatWaktuDeadline(tugas.deadline)}</span>
                        </div>
                        <div className="flex items-center">
                          <span className={`text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1.5 rounded-md border ${sisa.isTelat ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                            {sisa.teks}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="p-5 bg-white/80 border-t border-purple-100 text-center backdrop-blur-sm">
               <button onClick={() => window.location.href = "/"} className="text-sm font-bold text-slate-500 hover:text-purple-700 transition-colors">← Back to Home</button>
            </div>
          </div>
        ) : (
          /* ================= LAYAR 2: FORM PENGUMPULAN ================= */
          <div className="bg-white/95 backdrop-blur-md rounded-[2rem] shadow-xl border border-white/20 animate-fade-in relative overflow-hidden w-full">
            <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-purple-700"></div>
            
            <div className="p-6 sm:p-8">
              <button onClick={() => setTugasTerpilih(null)} className="text-xs font-bold text-slate-500 hover:text-purple-700 mb-6 flex items-center gap-1.5 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg> Back to Assignments
              </button>

              <div className="mb-8 border-b border-slate-100 pb-6">
                <h2 className="text-2xl font-black text-slate-900 leading-tight mb-4">{tugasTerpilih.nama_tugas}</h2>
                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 mb-4">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{tugasTerpilih.keterangan_tugas}</p>
                </div>
                
                {/* HIGHLIGHT DEADLINE & STATUS */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target:</span>
                    <span className="text-xs font-extrabold text-slate-800">{formatWaktuDeadline(tugasTerpilih.deadline)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold tracking-wider uppercase px-3 py-2 rounded-lg border ${kalkulasiSisaWaktu(tugasTerpilih.deadline).isTelat ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {kalkulasiSisaWaktu(tugasTerpilih.deadline).teks}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={kirimTugas} className="flex flex-col gap-6">
                
                {/* Autocomplete Nama */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Participant Identity</label>
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
                    placeholder="Type your name or group initials..." 
                    className="w-full bg-white border border-slate-300 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-slate-900 font-semibold text-sm transition-all shadow-sm placeholder:text-slate-400"
                    required
                  />
                  {tampilkanSaran && rekomendasi.length > 0 && (
                    <div className="absolute left-0 right-0 top-full bg-white border border-slate-100 rounded-xl shadow-2xl mt-2 z-50 max-h-48 overflow-y-auto overflow-hidden">
                      {rekomendasi.map((namaSaran) => (
                        <div
                          key={namaSaran}
                          onClick={() => pilihNama(namaSaran)}
                          className={`p-4 hover:bg-purple-50 text-sm cursor-pointer border-b border-slate-50 last:border-none ${namaSaran.startsWith("Kelompok") ? 'font-black text-purple-700 bg-purple-50/40' : 'font-semibold text-slate-700'}`}
                        >
                          {namaSaran}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TOGGLE TIPE PENGUMPULAN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Submission Format</label>
                  <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                    <button type="button" onClick={() => setTipePengumpulan('LINK')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${tipePengumpulan === 'LINK' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
                      URL Link
                    </button>
                    <button type="button" onClick={() => setTipePengumpulan('FILE')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${tipePengumpulan === 'FILE' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
                      File Upload
                    </button>
                  </div>
                </div>

                {/* INPUT DINAMIS */}
                {tipePengumpulan === 'LINK' ? (
                  <div className="animate-fade-in">
                    <input 
                      type="url" 
                      value={linkTugas ?? ""}
                      onChange={(e) => setLinkTugas(e.target.value || "")}
                      placeholder="https://docs.google.com/..." 
                      className="w-full bg-white border border-slate-300 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-slate-900 font-semibold text-sm transition-all shadow-sm placeholder:text-slate-400"
                      required={tipePengumpulan === 'LINK'}
                    />
                    <p className="text-[10px] text-purple-600 mt-2 font-bold uppercase tracking-wide flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Ensure the link is set to Public access.
                    </p>
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <div className="relative border-2 border-dashed border-purple-300 rounded-xl p-6 bg-purple-50/40 hover:bg-purple-100/50 transition-colors text-center group cursor-pointer">
                      <input 
                        type="file" 
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        required={tipePengumpulan === 'FILE'}
                      />
                      <div className="flex flex-col items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md mb-3 text-purple-600 group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        </div>
                        <p className="text-sm font-extrabold text-purple-900 mb-1">
                          {fileTugas ? fileTugas.name : "Click or drag your file here"}
                        </p>
                        <p className="text-[10px] text-purple-600 font-bold uppercase tracking-widest">Max 15MB (PDF, PPT, DOC, ZIP)</p>
                      </div>
                    </div>
                  </div>
                )}

                {statusAksi && (
                  <div className="bg-purple-100 text-purple-800 p-4 rounded-xl text-sm font-bold text-center border border-purple-200 animate-pulse shadow-inner">{statusAksi}</div>
                )}

                <button type="submit" disabled={memuat} className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black tracking-widest py-4 rounded-xl shadow-lg shadow-purple-500/30 transition-all mt-2 disabled:bg-slate-300 disabled:shadow-none hover:-translate-y-1">
                  {memuat ? 'PROCESSING...' : 'SUBMIT ASSIGNMENT'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
      
      <div className="relative z-10 mt-10 text-purple-200 text-[10px] sm:text-xs font-medium drop-shadow-md text-center">
        &copy; {new Date().getFullYear()} PLTS Laboratory - Institut Teknologi Sumatera
      </div>
    </div>
  );
}