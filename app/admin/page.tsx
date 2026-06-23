"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// Aturan Batas Waktu untuk Kalkulasi Dasbor
const BATAS_PAGI = { jam: 8, menit: 40 };
const BATAS_SIANG = { jam: 13, menit: 35 };

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

  // State Ekstensi untuk Fitur Edit & Live Interaction
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>("");
  const [editNama, setEditNama] = useState<string>("");
  const [editJenis, setEditJenis] = useState<string>("");
  const [editTime, setEditTime] = useState<string>(""); 
  const [editStatus, setEditStatus] = useState<string>("");
  const [editWaktuAsli, setEditWaktuAsli] = useState<string>("");

  // STATE BARU: Lightbox untuk memperbesar foto
  const [fotoLightbox, setFotoLightbox] = useState<string | null>(null);

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
    else { alert("Access Denied: Invalid Administrative Password!"); setKataSandi(""); }
  };

  const hapusData = async (id: string) => {
    const konfirmasi = window.confirm("Are you sure you want to permanently delete this presence log?");
    if (!konfirmasi) return;
    setMemuat(true);
    const { error } = await supabase.from('absensi').delete().eq('id', id);
    if (!error) ambilData(); 
    else alert(`Action Failed: ${error.message}`);
    setMemuat(false);
  };

  const handleTimeChange = (newTime: string) => {
    setEditTime(newTime);
    const [jam, menit] = newTime.split(':').map(Number);
    let kalkulasiStatus = "Tepat Waktu";
    
    if (editJenis === "MASUK") {
      if (jam > BATAS_PAGI.jam || (jam === BATAS_PAGI.jam && menit > BATAS_PAGI.menit)) kalkulasiStatus = "Terlambat";
    } else if (editJenis === "SIANG") {
      if (jam > BATAS_SIANG.jam || (jam === BATAS_SIANG.jam && menit > BATAS_SIANG.menit)) kalkulasiStatus = "Terlambat";
    }
    setEditStatus(kalkulasiStatus);
  };

  const handleStatusChange = (newStatus: string) => {
    setEditStatus(newStatus);
    if (newStatus === "Terlambat") {
      setEditTime(editJenis === "MASUK" ? "08:45" : "13:40");
    } else if (newStatus === "Tepat Waktu") {
      setEditTime(editJenis === "MASUK" ? "08:00" : "13:00");
    }
  };

  const handleJenisChange = (newJenis: string) => {
    setEditJenis(newJenis);
    setEditTime(newJenis === "MASUK" ? "08:00" : "13:00");
    setEditStatus("Tepat Waktu");
  };

  const simpanPerubahanEdit = async () => {
    if (!editNama.trim()) return alert("Personnel name cannot be empty!");
    setMemuat(true);
    
    const objekTanggal = new Date(editWaktuAsli);
    const [jam, menit] = editTime.split(':').map(Number);
    objekTanggal.setHours(jam);
    objekTanggal.setMinutes(menit);
    objekTanggal.setSeconds(0);
    
    const waktuAbsenBaruISO = objekTanggal.toISOString();

    const { error } = await supabase
      .from('absensi')
      .update({ 
        nama_peserta: editNama, 
        jenis_absen: editJenis,
        waktu_absen: waktuAbsenBaruISO
      })
      .eq('id', editId);

    if (!error) {
      setIsEditing(false);
      await ambilData();
    } else {
      alert(`Database Error: ${error.message}`);
    }
    setMemuat(false);
  };

  const eksporKeCSV = () => {
    const dataSesuaiTab = dataAbsensi.filter(d => (d.peran || 'PESERTA') === tabAktif);
    if (dataSesuaiTab.length === 0) return alert("No ledger data available for extraction!");

    const header = ["ID", "Personnel Name", "System Role", "Log Classification", "Timestamp", "Time Compliance", "Latitude", "Longitude", "Verification Image URL"];
    const baris = dataSesuaiTab.map(d => [
      d.id,
      d.nama_peserta,
      d.peran,
      d.jenis_absen === "MASUK" ? "Morning Check-In" : "Afternoon Check-In",
      new Date(d.waktu_absen).toLocaleString('id-ID'),
      kalkulasiStatusWaktu(d.waktu_absen, d.jenis_absen),
      d.latitude,
      d.longitude,
      d.foto_url
    ]);

    const csvContent = [header.join(","), ...baris.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Ledger_Report_${tabAktif}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const bukaModalEdit = (row: Absensi) => {
    const waktu = new Date(row.waktu_absen);
    const jamStr = String(waktu.getHours()).padStart(2, '0');
    const menitStr = String(waktu.getMinutes()).padStart(2, '0');
    
    setEditId(row.id);
    setEditNama(row.nama_peserta);
    setEditJenis(row.jenis_absen);
    setEditTime(`${jamStr}:${menitStr}`);
    setEditWaktuAsli(row.waktu_absen);
    setEditStatus(kalkulasiStatusWaktu(row.waktu_absen, row.jenis_absen));
    setIsEditing(true);
  };

  const kalkulasiStatusWaktu = (waktuISO: string, jenis: string) => {
    const waktu = new Date(waktuISO);
    const jam = waktu.getHours();
    const menit = waktu.getMinutes();
    
    if (jenis === "MASUK") {
      if (jam > BATAS_PAGI.jam || (jam === BATAS_PAGI.jam && menit > BATAS_PAGI.menit)) return "Terlambat";
      return "Tepat Waktu";
    } else if (jenis === "SIANG") {
      if (jam > BATAS_SIANG.jam || (jam === BATAS_SIANG.jam && menit > BATAS_SIANG.menit)) return "Terlambat";
      return "Tepat Waktu";
    }
    return "-";
  };

  if (!isAksesDiberikan) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 font-sans text-slate-900 selection:bg-blue-100">
        <div className="absolute inset-0 bg-[url('/bg-plts.jpg')] bg-cover bg-center bg-no-repeat bg-fixed z-0"></div>
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-0"></div>

        <div className="relative z-10 bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-white/20 w-full max-w-sm">
          <div className="flex flex-col items-center mb-8 pt-2">
            <img src="/logo-plts.png" alt="Logo" className="h-14 object-contain mb-5" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Administrative Console</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Secure Authentication Required</p>
          </div>
          <form onSubmit={periksaSandi} className="flex flex-col gap-5">
            <input type="password" placeholder="Enter Administrative Password..." value={kataSandi} onChange={(e) => setKataSandi(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder-slate-400 text-center tracking-widest transition-all" required />
            <button type="submit" className="w-full bg-slate-900 hover:bg-black transition-all text-white py-4 rounded-xl font-bold shadow-lg">Grant Authorization</button>
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

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-900 selection:bg-blue-100 pb-16 relative">
      
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-plts.png" alt="Logo" className="h-10 object-contain" />
            <div className="hidden md:block w-px h-8 bg-slate-200 mx-1"></div>
            <div>
              <h1 className="font-bold text-slate-900 tracking-tight leading-none">Attendance Ledger Dashboard</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-1">UPT PLTS ITERA Control Panel</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={eksporKeCSV} className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-5 py-2.5 rounded-full transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span className="hidden sm:block">Export Ledger (CSV)</span>
            </button>
            <button onClick={ambilData} className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-5 py-2.5 rounded-full transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              <span className="hidden sm:block">Synchronize Data</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-10">
        {namaTerpilih === null ? (
          <div className="animate-fade-in">
            <div className="inline-flex bg-slate-100/80 p-1.5 rounded-2xl mb-10 border border-slate-200/50">
              <button onClick={() => setTabAktif('PESERTA')} className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${tabAktif === 'PESERTA' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Intern Presence Logs (Peserta KP)</button>
              <button onClick={() => setTabAktif('ASISTEN')} className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${tabAktif === 'ASISTEN' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}>Staff Presence Logs (Asisten PLTS)</button>
            </div>

            {memuat ? (
              <div className="flex justify-center items-center h-40"><p className="text-slate-400 font-medium animate-pulse">Synchronizing database infrastructure...</p></div>
            ) : daftarNama.length === 0 ? (
              <div className="text-center py-20 text-slate-400">Registry is empty. No presence records detected.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {daftarNama.map((nama) => (
                  <div key={nama} onClick={() => setNamaTerpilih(nama)} className="bg-white p-7 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all flex flex-col justify-between h-full">
                    <div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border ${tabAktif === 'PESERTA' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 leading-tight">{nama}</h2>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-6">Contains <span className="font-bold">{dataDikelompokkan[nama].length}</span> historical logs</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-in max-w-6xl mx-auto">
            <div className="mb-10 flex items-end gap-4 border-b border-slate-100 pb-8">
              <button onClick={() => setNamaTerpilih(null)} className="text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back to Registry
              </button>
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 mb-8">{namaTerpilih}</h1>

            <div className="flex flex-col gap-10">
              {Object.keys(rekapPerHari).map((tanggal) => (
                <div key={tanggal} className="flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{tanggal}</h2>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                  
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50/50 text-xs text-slate-500 uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Logged Time</th>
                          <th className="px-6 py-4 text-center">Log Classification</th>
                          <th className="px-6 py-4 text-center">Time Compliance</th>
                          <th className="px-6 py-4 text-center">Geolocational Map</th>
                          <th className="px-6 py-4 text-center">Visual Verification</th>
                          <th className="px-6 py-4 text-center">Management Control</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rekapPerHari[tanggal].map((row) => {
                          const waktu = new Date(row.waktu_absen);
                          const statusKehadiran = kalkulasiStatusWaktu(row.waktu_absen, row.jenis_absen);
                          
                          return (
                            <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-5 font-semibold text-slate-700">
                                {waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                              </td>
                              <td className="px-6 py-5 text-center">
                                <span className={`inline-block px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider ${row.jenis_absen === 'MASUK' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {row.jenis_absen === 'MASUK' ? 'Morning Shift' : 'Afternoon Shift'}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase ${statusKehadiran === 'Tepat Waktu' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {statusKehadiran === 'Tepat Waktu' ? 'On Time' : 'Late'}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <a href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`} target="_blank" className="text-blue-600 font-bold text-xs bg-blue-50 px-2.5 py-1.5 rounded-lg">View Map</a>
                              </td>
                              {/* PEMBARUAN: Tombol Pemicu Lightbox Foto */}
                              <td className="px-6 py-5 flex justify-center">
                                <img 
                                  src={row.foto_url} 
                                  alt="Foto Absen"
                                  className="w-10 h-10 object-cover rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:scale-110 hover:border-blue-400 transition-all duration-300" 
                                  onClick={() => setFotoLightbox(row.foto_url)}
                                  title="Klik untuk memperbesar"
                                />
                              </td>
                              <td className="px-6 py-5 text-center">
                                <div className="flex justify-center gap-2">
                                  <button onClick={() => bukaModalEdit(row)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all" title="Modify Record">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                  </button>
                                  <button onClick={() => hapusData(row.id)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all" title="Purge Record">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FITUR BARU: MODAL LIGHTBOX FOTO */}
      {fotoLightbox && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" 
          onClick={() => setFotoLightbox(null)}
        >
          <div className="relative max-w-3xl w-full flex justify-center items-center">
            <img 
              src={fotoLightbox} 
              alt="Foto Diperbesar"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/20" 
              onClick={(e) => e.stopPropagation()} 
            />
            <button 
              className="absolute -top-4 -right-4 bg-slate-900 text-white w-10 h-10 rounded-full font-bold shadow-lg hover:bg-black border border-slate-700 transition-all flex items-center justify-center"
              onClick={() => setFotoLightbox(null)}
              title="Tutup (Esc)"
            >
              ✕
            </button>
            <p className="absolute -bottom-10 text-white/50 text-xs font-bold uppercase tracking-widest text-center w-full animate-pulse">
              Klik di luar area atau tekan tanda silang untuk menutup
            </p>
          </div>
        </div>
      )}

      {/* MODAL INTERAKTIF LEVEL PREMIUM (MODIFY MATRIX) */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100 relative">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1">Modify Presence Log Matrix</h3>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-6">Administrative Log Correction</p>
            
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Personnel Full Name</label>
                <input type="text" value={editNama} onChange={(e) => setEditNama(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-black" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Log Shift Classification</label>
                <select value={editJenis} onChange={(e) => handleJenisChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-black">
                  <option value="MASUK">Morning Shift (Batas 08.30)</option>
                  <option value="SIANG">Afternoon Shift (Batas 13.30)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Exact Logging Time (Jam Absen)</label>
                <input type="time" value={editTime} onChange={(e) => handleTimeChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-black" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Time Compliance Status</label>
                <select value={editStatus} onChange={(e) => handleStatusChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-black">
                  <option value="Tepat Waktu">On Time (Tepat Waktu)</option>
                  <option value="Terlambat">Late (Terlambat)</option>
                </select>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-sm transition-all">Dismiss</button>
                <button onClick={simpanPerubahanEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-sm transition-all">Commit Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}