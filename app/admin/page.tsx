"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const BATAS_PAGI = { jam: 8, menit: 45 };
const BATAS_SIANG = { jam: 13, menit: 40 };

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

interface Personel {
  id: string;
  nama: string;
  peran: string;
}

export default function RekapitulasiAdmin() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAksesDiberikan, setIsAksesDiberikan] = useState<boolean>(false);
  const [kataSandi, setKataSandi] = useState<string>("");

  // Navigasi Utama Dasbor
  const [menuUtama, setMenuUtama] = useState<'INDIVIDU' | 'HARIAN' | 'PERSONEL'>('INDIVIDU');

  const [dataAbsensi, setDataAbsensi] = useState<Absensi[]>([]);
  const [masterPersonel, setMasterPersonel] = useState<Personel[]>([]);
  const [memuat, setMemuat] = useState<boolean>(true);
  
  // State untuk Rekap Individu & Harian
  const [tabAktif, setTabAktif] = useState<'PESERTA' | 'ASISTEN'>('PESERTA');
  const [namaTerpilih, setNamaTerpilih] = useState<string | null>(null);
  const [tanggalTerpilih, setTanggalTerpilih] = useState<string | null>(null);

  // State untuk Fitur Edit Matrix
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>("");
  const [editNama, setEditNama] = useState<string>("");
  const [editJenis, setEditJenis] = useState<string>("");
  const [editTime, setEditTime] = useState<string>(""); 
  const [editStatus, setEditStatus] = useState<string>("");
  const [editWaktuAsli, setEditWaktuAsli] = useState<string>("");

  // State Fitur Lightbox Multi-Media
  const [fotoLightbox, setFotoLightbox] = useState<string | null>(null);
  const [petaLightbox, setPetaLightbox] = useState<{ lat: number; lng: number } | null>(null);

  // State untuk Form Tambah Personel
  const [inputNamaPersonel, setInputNamaPersonel] = useState("");
  const [inputPeranPersonel, setInputPeranPersonel] = useState("PESERTA");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isAksesDiberikan) ambilData();
  }, [isAksesDiberikan]);

  const ambilData = async () => {
    setMemuat(true);
    // Fetch Data Absen
    const { data: absenData, error: absenError } = await supabase.from('absensi').select('*').order('waktu_absen', { ascending: false });
    if (!absenError && absenData) setDataAbsensi(absenData as Absensi[]);
    else setDataAbsensi([]);

    // Fetch Data Personel
    const { data: personelData, error: personelError } = await supabase.from('master_personel').select('*').order('nama', { ascending: true });
    if (!personelError && personelData) setMasterPersonel(personelData as Personel[]);
    
    setMemuat(false);
  };

  const periksaSandi = (e: React.FormEvent) => {
    e.preventDefault();
    if (kataSandi === "afiqganteng") setIsAksesDiberikan(true);
    else { alert("Access Denied: Invalid Administrative Password!"); setKataSandi(""); }
  };

  /* ================== LOGIKA CRUD PERSONEL ================== */
  const tambahPersonelDB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNamaPersonel.trim()) return;
    setMemuat(true);
    const { error } = await supabase.from('master_personel').insert([{ nama: inputNamaPersonel, peran: inputPeranPersonel }]);
    if (!error) {
      setInputNamaPersonel("");
      await ambilData();
      alert("Success: Nama berhasil ditambahkan ke database!");
    } else {
      alert(`Gagal Menambahkan: ${error.message}`);
    }
    setMemuat(false);
  };

  const hapusPersonelDB = async (id: string) => {
    const konfirmasi = window.confirm("PERINGATAN: Anda yakin ingin menghapus personel ini dari sistem?");
    if (!konfirmasi) return;
    setMemuat(true);
    const { error } = await supabase.from('master_personel').delete().eq('id', id);
    if (!error) {
      await ambilData();
    } else {
      alert(`Gagal Menghapus: ${error.message}`);
    }
    setMemuat(false);
  };
  /* ========================================================= */

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

    const { error } = await supabase.from('absensi').update({ 
      nama_peserta: editNama, 
      jenis_absen: editJenis,
      waktu_absen: waktuAbsenBaruISO
    }).eq('id', editId);

    if (!error) { setIsEditing(false); await ambilData(); } 
    else { alert(`Database Error: ${error.message}`); }
    setMemuat(false);
  };

  const eksporKeExcel = () => {
    const dataSesuaiTab = dataAbsensi.filter(d => (d.peran || 'PESERTA') === tabAktif);
    if (dataSesuaiTab.length === 0) return alert("No ledger data available for extraction!");

    const excelStyle = `
      <style>
        table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        th { background-color: #1e293b; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 10px; }
        td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: middle; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
      </style>
    `;

    const tableRows = dataSesuaiTab.map(d => `
      <tr>
        <td>${d.id}</td>
        <td class="bold">${d.nama_peserta}</td>
        <td>${d.peran === 'ASISTEN' ? 'Staff / Asisten PLTS' : 'Intern / Peserta KP'}</td>
        <td>${d.jenis_absen === "MASUK" ? "Morning Shift" : "Afternoon Shift"}</td>
        <td>${new Date(d.waktu_absen).toLocaleString('id-ID')} WIB</td>
        <td class="bold" style="color: ${kalkulasiStatusWaktu(d.waktu_absen, d.jenis_absen) === 'Tepat Waktu' ? '#16a34a' : '#dc2626'}">
          ${kalkulasiStatusWaktu(d.waktu_absen, d.jenis_absen)}
        </td>
        <td>${d.latitude || '-'}</td>
        <td>${d.longitude || '-'}</td>
        <td class="center" width="70" height="70">
          ${d.foto_url ? `<img src="${d.foto_url}" width="60" height="60" style="display:block; margin:auto; rounded-radius: 8px;" />` : '-'}
        </td>
      </tr>
    `).join("");

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8">${excelStyle}</head>
      <body>
        <table>
          <thead>
            <tr>
              <th>ID Ledger</th><th>Personnel Name</th><th>System Role</th><th>Log Classification</th>
              <th>Timestamp</th><th>Time Compliance</th><th>Latitude</th><th>Longitude</th><th>Visual Verification (Photo)</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_Excel_Report_${tabAktif}_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const bukaModalEdit = (row: Absensi) => {
    const waktu = new Date(row.waktu_absen);
    const jamStr = String(waktu.getHours()).padStart(2, '0');
    const menitStr = String(waktu.getMinutes()).padStart(2, '0');
    setEditId(row.id); setEditNama(row.nama_peserta); setEditJenis(row.jenis_absen);
    setEditTime(`${jamStr}:${menitStr}`); setEditWaktuAsli(row.waktu_absen);
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

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="animate-pulse w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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

  // --- LOGIKA GROUPING UNTUK MENU "INDIVIDU" ---
  const dataSesuaiTab = dataAbsensi.filter(d => (d.peran || 'PESERTA') === tabAktif);
  const dataIndividu = dataSesuaiTab.reduce((hasil, baris) => {
    const nama = baris.nama_peserta;
    if (!hasil[nama]) hasil[nama] = [];
    hasil[nama].push(baris);
    return hasil;
  }, {} as Record<string, Absensi[]>);
  const daftarNamaIndividu = Object.keys(dataIndividu).sort();

  // Data Detail yang Dipilih
  const rekapDetail = namaTerpilih ? (dataIndividu[namaTerpilih] || []) : [];
  
  // PEMBARUAN: Mengelompokkan ulang rekapDetail berdasarkan tanggal untuk separator
  const rekapDetailPerHari = rekapDetail.reduce((hasil, baris) => {
    const tanggal = new Date(baris.waktu_absen).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!hasil[tanggal]) hasil[tanggal] = [];
    hasil[tanggal].push(baris);
    return hasil;
  }, {} as Record<string, Absensi[]>);

  // --- LOGIKA GROUPING UNTUK MENU "HARIAN" ---
  const dataHarian = dataAbsensi.reduce((hasil, baris) => {
    const tanggal = new Date(baris.waktu_absen).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!hasil[tanggal]) hasil[tanggal] = [];
    hasil[tanggal].push(baris);
    return hasil;
  }, {} as Record<string, Absensi[]>);
  const daftarTanggalHarian = Object.keys(dataHarian);
  const rekapTanggalDetail = tanggalTerpilih ? (dataHarian[tanggalTerpilih] || []) : [];

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
            <button onClick={eksporKeExcel} className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-5 py-2.5 rounded-full transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span className="hidden sm:block">Export to Excel</span>
            </button>
            <button onClick={ambilData} className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-5 py-2.5 rounded-full transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              <span className="hidden sm:block">Synchronize Data</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-10">
        
        {/* NAVIGASI UTAMA (3 MENU BARU) */}
        <div className="flex flex-wrap gap-2 bg-slate-100/70 p-2 rounded-[1.25rem] mb-10 w-fit border border-slate-200/50">
          <button onClick={() => {setMenuUtama('INDIVIDU'); setNamaTerpilih(null); setTanggalTerpilih(null);}} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${menuUtama === 'INDIVIDU' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Rekap per Individu</button>
          <button onClick={() => {setMenuUtama('HARIAN'); setNamaTerpilih(null); setTanggalTerpilih(null);}} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${menuUtama === 'HARIAN' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Rekap Harian (Date)</button>
          <button onClick={() => {setMenuUtama('PERSONEL'); setNamaTerpilih(null); setTanggalTerpilih(null);}} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${menuUtama === 'PERSONEL' ? 'bg-slate-900 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}>Personal Management</button>
        </div>

        {memuat ? (
          <div className="flex justify-center items-center h-40"><p className="text-slate-400 font-medium animate-pulse">Synchronizing database infrastructure...</p></div>
        ) : (
          <>
            {/* ========================================= MENU 1: REKAP INDIVIDU ========================================= */}
            {menuUtama === 'INDIVIDU' && (
              <div className="animate-fade-in">
                {namaTerpilih === null ? (
                  <>
                    <div className="inline-flex gap-2 mb-8">
                      <button onClick={() => setTabAktif('PESERTA')} className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all ${tabAktif === 'PESERTA' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>Peserta KP</button>
                      <button onClick={() => setTabAktif('ASISTEN')} className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all ${tabAktif === 'ASISTEN' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>Asisten PLTS</button>
                    </div>
                    {daftarNamaIndividu.length === 0 ? (
                      <div className="text-center py-20 text-slate-400">Belum ada data absensi untuk kategori ini.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {daftarNamaIndividu.map((nama) => (
                          <div key={nama} onClick={() => setNamaTerpilih(nama)} className="bg-white p-7 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all flex flex-col justify-between h-full">
                            <div>
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border ${tabAktif === 'PESERTA' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                              </div>
                              <h2 className="text-lg font-bold text-slate-900 leading-tight">{nama}</h2>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-6">Contains <span className="font-bold">{dataIndividu[nama].length}</span> historical logs</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="animate-fade-in max-w-6xl mx-auto">
                    <button onClick={() => setNamaTerpilih(null)} className="text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-8 border-b border-slate-100 pb-4 w-full">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                      Kembali ke Daftar Individu
                    </button>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-8">{namaTerpilih}</h1>
                    
                    {/* PEMBARUAN: Loop rendering berdasarkan pengelompokan tanggal */}
                    <div className="flex flex-col gap-10">
                      {Object.keys(rekapDetailPerHari).map((tanggal) => (
                        <div key={tanggal} className="flex flex-col">
                          <div className="flex items-center gap-3 mb-4">
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{tanggal}</h2>
                            <div className="flex-1 h-px bg-slate-100"></div>
                          </div>
                          
                          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50/50 text-xs text-slate-500 uppercase font-bold tracking-wider">
                                <tr>
                                  <th className="px-6 py-4">Waktu Absen</th>
                                  <th className="px-6 py-4 text-center">Log Classification</th>
                                  <th className="px-6 py-4 text-center">Time Compliance</th>
                                  <th className="px-6 py-4 text-center">Location</th>
                                  <th className="px-6 py-4 text-center">Photo</th>
                                  <th className="px-6 py-4 text-center">Control</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {rekapDetailPerHari[tanggal].map((row) => {
                                  const waktu = new Date(row.waktu_absen);
                                  const statusKehadiran = kalkulasiStatusWaktu(row.waktu_absen, row.jenis_absen);
                                  return (
                                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                      <td className="px-6 py-5 font-semibold text-slate-700">
                                        {waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                      </td>
                                      <td className="px-6 py-5 text-center">
                                        <span className={`inline-block px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider ${row.jenis_absen === 'MASUK' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                          {row.jenis_absen === 'MASUK' ? 'Pagi' : 'Siang'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-5 text-center">
                                        <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase ${statusKehadiran === 'Tepat Waktu' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                          {statusKehadiran === 'Tepat Waktu' ? 'On Time' : 'Late'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-5 text-center">
                                        <button onClick={() => setPetaLightbox({ lat: row.latitude, lng: row.longitude })} className="text-blue-600 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-all">Map</button>
                                      </td>
                                      <td className="px-6 py-5 flex justify-center">
                                        <img src={row.foto_url} alt="Foto" className="w-10 h-10 object-cover rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:scale-110 transition-all" onClick={() => setFotoLightbox(row.foto_url)} />
                                      </td>
                                      <td className="px-6 py-5 text-center">
                                        <div className="flex justify-center gap-2">
                                          <button onClick={() => bukaModalEdit(row)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all" title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                                          <button onClick={() => hapusData(row.id)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all" title="Delete"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
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
              </div>
            )}

            {/* ========================================= MENU 2: REKAP HARIAN ========================================= */}
            {menuUtama === 'HARIAN' && (
              <div className="animate-fade-in">
                {tanggalTerpilih === null ? (
                  <>
                    {daftarTanggalHarian.length === 0 ? (
                      <div className="text-center py-20 text-slate-400">Belum ada log absensi tercatat di sistem.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {daftarTanggalHarian.map((tgl) => (
                          <div key={tgl} onClick={() => setTanggalTerpilih(tgl)} className="bg-white p-7 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all flex flex-col justify-between h-full">
                            <div>
                              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border bg-emerald-50 text-emerald-600 border-emerald-100">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                              </div>
                              <h2 className="text-lg font-bold text-slate-900 leading-tight">{tgl}</h2>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-6">Merekam <span className="font-bold">{dataHarian[tgl].length}</span> personel masuk</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="animate-fade-in max-w-6xl mx-auto">
                    <button onClick={() => setTanggalTerpilih(null)} className="text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-8 border-b border-slate-100 pb-4 w-full">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                      Kembali ke Daftar Tanggal
                    </button>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-8">{tanggalTerpilih}</h1>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-xs text-slate-500 uppercase font-bold tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Nama Personel</th>
                            <th className="px-6 py-4 text-center">Peran</th>
                            <th className="px-6 py-4 text-center">Waktu Absen</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-center">Map & Photo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {rekapTanggalDetail.map((row) => {
                            const waktu = new Date(row.waktu_absen);
                            const statusKehadiran = kalkulasiStatusWaktu(row.waktu_absen, row.jenis_absen);
                            return (
                              <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-5 font-bold text-slate-700">{row.nama_peserta}</td>
                                <td className="px-6 py-5 text-center">
                                  <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase ${row.peran === 'ASISTEN' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{row.peran}</span>
                                </td>
                                <td className="px-6 py-5 text-center font-semibold text-slate-600">
                                  {waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB 
                                  <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">{row.jenis_absen === 'MASUK' ? 'PAGI' : 'SIANG'}</span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase ${statusKehadiran === 'Tepat Waktu' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{statusKehadiran === 'Tepat Waktu' ? 'On Time' : 'Late'}</span>
                                </td>
                                <td className="px-6 py-5 flex justify-center gap-3 items-center">
                                  <button onClick={() => setPetaLightbox({ lat: row.latitude, lng: row.longitude })} className="text-blue-600 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all">Map</button>
                                  <img src={row.foto_url} alt="Foto" className="w-8 h-8 object-cover rounded-lg shadow-sm border cursor-pointer hover:scale-110 transition-all" onClick={() => setFotoLightbox(row.foto_url)} />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================= MENU 3: MANAJEMEN PERSONEL ========================================= */}
            {menuUtama === 'PERSONEL' && (
              <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Form Tambah Personel */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-28">
                    <h2 className="text-lg font-extrabold text-slate-900 mb-1">Tambah Personel</h2>
                    <p className="text-xs text-slate-500 mb-6">Database akan terhubung langsung dengan kamera absensi.</p>
                    
                    <form onSubmit={tambahPersonelDB} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nama Lengkap Sesuai KTP</label>
                        <input type="text" value={inputNamaPersonel} onChange={(e) => setInputNamaPersonel(e.target.value)} required placeholder="Ketik nama di sini..." className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Jabatan / Peran</label>
                        <select value={inputPeranPersonel} onChange={(e) => setInputPeranPersonel(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900">
                          <option value="PESERTA">Peserta KP (Intern)</option>
                          <option value="ASISTEN">Asisten PLTS (Staff)</option>
                        </select>
                      </div>
                      <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl text-sm transition-all shadow-md mt-2">Simpan ke Database</button>
                    </form>
                  </div>
                </div>

                {/* List Data Personel Aktif */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                      <h2 className="text-lg font-extrabold text-slate-900">Daftar Personel Aktif</h2>
                      <span className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">{masterPersonel.length} Total</span>
                    </div>
                    {masterPersonel.length === 0 ? (
                      <div className="p-10 text-center text-slate-400">Database personel kosong.</div>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead className="bg-white text-[10px] text-slate-400 uppercase font-bold tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Nama Lengkap</th>
                            <th className="px-6 py-4 text-center">Peran Sistem</th>
                            <th className="px-6 py-4 text-right">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {masterPersonel.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-800">{p.nama}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-extrabold uppercase ${p.peran === 'ASISTEN' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{p.peran}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => hapusPersonelDB(p.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg font-bold text-xs transition-all">Hapus Data</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL LIGHTBOX FOTO */}
      {fotoLightbox && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setFotoLightbox(null)}>
          <div className="relative max-w-3xl w-full flex justify-center items-center">
            <img src={fotoLightbox} alt="Foto Diperbesar" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/20" onClick={(e) => e.stopPropagation()} />
            <button className="absolute -top-4 -right-4 bg-slate-900 text-white w-10 h-10 rounded-full font-bold shadow-lg hover:bg-black border border-slate-700 transition-all flex items-center justify-center" onClick={() => setFotoLightbox(null)} title="Tutup (Esc)">✕</button>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX PETA (IN-APP MAP PREVIEW) */}
      {petaLightbox && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setPetaLightbox(null)}>
          <div className="relative w-full max-w-3xl bg-white p-2 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button className="absolute -top-4 -right-4 bg-rose-600 text-white w-10 h-10 rounded-full font-bold shadow-lg hover:bg-rose-700 border-2 border-white transition-all flex items-center justify-center z-10" onClick={() => setPetaLightbox(null)}>✕</button>
            <div className="w-full rounded-xl overflow-hidden h-[60vh] bg-slate-100 flex items-center justify-center relative">
              <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={`https://maps.google.com/maps?q=$${petaLightbox.lat},${petaLightbox.lng}&z=16&output=embed`}></iframe>
            </div>
            <div className="p-4 text-center bg-white rounded-b-xl">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Koordinat Geografis Tercatat</p>
              <p className="text-sm font-mono text-slate-800 mt-1">{petaLightbox.lat}, {petaLightbox.lng}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INTERAKTIF LEVEL PREMIUM (MODIFY MATRIX) */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100 relative">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1">Modify Presence Log Matrix</h3>
            <div className="flex flex-col gap-5 mt-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Personnel Full Name</label>
                <input type="text" value={editNama} onChange={(e) => setEditNama(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-semibold text-black" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Log Shift</label>
                <select value={editJenis} onChange={(e) => handleJenisChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold text-black">
                  <option value="MASUK">Morning Shift</option>
                  <option value="SIANG">Afternoon Shift</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exact Time</label>
                <input type="time" value={editTime} onChange={(e) => handleTimeChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold text-black" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Compliance Status</label>
                <select value={editStatus} onChange={(e) => handleStatusChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold text-black">
                  <option value="Tepat Waktu">On Time</option>
                  <option value="Terlambat">Late</option>
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-sm">Dismiss</button>
                <button onClick={simpanPerubahanEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm">Commit Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}