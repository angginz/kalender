# 🇮🇩 Kalender & Jadwal Sholat Indonesia

Aplikasi web modern untuk menampilkan kalender Indonesia dengan hari libur nasional dan jadwal sholat lengkap untuk seluruh kota di Indonesia.

## Demo
[Kunjungi Demo](https://kalender-rho.vercel.app)

## ✨ Fitur

### 📅 Kalender Indonesia
- Tampilan kalender bulanan yang interaktif
- Hari libur nasional dengan penanda khusus
- Informasi detail setiap hari libur
- Navigasi yang mudah antar bulan dan tahun
- Dark/Light mode support

### 🕌 Jadwal Sholat
- Jadwal sholat 5 waktu untuk seluruh Indonesia
- Pilih provinsi dan kota sesuai lokasi Anda
- Countdown timer menuju sholat berikutnya
- Tabel jadwal lengkap per bulan
- Update real-time untuk sholat hari ini

### 🎨 UI/UX
- Responsive design untuk mobile dan desktop
- Smooth loading dengan skeleton components
- Dark mode dengan transisi yang halus
- Interface yang modern dan user-friendly
- Tidak ada flicker saat pergantian data

## 🛠️ Teknologi

- **Frontend**: Next.js 16.1.6 dengan App Router
- **Styling**: Tailwind CSS 4.0
- **State Management**: React Hooks (useState, useEffect, useCallback)
- **Icons**: Lucide React Icons
- **Date Handling**: Day.js
- **API**: 
  - Hari libur: [libur.deno.dev](https://libur.deno.dev/api)
  - Jadwal sholat: [equran.id](https://equran.id/api/v2)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, atau pnpm

### Installation

```bash
# Clone repository
git clone https://github.com/angginz/kalender.git

# Masuk ke directory
cd kalender

# Install dependencies
npm install
# atau
yarn install
# atau
pnpm install
```

### Development

```bash
# Jalankan development server
npm run dev
# atau
yarn dev
# atau
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

### Build untuk Production

```bash
# Build aplikasi
npm run build

# Jalankan production server
npm start
```

## 📁 Struktur Project

```
kalender/
├── app/                    # Next.js App Router
│   ├── globals.css         # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Halaman utama (kalender)
│   └── sholat/           # Halaman jadwal sholat
│       ├── index.tsx        # Metadata
│       └── page.tsx         # UI component
├── components/            # Reusable components
│   ├── CustomCalendar.tsx  # Komponen kalender utama
│   └── TopNav.tsx        # Navigation bar
├── lib/                  # Utility libraries
│   ├── holiday-service.ts  # API untuk hari libur
│   ├── location-service.ts # API untuk lokasi & jadwal sholat
│   └── theme-context.tsx  # Theme management
└── public/               # Static assets
```

## 🔧 Konfigurasi

### Environment Variables
Tidak ada environment variables yang diperlukan untuk development.

### API Configuration
- **Hari Libur API**: `https://libur.deno.dev/api`
- **Jadwal Sholat API**: `https://equran.id/api/v2`

## 📱 Screenshots

### Halaman Kalender
- Tampilan kalender bulanan dengan hari libur
- Navigasi antar bulan yang smooth
- Informasi detail hari libur

### Halaman Jadwal Sholat
- Pemilihan provinsi dan kota
- Countdown timer sholat berikutnya
- Tabel jadwal lengkap per bulan

## 🌐 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify
```bash
# Build
npm run build

# Deploy folder .next
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Kontribusi

Contributions are welcome! 

1. Fork repository
2. Buat branch baru (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📝 TODO

- [ ] Notifikasi sholat
- [ ] Peta lokasi otomatis
- [ ] Widget untuk desktop
- [ ] Support untuk bahasa lain
- [ ] Export jadwal ke PDF
- [ ] Integration dengan calendar apps

## 🐛 Bug Report

Jika menemukan bug, silakan:
1. Check [Issues](https://github.com/angginz/kalender/issues) yang sudah ada
2. Buat issue baru dengan detail:
   - Environment (browser, OS)
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots jika ada

## 📄 License

MIT License - lihat file [LICENSE](LICENSE) untuk detail.

## 👨‍💻 Author

Dibuat dengan ❤️ oleh [angginz](https://github.com/angginz)

## 🙏 Acknowledgments

- [Hari Libur API](https://libur.deno.dev) - Data hari libur nasional
- [eQuran API](https://equran.id) - Data jadwal sholat
- [Next.js](https://nextjs.org) - Framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Day.js](https://day.js.org) - Date manipulation

---

**Jika bermanfaat, jangan lupa kasih ⭐ di GitHub!**