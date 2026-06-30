import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-blue-200">
      
      {/* Latar Belakang & Overlay Gelap */}
      <div className="absolute inset-0 bg-[url('/bg-plts.jpg')] bg-cover bg-center bg-no-repeat bg-fixed z-0"></div>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-0"></div>

      {/* Konten Utama - Diperlebar menjadi max-w-5xl agar muat 3 kartu */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl">
        <div className="flex flex-col items-center mb-10 md:mb-16 animate-fade-in text-center px-4">
          <img 
            src="/logo-plts.png" 
            alt="Logo UPT PLTS ITERA" 
            className="h-16 sm:h-20 md:h-24 object-contain mb-4 sm:mb-6 drop-shadow-lg"
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight">
            Portal Absensi & Penugasan PLTS ITERA
          </h1>
          <p className="mt-2 sm:mt-3 text-gray-300 font-medium tracking-widest uppercase text-[10px] sm:text-xs md:text-sm">
            Laboratorium UPT PLTS ITERA
          </p>
        </div>

        {/* Kartu Pilihan - Diubah menjadi Grid 3 Kolom */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full px-2 sm:px-0">
          
          <Link 
            href="/absen?jalur=peserta" 
            className="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-xl border border-white/20 hover:-translate-y-1 transition-transform duration-300 group cursor-pointer flex flex-col"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-9-5m9 5l9-5"></path></svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Presensi Peserta KP</h2>
            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed flex-grow">
              Akses gerbang presensi harian khusus untuk mahasiswa Kerja Praktik dan Magang.
            </p>
          </Link>

          <Link 
            href="/absen?jalur=asisten" 
            className="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-xl border border-white/20 hover:-translate-y-1 transition-transform duration-300 group cursor-pointer flex flex-col"
          >
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300 shadow-sm shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Presensi Asisten</h2>
            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed flex-grow">
              Akses gerbang presensi khusus untuk jajaran tim Asisten PLTS.
            </p>
          </Link>

          {/* KARTU BARU: PENGUMPULAN TUGAS */}
          <Link 
            href="/tugas" 
            className="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-xl border border-white/20 hover:-translate-y-1 transition-transform duration-300 group cursor-pointer flex flex-col"
          >
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300 shadow-sm shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Pengumpulan Tugas</h2>
            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed flex-grow">
              Portal penyerahan laporan atau tugas khusus yang diinstruksikan oleh Admin.
            </p>
          </Link>

        </div>

        <div className="mt-10 sm:mt-16 text-gray-400 text-[10px] sm:text-xs font-medium drop-shadow-md text-center">
          &copy; {new Date().getFullYear()} Laboratorium PLTS Institut Teknologi Sumatera
        </div>
      </div>
    </div>
  );
}