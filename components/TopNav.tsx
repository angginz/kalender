'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';
import PwaInstallButton from '@/components/PwaInstallButton';

export default function TopNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

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
            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
            : 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}
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
            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/30'
            : 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'}
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

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <span className="text-lg">{theme === 'light' ? '🌙' : '☀️'}</span>
        <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
      </button>

      <PwaInstallButton />
    </div>
  );
}
