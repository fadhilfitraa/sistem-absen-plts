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

interface Tugas {
  id: string;
  nama_tugas: string;
  deadline: string;
  keterangan_tugas: string;
  is_closed?: boolean; // PENAMBAHAN FITUR CLOSE SUBMISSION
}

interface Pengumpulan {
  id: string;
  tugas_id: string;
  nama_peserta: string;
  waktu_pengumpulan: string;
  link_tautan: string;
  status_waktu: string;
}

export default function RekapitulasiAdmin() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAksesDiberikan, setIsAksesDiberikan] = useState<boolean>(false);
  const [kataSandi, setKataSandi] = useState<string>("");

  const [menuUtama, setMenuUtama] = useState<'INDIVIDU' | 'HARIAN' | 'PERSONEL' | 'TUGAS'>('INDIVIDU');

  const [dataAbsensi, setDataAbsensi] = useState<Absensi[]>([]);
  const [masterPersonel, setMasterPersonel] = useState<Personel[]>([]);
  
  // State untuk Fitur Tugas
  const [dataTugas, setDataTugas] = useState<Tugas[]>([]);
  const [dataPengumpulan, setDataPengumpulan] = useState<Pengumpulan[]>([]);
  const [tugasTerpilih, setTugasTerpilih] = useState<string | null>(null);
  
  // State Edit Tugas
  const [isEditingTugas, setIsEditingTugas] = useState<boolean>(false);
  const [editTugasId, setEditTugasId] = useState<string>("");
  const [editNamaTugas, setEditNamaTugas] = useState<string>("");
  const [editDeadlineTugas, setEditDeadlineTugas] = useState<string>("");
  const [editKeteranganTugas, setEditKeteranganTugas] = useState<string>("");

  const [memuat, setMemuat] = useState<boolean>(true);
  
  const [tabAktif, setTabAktif] = useState<'PESERTA' | 'ASISTEN'>('PESERTA');
  const [namaTerpilih, setNamaTerpilih] = useState<string | null>(null);
  const [tanggalTerpilih, setTanggalTerpilih] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>("");
  const [editNama, setEditNama] = useState<string>("");
  const [editJenis, setEditJenis] = useState<string>("");
  const [editTime, setEditTime] = useState<string>(""); 
  const [editStatus, setEditStatus] = useState<string>("");
  const [editWaktuAsli, setEditWaktuAsli] = useState<string>("");

  const [isTambahManual, setIsTambahManual] = useState<boolean>(false);
  const [manualNama, setManualNama] = useState<string>("");
  const [manualStatus, setManualStatus] = useState<string>("IZIN");
  const [manualWaktu, setManualWaktu] = useState<string>(""); 
  const [manualKeterangan, setManualKeterangan] = useState<string>("");
  
  const [rekomendasiManual, setRekomendasiManual] = useState<string[]>([]);
  const [tampilkanSaranManual, setTampilkanSaranManual] = useState<boolean>(false);

  const [fotoLightbox, setFotoLightbox] = useState<string | null>(null);
  const [petaLightbox, setPetaLightbox] = useState<{ lat: number; lng: number } | null>(null);

  const [inputNamaPersonel, setInputNamaPersonel] = useState("");
  const [inputPeranPersonel, setInputPeranPersonel] = useState("PESERTA");

  const [inputNamaTugas, setInputNamaTugas] = useState("");
  const [inputDeadlineTugas, setInputDeadlineTugas] = useState("");
  const [inputKeteranganTugas, setInputKeteranganTugas] = useState("");

  const [currentTimeTick, setCurrentTimeTick] = useState<Date>(new Date());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAksesDiberikan && menuUtama === 'TUGAS') {
      timer = setInterval(() => setCurrentTimeTick(new Date()), 1000);
    }
    return () => clearInterval(timer);
  }, [isAksesDiberikan, menuUtama]);

  useEffect(() => {
    if (isAksesDiberikan) ambilData();
  }, [isAksesDiberikan]);

  const ambilData = async () => {
    setMemuat(true);
    const { data: absenData, error: absenError } = await supabase.from('absensi').select('*').order('waktu_absen', { ascending: false });
    if (!absenError && absenData) setDataAbsensi(absenData as Absensi[]);
    else setDataAbsensi([]);

    const { data: personelData, error: personelError } = await supabase.from('master_personel').select('*').order('nama', { ascending: true });
    if (!personelError && personelData) setMasterPersonel(personelData as Personel[]);
    
    const { data: tugasData } = await supabase.from('master_tugas').select('*').order('deadline', { ascending: true });
    if (tugasData) setDataTugas(tugasData as Tugas[]);

    const { data: kumpulData } = await supabase.from('pengumpulan_tugas').select('*').order('waktu_pengumpulan', { ascending: false });
    if (kumpulData) setDataPengumpulan(kumpulData as Pengumpulan[]);

    setMemuat(false);
  };

  const periksaSandi = (e: React.FormEvent) => {
    e.preventDefault();
    if (kataSandi === "afiqganteng") setIsAksesDiberikan(true);
    else { alert("Access Denied: Invalid Administrative Password!"); setKataSandi(""); }
  };

  /* ================== LOGIKA TUGAS ================== */
  const tambahTugasDB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNamaTugas.trim() || !inputDeadlineTugas) return;
    setMemuat(true);

    const { error } = await supabase.from('master_tugas').insert([{
      nama_tugas: inputNamaTugas,
      deadline: new Date(inputDeadlineTugas).toISOString(),
      keterangan_tugas: inputKeteranganTugas.trim() || '-',
      is_closed: false // Default buka saat dibuat
    }]);

    if (!error) {
      setInputNamaTugas("");
      setInputDeadlineTugas("");
      setInputKeteranganTugas("");
      await ambilData();
      alert("Success: Penugasan baru telah diterbitkan!");
    } else {
      alert(`Gagal Menambahkan Tugas: ${error.message}`);
    }
    setMemuat(false);
  };

  const bukaModalEditTugas = (t: Tugas) => {
    const localDate = new Date(t.deadline);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    const formattedDeadline = localDate.toISOString().slice(0, 19);

    setEditTugasId(t.id);
    setEditNamaTugas(t.nama_tugas);
    setEditDeadlineTugas(formattedDeadline);
    setEditKeteranganTugas(t.keterangan_tugas);
    setIsEditingTugas(true);
  };

  const simpanPerubahanEditTugas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNamaTugas.trim() || !editDeadlineTugas) return alert("Task name and deadline cannot be empty!");
    setMemuat(true);

    const { error } = await supabase.from('master_tugas').update({
      nama_tugas: editNamaTugas,
      deadline: new Date(editDeadlineTugas).toISOString(),
      keterangan_tugas: editKeteranganTugas.trim() || '-'
    }).eq('id', editTugasId);

    if (!error) {
      setIsEditingTugas(false);
      await ambilData();
      alert("Success: Penugasan berhasil diperbarui!");
    } else {
      alert(`Database Error: ${error.message}`);
    }
    setMemuat(false);
  };

  // LOGIKA KUNCI/BUKA TUGAS
  const toggleCloseTugas = async (t: Tugas) => {
    const isSaatIniTutup = t.is_closed;
    const konfirmasi = window.confirm(
      isSaatIniTutup 
        ? "Buka kembali pengumpulan tugas ini? Peserta akan bisa submit lagi." 
        : "Tutup paksa pengumpulan tugas ini? Peserta TIDAK AKAN BISA submit lagi meski belum deadline."
    );
    if (!konfirmasi) return;
    
    setMemuat(true);
    const { error } = await supabase.from('master_tugas').update({ is_closed: !isSaatIniTutup }).eq('id', t.id);
    if (!error) await ambilData();
    else alert(`Database Error: ${error.message}`);
    setMemuat(false);
  };

  const hapusTugasDB = async (id: string) => {
    const konfirmasi = window.confirm("Hapus tugas ini secara permanen? Semua berkas peserta akan hilang dari dashboard.");
    if (!konfirmasi) return;
    setMemuat(true);
    const { error } = await supabase.from('master_tugas').delete().eq('id', id);
    if (!error) {
      if (tugasTerpilih === id) setTugasTerpilih(null);
      await ambilData();
    } else {
      alert(`Gagal Menghapus Tugas: ${error.message}`);
    }
    setMemuat(false);
  };

  const deleteSubmissionLog = async (id: string) => {
    if(!window.confirm("Hapus rekam pengumpulan ini?")) return;
    setMemuat(true);
    await supabase.from('pengumpulan_tugas').delete().eq('id', id);
    await ambilData();
  };

  // Kalkulasi ditambahkan deteksi `is_closed`
  const kalkulasiSisaWaktuTugas = (deadlineISO: string, isClosed?: boolean) => {
    if (isClosed) {
      return { 
        teks: `Submissions Locked by Admin`, 
        status: 'LEWAT', 
        kelasCss: 'text-rose-600 bg-rose-50 border-rose-200' 
      };
    }

    const targetDl = new Date(deadlineISO);
    const selisihMs = targetDl.getTime() - currentTimeTick.getTime();

    if (selisihMs < 0) {
      const sisaAbsolut = Math.abs(selisihMs);
      const hari = Math.floor(sisaAbsolut / (1000 * 60 * 60 * 24));
      const jam = Math.floor((sisaAbsolut % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const menit = Math.floor((sisaAbsolut % (1000 * 60 * 60)) / (1000 * 60));
      const detik = Math.floor((sisaAbsolut % (1000 * 60)) / 1000);
      return { 
        teks: `Closed (Ended ${hari}d ${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')} ago)`, 
        status: 'LEWAT', 
        kelasCss: 'text-rose-600 bg-rose-50 border-rose-200' 
      };
    } else {
      const hari = Math.floor(selisihMs / (1000 * 60 * 60 * 24));
      const jam = Math.floor((selisihMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const menit = Math.floor((selisihMs % (1000 * 60 * 60)) / (1000 * 60));
      const detik = Math.floor((selisihMs % (1000 * 60)) / 1000);
      return { 
        teks: hari > 0 
          ? `Active (${hari}d ${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')} left)` 
          : `Active (${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')} left)`, 
        status: 'AKTIF', 
        kelasCss: 'text-purple-600 bg-purple-50 border-purple-200' 
      };
    }
  };
  /* ================================================== */

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
    if (!error) await ambilData();
    else alert(`Gagal Menghapus: ${error.message}`);
    setMemuat(false);
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

  const handleKetikNamaManual = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nilai = e.target.value;
    setManualNama(nilai);

    if (nilai.trim() !== "") {
      const hasilFilter = masterPersonel
        .map(p => p.nama)
        .filter((n) => n.toLowerCase().includes(nilai.toLowerCase()));
      setRekomendasiManual(hasilFilter);
      setTampilkanSaranManual(true);
    } else {
      setRekomendasiManual([]);
      setTampilkanSaranManual(false);
    }
  };

  const pilihNamaManual = (namaT: string) => {
    setManualNama(namaT);
    setTampilkanSaranManual(false);
  };

  const bukaModalManual = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setManualWaktu(now.toISOString().slice(0, 16)); 
    setManualNama("");
    setManualKeterangan("");
    setIsTambahManual(true);
  };

  const simpanLogManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNama || !manualWaktu || !manualStatus || !manualKeterangan) return alert("Harap lengkapi semua data, termasuk keterangan!");
    setMemuat(true);

    const personelTerpilih = masterPersonel.find(p => p.nama === manualNama);
    const peranUser = personelTerpilih ? personelTerpilih.peran : 'PESERTA';
    const wktObj = new Date(manualWaktu);

    const { error } = await supabase.from('absensi').insert([{
      nama_peserta: manualNama,
      jenis_absen: manualStatus,
      waktu_absen: wktObj.toISOString(),
      peran: peranUser,
      latitude: 0, 
      longitude: 0, 
      foto_url: `KET: ${manualKeterangan}` 
    }]);

    if (!error) {
      setIsTambahManual(false);
      setManualKeterangan("");
      setManualNama("");
      await ambilData();
    } else {
      alert(`Gagal menyimpan log manual: ${error.message}`);
    }
    setMemuat(false);
  };

  const handleTimeChange = (newTime: string) => {
    setEditTime(newTime);
    if (editJenis === "IZIN" || editJenis === "SAKIT" || editJenis === "ALPHA") return;
    const [jam, menit] = newTime.split(':').map(Number);
    let kalkulasiStatus = "Tepat Waktu";
    if (editJenis === "MASUK") {
      if (jam > BATAS_PAGI.jam || (jam === BATAS_PAGI.jam && menit > BATAS_PAGI.menit)) kalkulasiStatus = "Terlambat";
    } else if (editJenis === "SIANG") {
      if (jam > BATAS_SIANG.jam || (jam === BATAS_SIANG.jam && menit > BATAS_SIANG.menit)) kalkulasiStatus = "Terlambat";
    }
    setEditStatus(kalkulasiStatus);
  };

  const handleJenisChange = (newJenis: string) => {
    setEditJenis(newJenis);
    if (newJenis === "IZIN") setEditStatus("Izin Resmi");
    else if (newJenis === "SAKIT") setEditStatus("Sakit");
    else if (newJenis === "ALPHA") setEditStatus("Tanpa Keterangan");
    else {
      setEditTime(newJenis === "MASUK" ? "08:00" : "13:00");
      setEditStatus("Tepat Waktu");
    }
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

  const bukaModalEdit = (row: Absensi) => {
    const waktu = new Date(row.waktu_absen);
    const jamStr = String(waktu.getHours()).padStart(2, '0');
    const menitStr = String(waktu.getMinutes()).padStart(2, '0');
    setEditId(row.id); setEditNama(row.nama_peserta); setEditJenis(row.jenis_absen);
    setEditTime(`${jamStr}:${menitStr}`); setEditWaktuAsli(row.waktu_absen);
    setEditStatus(kalkulasiStatusWaktu(row.waktu_absen, row.jenis_absen));
    setIsEditing(true);
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
        .italic { font-style: italic; color: #64748b; }
      </style>
    `;

    const tableRows = dataSesuaiTab.map(d => {
      const isManual = d.foto_url && d.foto_url.startsWith("KET: ");
      const keteranganManual = isManual ? d.foto_url.replace("KET: ", "") : "-";

      return `
        <tr>
          <td>${d.id}</td>
          <td class="bold">${d.nama_peserta}</td>
          <td>${d.peran === 'ASISTEN' ? 'Staff / Asisten PLTS' : 'Intern / Peserta KP'}</td>
          <td>${d.jenis_absen === "MASUK" ? "Morning Shift" : d.jenis_absen === "SIANG" ? "Afternoon Shift" : d.jenis_absen}</td>
          <td>${new Date(d.waktu_absen).toLocaleString('id-ID')} WIB</td>
          <td class="bold">
            ${kalkulasiStatusWaktu(d.waktu_absen, d.jenis_absen)}
          </td>
          <td>${!isManual ? d.latitude : '-'}</td>
          <td>${!isManual ? d.longitude : '-'}</td>
          <td class="center" width="120">
            ${!isManual ? 
              (d.foto_url ? `<img src="${d.foto_url}" width="60" height="60" style="display:block; margin:auto; rounded-radius: 8px;" />` : '-') 
              : 
              `<span class="italic">${keteranganManual}</span>`
            }
          </td>
        </tr>
      `;
    }).join("");

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8">${excelStyle}</head>
      <body>
        <table>
          <thead>
            <tr>
              <th>ID Ledger</th><th>Personnel Name</th><th>System Role</th><th>Log Classification</th>
              <th>Timestamp</th><th>Time Compliance</th><th>Latitude</th><th>Longitude</th><th>Visual / Keterangan Manual</th>
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

  const kalkulasiStatusWaktu = (waktuISO: string, jenis: string) => {
    if (jenis === 'IZIN') return "Izin (Approved)";
    if (jenis === 'SAKIT') return "Sakit (Sick Leave)";
    if (jenis === 'ALPHA') return "Alpha (No Notice)";
    
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

  const renderVisualLabel = (jenis: string) => {
    if (jenis === 'MASUK') return { teks: 'PAGI', warna: 'bg-blue-50 text-blue-600 border-blue-200' };
    if (jenis === 'SIANG') return { teks: 'SIANG', warna: 'bg-amber-50 text-amber-600 border-amber-200' };
    if (jenis === 'IZIN') return { teks: 'IZIN', warna: 'bg-purple-50 text-purple-600 border-purple-200' };
    if (jenis === 'SAKIT') return { teks: 'SAKIT', warna: 'bg-orange-50 text-orange-600 border-orange-200' };
    if (jenis === 'ALPHA') return { teks: 'ALPHA', warna: 'bg-rose-50 text-rose-600 border-rose-200' };
    return { teks: jenis, warna: 'bg-slate-50 text-slate-600 border-slate-200' };
  };

  const renderVisualStatus = (status: string) => {
    if (status === 'Tepat Waktu') return 'bg-emerald-50 text-emerald-600';
    if (status === 'Terlambat') return 'bg-rose-50 text-rose-600';
    return 'bg-slate-100 text-slate-600'; 
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

  const dataSesuaiTab = dataAbsensi.filter(d => (d.peran || 'PESERTA') === tabAktif);
  
  const dataIndividu = dataSesuaiTab.reduce((hasil, baris) => {
    const nama = baris.nama_peserta;
    if (!hasil[nama]) hasil[nama] = [];
    hasil[nama].push(baris);
    return hasil;
  }, {} as Record<string, Absensi[]>);
  const daftarNamaIndividu = Object.keys(dataIndividu).sort();

  const rekapDetail = namaTerpilih ? (dataIndividu[namaTerpilih] || []) : [];
  const rekapDetailPerHari = rekapDetail.reduce((hasil, baris) => {
    const tanggal = new Date(baris.waktu_absen).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!hasil[tanggal]) hasil[tanggal] = [];
    hasil[tanggal].push(baris);
    return hasil;
  }, {} as Record<string, Absensi[]>);

  const dataHarian = dataAbsensi.reduce((hasil, baris) => {
    const tanggal = new Date(baris.waktu_absen).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!hasil[tanggal]) hasil[tanggal] = [];
    hasil[tanggal].push(baris);
    return hasil;
  }, {} as Record<string, Absensi[]>);
  const daftarTanggalHarian = Object.keys(dataHarian);
  const rekapTanggalDetail = tanggalTerpilih ? (dataHarian[tanggalTerpilih] || []) : [];

  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const absenHariIni = dataAbsensi.filter(d => isToday(d.waktu_absen));
  const personelSesuaiTab = masterPersonel.filter(p => p.peran === tabAktif);

  const mapAbsenHariIni = absenHariIni.reduce((acc, curr) => {
    if (!acc[curr.nama_peserta]) acc[curr.nama_peserta] = [];
    acc[curr.nama_peserta].push(curr);
    return acc;
  }, {} as Record<string, Absensi[]>);

  const jumlahHadir = personelSesuaiTab.filter(p => mapAbsenHariIni[p.nama]?.length > 0).length;
  const persentaseHadir = personelSesuaiTab.length > 0 ? Math.round((jumlahHadir / personelSesuaiTab.length) * 100) : 0;

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
            <button onClick={bukaModalManual} className="flex items-center gap-2 text-sm font-bold text-white bg-slate-900 hover:bg-black px-5 py-2.5 rounded-full transition-all shadow-md">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
              <span className="hidden sm:block">Inject Log Manual</span>
            </button>
            <button onClick={eksporKeExcel} className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-5 py-2.5 rounded-full transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span className="hidden sm:block">Export Excel</span>
            </button>
            <button onClick={ambilData} className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-5 py-2.5 rounded-full transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-10">
        
        <div className="flex flex-wrap gap-2 bg-slate-100/70 p-2 rounded-[1.25rem] mb-8 w-fit border border-slate-200/50">
          <button onClick={() => {setMenuUtama('INDIVIDU'); setNamaTerpilih(null); setTanggalTerpilih(null); setTugasTerpilih(null);}} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${menuUtama === 'INDIVIDU' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Individual Report</button>
          <button onClick={() => {setMenuUtama('HARIAN'); setNamaTerpilih(null); setTanggalTerpilih(null); setTugasTerpilih(null);}} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${menuUtama === 'HARIAN' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Daily Report</button>
          <button onClick={() => {setMenuUtama('TUGAS'); setNamaTerpilih(null); setTanggalTerpilih(null); setTugasTerpilih(null);}} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${menuUtama === 'TUGAS' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>Task Management</button>
          <button onClick={() => {setMenuUtama('PERSONEL'); setNamaTerpilih(null); setTanggalTerpilih(null); setTugasTerpilih(null);}} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${menuUtama === 'PERSONEL' ? 'bg-slate-900 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}>Personal Management</button>
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
                    <div className="inline-flex gap-2 mb-6">
                      <button onClick={() => setTabAktif('PESERTA')} className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all ${tabAktif === 'PESERTA' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>Peserta KP</button>
                      <button onClick={() => setTabAktif('ASISTEN')} className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all ${tabAktif === 'ASISTEN' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>Asisten PLTS</button>
                    </div>

                    <div className="mb-10 bg-[#fafafa]/40 backdrop-blur-sm rounded-[2rem] border border-slate-200/60 p-6 sm:p-8">
                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Real-Time Attendance Stream</span>
                          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">LIVE STATUS</h2>
                        </div>
                        <div className="flex items-center gap-3 bg-white border border-slate-100 px-4 py-2 rounded-2xl shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                          <span className="text-xs font-bold text-slate-700 font-mono">{persentaseHadir}% Present</span>
                          <span className="text-slate-200">|</span>
                          <span className="text-xs font-semibold text-slate-400">{jumlahHadir} of {personelSesuaiTab.length} Active</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-1 mb-8 overflow-hidden">
                        <div className="bg-emerald-500 h-1 rounded-full transition-all duration-1000 ease-out" style={{ width: `${persentaseHadir}%` }}></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {personelSesuaiTab.map(p => {
                          const logs = mapAbsenHariIni[p.nama] || [];
                          const sudahHadir = logs.length > 0;
                          
                          const logSiang = logs.find(l => l.jenis_absen === 'SIANG');
                          const logPagi = logs.find(l => l.jenis_absen === 'MASUK');
                          const logLainnya = logs.find(l => ['IZIN', 'SAKIT', 'ALPHA'].includes(l.jenis_absen));

                          let statusAktif = null;
                          let warnaDot = 'bg-slate-200';
                          let warnaBorder = 'border-slate-100 hover:border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.01)]';
                          let warnaTeks = 'text-slate-400 font-medium';
                          let warnaInfo = '';
                          let teksInfo = '';

                          if (logSiang) {
                            statusAktif = logSiang;
                            warnaDot = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
                            warnaBorder = 'border-emerald-500/20 shadow-sm hover:border-emerald-500/40 bg-emerald-50/10';
                            warnaTeks = 'text-slate-800';
                            warnaInfo = 'text-emerald-600';
                            teksInfo = 'Full-Day Attendance';
                          } else if (logPagi) {
                            statusAktif = logPagi;
                            warnaDot = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
                            warnaBorder = 'border-amber-500/30 shadow-sm hover:border-amber-500/50 bg-amber-50/10';
                            warnaTeks = 'text-slate-800';
                            warnaInfo = 'text-amber-600';
                            teksInfo = 'Morning Shift Only';
                          } else if (logLainnya) {
                            statusAktif = logLainnya;
                            if (logLainnya.jenis_absen === 'IZIN') {
                              warnaDot = 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]';
                              warnaBorder = 'border-purple-500/30 shadow-sm bg-purple-50/10';
                              warnaInfo = 'text-purple-600';
                            } else if (logLainnya.jenis_absen === 'SAKIT') {
                              warnaDot = 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]';
                              warnaBorder = 'border-orange-500/30 shadow-sm bg-orange-50/10';
                              warnaInfo = 'text-orange-600';
                            } else {
                              warnaDot = 'bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.5)]';
                              warnaBorder = 'border-rose-500/30 shadow-sm bg-rose-50/10';
                              warnaInfo = 'text-rose-600';
                            }
                            warnaTeks = 'text-slate-800';
                            teksInfo = `Status: ${logLainnya.jenis_absen}`;
                          }

                          const jamPresensi = statusAktif ? new Date(statusAktif.waktu_absen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "";

                          return (
                            <div key={p.id} className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${warnaBorder}`}>
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className={`text-sm truncate ${warnaTeks}`}>
                                  {p.nama}
                                </span>
                                {sudahHadir && (
                                  <span className={`text-[10px] font-bold tracking-wider uppercase mt-0.5 ${warnaInfo}`}>
                                    {jamPresensi} • {teksInfo}
                                  </span>
                                )}
                              </div>
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${warnaDot}`}></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

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
                  </>
                ) : (
                  <div className="animate-fade-in max-w-6xl mx-auto">
                    <button onClick={() => setNamaTerpilih(null)} className="text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-8 border-b border-slate-100 pb-4 w-full">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                      Kembali ke Daftar Individu
                    </button>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-8">{namaTerpilih}</h1>
                    
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
                                  <th className="px-6 py-4 text-center">Log Status</th>
                                  <th className="px-6 py-4 text-center">Time Compliance</th>
                                  <th className="px-6 py-4 text-center">Map & Visual / Keterangan</th>
                                  <th className="px-6 py-4 text-center">Control</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {rekapDetailPerHari[tanggal].map((row) => {
                                  const waktu = new Date(row.waktu_absen);
                                  const statusKehadiran = kalkulasiStatusWaktu(row.waktu_absen, row.jenis_absen);
                                  const labelUi = renderVisualLabel(row.jenis_absen);
                                  const isManual = row.foto_url?.startsWith("KET: ");

                                  return (
                                    <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors group ${isManual ? 'bg-slate-50/30' : ''}`}>
                                      <td className="px-6 py-5 font-semibold text-slate-700">
                                        {waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                      </td>
                                      <td className="px-6 py-5 text-center">
                                        <span className={`inline-block px-3 py-1 rounded text-[10px] font-extrabold border uppercase tracking-wider ${labelUi.warna}`}>
                                          {labelUi.teks}
                                        </span>
                                      </td>
                                      <td className="px-6 py-5 text-center">
                                        <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase ${renderVisualStatus(statusKehadiran)}`}>
                                          {statusKehadiran}
                                        </span>
                                      </td>
                                      
                                      <td className="px-6 py-5 text-center">
                                        {isManual ? (
                                          <span className="text-xs font-semibold text-slate-500 italic whitespace-pre-wrap">
                                            {row.foto_url.replace("KET: ", "")}
                                          </span>
                                        ) : (
                                          <div className="flex justify-center gap-3 items-center">
                                            <button onClick={() => setPetaLightbox({ lat: row.latitude, lng: row.longitude })} className="text-blue-600 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all">Map</button>
                                            <img src={row.foto_url} alt="Bukti" className="w-8 h-8 object-cover rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:scale-110 transition-all" onClick={() => setFotoLightbox(row.foto_url)} />
                                          </div>
                                        )}
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
                            <p className="text-xs text-slate-500 font-medium mt-6">Merekam <span className="font-bold">{dataHarian[tgl].length}</span> personel</p>
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
                            <th className="px-6 py-4 text-center">Waktu & Tipe Log</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-center">Map & Visual / Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {rekapTanggalDetail.map((row) => {
                            const waktu = new Date(row.waktu_absen);
                            const statusKehadiran = kalkulasiStatusWaktu(row.waktu_absen, row.jenis_absen);
                            const labelUi = renderVisualLabel(row.jenis_absen);
                            const isManual = row.foto_url?.startsWith("KET: ");

                            return (
                              <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors group ${isManual ? 'bg-slate-50/30' : ''}`}>
                                <td className="px-6 py-5 font-bold text-slate-700">{row.nama_peserta}</td>
                                <td className="px-6 py-5 text-center">
                                  <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase ${row.peran === 'ASISTEN' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{row.peran}</span>
                                </td>
                                <td className="px-6 py-5 text-center font-semibold text-slate-600">
                                  {waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB 
                                  <span className={`ml-2 text-[10px] border px-2 py-0.5 rounded font-bold ${labelUi.warna}`}>{labelUi.teks}</span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase ${renderVisualStatus(statusKehadiran)}`}>{statusKehadiran}</span>
                                </td>
                                
                                <td className="px-6 py-5 text-center">
                                  {isManual ? (
                                    <span className="text-xs font-semibold text-slate-500 italic whitespace-pre-wrap">
                                      {row.foto_url.replace("KET: ", "")}
                                    </span>
                                  ) : (
                                    <div className="flex justify-center gap-3 items-center">
                                      <button onClick={() => setPetaLightbox({ lat: row.latitude, lng: row.longitude })} className="text-blue-600 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all">Map</button>
                                      <img src={row.foto_url} alt="Foto" className="w-8 h-8 object-cover rounded-lg shadow-sm border cursor-pointer hover:scale-110 transition-all" onClick={() => setFotoLightbox(row.foto_url)} />
                                    </div>
                                  )}
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

            {/* ========================================= MENU 3: TUGAS & PENGUMPULAN ========================================= */}
            {menuUtama === 'TUGAS' && (
              <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORM PEMBUATAN TUGAS */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 sticky top-28">
                    <h2 className="text-lg font-extrabold text-slate-900 mb-1">Publish Task</h2>
                    <p className="text-xs text-slate-400 font-medium mb-6">Create project or report assignments for interns.</p>
                    
                    <form onSubmit={tambahTugasDB} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Task Title</label>
                        <input type="text" value={inputNamaTugas} onChange={(e) => setInputNamaTugas(e.target.value)} required placeholder="e.g., Weekly Project Report..." className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target Deadline</label>
                        <input type="datetime-local" value={inputDeadlineTugas} onChange={(e) => setInputDeadlineTugas(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Instructions / Notes</label>
                        <textarea value={inputKeteranganTugas} onChange={(e) => setInputKeteranganTugas(e.target.value)} rows={3} placeholder="File format guidelines..." className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900 resize-none" />
                      </div>
                      <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-sm transition-all shadow-md mt-2">Publish Task</button>
                    </form>
                  </div>
                </div>

                {/* MONITOR PANEL SUBMISSION & PEMBARUAN EDIT */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h2 className="text-base font-extrabold text-slate-900">Active Task Board</h2>
                      <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">{dataTugas.length} Tasks</span>
                    </div>

                    {dataTugas.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 italic">No tasks have been published yet.</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {dataTugas.map((t) => {
                          const cdown = kalkulasiSisaWaktuTugas(t.deadline, t.is_closed);
                          const isSelected = tugasTerpilih === t.id;
                          const kumpulFilter = dataPengumpulan.filter(p => p.tugas_id === t.id);
                          
                          // Hitung Berapa yang On-Time dan Overdue
                          const totalKumpul = kumpulFilter.length;
                          const onTimeCount = kumpulFilter.filter(p => p.status_waktu === 'Tepat Waktu' || p.status_waktu === 'On-Time').length;
                          const overdueCount = totalKumpul - onTimeCount;

                          return (
                            <div key={t.id} className={`p-6 transition-all ${isSelected ? 'bg-purple-50/10' : 'hover:bg-slate-50/40'} ${t.is_closed ? 'opacity-80 grayscale-[20%]' : ''}`}>
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <h3 className="font-bold text-slate-900 text-base">{t.nama_tugas}</h3>
                                    <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider uppercase border ${cdown.kelasCss}`}>
                                      {cdown.teks}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1.5 font-medium">Deadline Matrix: {new Date(t.deadline).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB</p>
                                </div>
                                
                                <div className="flex gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                                  {/* TOMBOL KUNCI/BUKA TUGAS */}
                                  <button onClick={() => toggleCloseTugas(t)} className={`border p-2 rounded-xl transition-all shadow-sm ${t.is_closed ? 'text-amber-500 hover:bg-amber-50 border-amber-200 bg-amber-50/30' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border-slate-100 bg-white'}`} title={t.is_closed ? "Buka Pengumpulan" : "Tutup Pengumpulan"}>
                                    {t.is_closed ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 11V7a4 4 0 118 0v4M5 21h14a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                                    )}
                                  </button>

                                  <button onClick={() => bukaModalEditTugas(t)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 p-2 rounded-xl transition-all shadow-sm bg-white" title="Modify Task Constraints">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                  </button>
                                  <button onClick={() => hapusTugasDB(t.id)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 p-2 rounded-xl transition-all shadow-sm bg-white" title="Terminate Task Matrix">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                  </button>
                                  <button onClick={() => setTugasTerpilih(isSelected ? null : t.id)} className={`px-4 py-2 rounded-xl text-xs font-bold border shadow-sm transition-all ${isSelected ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}>
                                    {isSelected ? 'Close Stream' : 'Track Submissions'}
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-4 text-xs font-semibold text-slate-500">
                                <div className="bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                                  📊 Tracker: <span className="font-extrabold text-slate-800">{totalKumpul} Submitted</span> ({onTimeCount} On-Time / <span className={overdueCount > 0 ? 'text-rose-600 font-bold' : ''}>{overdueCount} Overdue</span>)
                                </div>
                                <div className="truncate max-w-sm font-medium text-slate-400"><span className="font-bold text-slate-500">Note:</span> {t.keterangan_tugas}</div>
                              </div>

                              {/* PANEL EXPANDED SUBMISSIONS TUGAS */}
                              {isSelected && (
                                <div className="mt-6 pt-6 border-t border-purple-100 animate-fade-in">
                                  <h4 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider mb-3">Participant Submission Logs</h4>

                                  {kumpulFilter.length === 0 ? (
                                    <div className="p-6 text-center text-xs font-medium text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">No submissions uploaded for this ledger yet.</div>
                                  ) : (
                                    <div className="border border-purple-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                      <table className="w-full text-xs text-left">
                                        <thead className="bg-purple-50/40 text-[10px] font-bold uppercase tracking-wider text-purple-700 border-b border-purple-100">
                                          <tr>
                                            <th className="px-4 py-3">Student Name / Group</th>
                                            <th className="px-4 py-3 text-center">Upload Timestamp</th>
                                            <th className="px-4 py-3 text-center">Compliance</th>
                                            <th className="px-4 py-3 text-right">Action Gate</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-purple-50">
                                          {kumpulFilter.map((sub) => {
                                            const isOnTime = sub.status_waktu === 'Tepat Waktu' || sub.status_waktu === 'On-Time';
                                            return (
                                              <tr key={sub.id} className="hover:bg-purple-50/10 transition-colors">
                                                <td className="px-4 py-3.5 font-bold text-slate-800">{sub.nama_peserta}</td>
                                                <td className="px-4 py-3 text-center text-slate-500 font-semibold">
                                                  {new Date(sub.waktu_pengumpulan).toLocaleString('id-ID', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                  <span className={`px-2 py-0.5 rounded font-extrabold uppercase text-[9px] ${isOnTime ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {isOnTime ? 'On Time' : 'Overdue'}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                  <div className="flex items-center justify-end gap-2">
                                                    <a href={sub.link_tautan} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 font-bold bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded shadow-sm border border-purple-100 transition-all">Open Document</a>
                                                    <button onClick={() => deleteSubmissionLog(sub.id)} className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg transition-colors">
                                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================= MENU 4: MANAJEMEN PERSONEL ========================================= */}
            {menuUtama === 'PERSONEL' && (
              <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-8">
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

      {/* ================= MODAL INJECT LOG MANUAL (AUTOCOMPLETE + DATETIME) ================= */}
      {isTambahManual && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100 relative">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1">Inject Log Manual</h3>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-6">Penambahan Absen Izin / Sakit / Alpha / Masuk</p>
            
            <form onSubmit={simpanLogManual} className="flex flex-col gap-5">
              
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cari Nama Personel</label>
                <input 
                  type="text" 
                  value={manualNama} 
                  onChange={handleKetikNamaManual}
                  onFocus={() => manualNama && setTampilkanSaranManual(true)}
                  required 
                  placeholder="Ketik inisial nama..." 
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                />
                {tampilkanSaranManual && rekomendasiManual.length > 0 && (
                  <div className="absolute left-0 right-0 top-full bg-white border border-slate-100 rounded-xl shadow-xl mt-2 z-50 max-h-48 overflow-y-auto overflow-hidden">
                    {rekomendasiManual.map((namaSaran) => (
                      <div
                        key={namaSaran}
                        onClick={() => pilihNamaManual(namaSaran)}
                        className="p-3.5 hover:bg-slate-50 text-slate-800 text-sm cursor-pointer border-b border-slate-50 last:border-none transition-colors"
                      >
                        {namaSaran}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pilih Waktu (Tgl & Jam)</label>
                  <input type="datetime-local" value={manualWaktu} onChange={(e) => setManualWaktu(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold text-black" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipe Log</label>
                  <select value={manualStatus} onChange={(e) => setManualStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold text-black">
                    <option value="MASUK">Hadir Pagi (Manual)</option>
                    <option value="SIANG">Hadir Siang (Manual)</option>
                    <option value="IZIN">Izin Resmi</option>
                    <option value="SAKIT">Sakit</option>
                    <option value="ALPHA">Alpha</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Keterangan Khusus</label>
                <textarea 
                  value={manualKeterangan} 
                  onChange={(e) => setManualKeterangan(e.target.value)} 
                  required 
                  rows={2}
                  placeholder="Contoh: Mengikuti acara keluarga, lupa absen web..." 
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" 
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setIsTambahManual(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-sm transition-all">Batal</button>
                <button type="submit" className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all">Submit Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT MATRIX ABSENSI */}
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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Log Classification</label>
                <select value={editJenis} onChange={(e) => handleJenisChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold text-black">
                  <option value="MASUK">Morning Shift (Pagi)</option>
                  <option value="SIANG">Afternoon Shift (Siang)</option>
                  <option value="IZIN">Izin Resmi</option>
                  <option value="SAKIT">Sakit</option>
                  <option value="ALPHA">Alpha</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exact Time</label>
                <input type="time" value={editTime} onChange={(e) => handleTimeChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold text-black" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Compliance Status</label>
                <input type="text" value={editStatus} readOnly className="w-full bg-slate-100 border border-slate-200 p-3.5 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed" />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-sm">Dismiss</button>
                <button onClick={simpanPerubahanEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm">Commit Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA PENUGASAN (BARU) */}
      {isEditingTugas && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100 relative">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1">Modify Assignment Constraints</h3>
            <p className="text-xs text-slate-400 font-medium uppercase mt-1">Update task properties dynamically</p>
            
            <form onSubmit={simpanPerubahanEditTugas} className="flex flex-col gap-5 mt-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Task Title</label>
                <input type="text" value={editNamaTugas} onChange={(e) => setEditNamaTugas(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Adjust Deadline</label>
                <input type="datetime-local" value={editDeadlineTugas} onChange={(e) => setEditDeadlineTugas(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold text-black" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Instructions / Criteria</label>
                <textarea value={editKeteranganTugas} onChange={(e) => setEditKeteranganTugas(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none" />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setIsEditingTugas(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-sm">Dismiss</button>
                <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md">Apply Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX FOTO */}
      {fotoLightbox && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setFotoLightbox(null)}>
          <div className="relative max-w-3xl w-full flex justify-center items-center">
            <img src={fotoLightbox} alt="Foto Diperbesar" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/20" onClick={(e) => e.stopPropagation()} />
            <button className="absolute -top-4 -right-4 bg-slate-900 text-white w-10 h-10 rounded-full font-bold shadow-lg hover:bg-black border border-slate-700 transition-all flex items-center justify-center" onClick={() => setFotoLightbox(null)}>✕</button>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX PETA */}
      {petaLightbox && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setPetaLightbox(null)}>
          <div className="relative w-full max-w-3xl bg-white p-2 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button className="absolute -top-4 -right-4 bg-rose-600 text-white w-10 h-10 rounded-full font-bold shadow-lg hover:bg-rose-700 border-2 border-white transition-all flex items-center justify-center z-10" onClick={() => setPetaLightbox(null)}>✕</button>
            <div className="w-full rounded-xl overflow-hidden h-[60vh] bg-slate-100 flex items-center justify-center relative">
              <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={`https://maps.google.com/maps?q=${petaLightbox.lat},${petaLightbox.lng}&z=16&output=embed`}></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}