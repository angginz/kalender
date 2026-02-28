import { Metadata } from 'next';
import CustomCalendar from '@/components/CustomCalendar';
import TopNav from '@/components/TopNav';

export const metadata: Metadata = {
  title: 'Kalender Indonesia - Hari Libur Nasional & Event',
  description: 'Kalender lengkap Indonesia dengan hari libur nasional, event penting, dan reminder. Lihat tanggal merah dan jadwal event tahun ini.',
  keywords: 'kalender indonesia, hari libur, tanggal merah, libur nasional, event indonesia',
  openGraph: {
    title: 'Kalender Indonesia',
    description: 'Kalender lengkap Indonesia dengan hari libur nasional',
    type: 'website',
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <TopNav />
        <CustomCalendar />
      </div>
    </div>
  );
}
