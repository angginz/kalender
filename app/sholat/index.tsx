import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jadwal Sholat Indonesia - Waktu Sholat Terlengkap',
  description: 'Jadwal sholat lengkap untuk seluruh Indonesia. Cek waktu sholat Subuh, Dzuhur, Ashar, Maghrib, Isya untuk kota Anda hari ini.',
  keywords: 'jadwal sholat, waktu sholat, sholat indonesia, jadwal sholat hari ini',
  openGraph: {
    title: 'Jadwal Sholat Indonesia',
    description: 'Jadwal sholat lengkap untuk seluruh Indonesia',
    type: 'website',
  },
};

export { default } from './page';
