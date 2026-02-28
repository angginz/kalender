'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();

  const isCalendar = pathname === '/';
  const isSholat = pathname.startsWith('/sholat');

  return (
    <div className="flex items-center gap-4 mb-6">
      {/* Kalender pill */}
      <Link
        href="/"
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all
          ${isCalendar
            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white border-emerald-300 shadow-md shadow-emerald-500/30'
            : 'bg-transparent text-emerald-300 border-emerald-500/60 hover:bg-emerald-500/10'}
        `}
      >
        <span className="text-lg">📅</span>
        <span>Kalender</span>
        {!isCalendar && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500 text-white font-bold">
            NEW
          </span>
        )}
      </Link>

      {/* Jadwal Sholat pill */}
      <Link
        href="/sholat"
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all
          ${isSholat
            ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white border-fuchsia-300 shadow-md shadow-fuchsia-500/30'
            : 'bg-transparent text-fuchsia-300 border-fuchsia-500/60 hover:bg-fuchsia-500/10'}
        `}
      >
        <span className="text-lg">🕒</span>
        <span>Jadwal Sholat</span>
        {!isSholat && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500 text-white font-bold">
            NEW
          </span>
        )}
      </Link>
    </div>
  );
}
