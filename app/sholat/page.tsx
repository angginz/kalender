'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import dayjs from 'dayjs';
import { locationService } from '@/lib/location-service';

interface PrayerTime {
  name: string;
  time: string;
  isNext: boolean;
  isPassed: boolean;
}

export default function SholatPage() {
  const [selectedProvince, setSelectedProvince] = useState<string>(''); // Kosongkan dulu
  const [selectedCity, setSelectedCity] = useState<string>(''); // Kosongkan dulu
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [fullSchedule, setFullSchedule] = useState<any[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false); // Flag untuk mencegah race condition

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  // Load provinces on mount
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const provincesList = await locationService.getProvinces();
        setProvinces(provincesList);
      } catch (error) {
        console.error('Error in loadProvinces useEffect:', error);
        // Error sudah ditangani di service level, tidak perlu fallback lagi
      }
    };
    loadProvinces();
  }, []);

  // Load cities when province changes
  useEffect(() => {
    const loadCities = async () => {
      if (!selectedProvince) return;
      try {
        const citiesList = await locationService.getCities(selectedProvince);
        setCities(citiesList);
        
        // Reset selectedCity saat provinsi berubah
        setSelectedCity('');
        setIsTransitioning(false); // Reset flag setelah cities selesai di-load
      } catch (error) {
        console.error('Error loading cities:', error);
        setCities([]);
        setSelectedCity('');
        setIsTransitioning(false); // Reset flag meskipun error
      }
    };
    loadCities();
  }, [selectedProvince]);

  // Fetch prayer times
  const fetchPrayerTimes = useCallback(async () => {
    // Skip fetch jika sedang transitioning (provinsi baru sedang di-load)
    if (isTransitioning) {
      return;
    }

    // Validasi: pastikan province dan city sudah dipilih
    if (!selectedProvince || !selectedCity) {
      return; // Skip fetch jika belum ada pilihan
    }

    // Validasi tambahan: pastikan selectedCity valid untuk selectedProvince (cek di cities array)
    if (cities.length > 0 && !cities.includes(selectedCity)) {
      return; // Skip fetch jika city tidak valid untuk provinsi saat ini
    }

    try {
      const data = await locationService.getPrayerTimes(selectedProvince, selectedCity, 2026, selectedMonth);
      
      const today = new Date();
      const isCurrentMonth = selectedMonth === today.getMonth() + 1;
      
      if (isCurrentMonth) {
        const todaySchedule = data.jadwal.find(j => j.tanggal === today.getDate());
        
        if (todaySchedule) {
          setCurrentDate(`${todaySchedule.hari}, ${todaySchedule.tanggal} ${data.bulan_nama} ${data.tahun}`);
          
          const prayers: PrayerTime[] = [
            { name: 'Subuh', time: todaySchedule.subuh, isNext: false, isPassed: false },
            { name: 'Dzuhur', time: todaySchedule.dzuhur, isNext: false, isPassed: false },
            { name: 'Ashar', time: todaySchedule.ashar, isNext: false, isPassed: false },
            { name: 'Maghrib', time: todaySchedule.maghrib, isNext: false, isPassed: false },
            { name: 'Isya', time: todaySchedule.isya, isNext: false, isPassed: false },
          ];
          
          setPrayerTimes(prayers);
          updateNextPrayer(prayers);
        }
      }
      
      setFullSchedule(data.jadwal);
    } catch (error) {
      console.error('Error fetching prayer times:', error);
    }
  }, [selectedProvince, selectedCity, selectedMonth, cities, isTransitioning]);

  useEffect(() => {
    fetchPrayerTimes();
  }, [fetchPrayerTimes]);

  // Update next prayer
  const updateNextPrayer = useCallback((prayers: PrayerTime[]) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    let nextPrayerFound = false;
    
    const updatedPrayers = prayers.map(prayer => {
      const [hours, minutes] = prayer.time.split(':').map(Number);
      const prayerTime = hours * 60 + minutes;
      
      const isPassed = currentTime > prayerTime;
      const isNext = !nextPrayerFound && !isPassed;
      
      if (isNext) {
        nextPrayerFound = true;
        setNextPrayer({ ...prayer, isNext: true, isPassed: false });
      }
      
      return { ...prayer, isPassed, isNext };
    });
    
    if (!nextPrayerFound && prayers.length > 0) {
      setNextPrayer({ ...prayers[0], isNext: true, isPassed: false });
    }
    
    setPrayerTimes(updatedPrayers);
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!nextPrayer) return;

    const updateTimer = () => {
      const now = new Date();
      const [hours, minutes] = nextPrayer.time.split(':').map(Number);
      
      let targetTime = new Date();
      targetTime.setHours(hours, minutes, 0, 0);
      
      if (targetTime < now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      const diff = targetTime.getTime() - now.getTime();
      
      const hoursRemaining = Math.floor(diff / (1000 * 60 * 60));
      const minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsRemaining = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining(
        `${hoursRemaining.toString().padStart(2, '0')}:${minutesRemaining.toString().padStart(2, '0')}:${secondsRemaining.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [nextPrayer]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <TopNav />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Jadwal Sholat Indonesia</h1>
          </div>
        </div>

        {/* Location Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Instruction message */}
          {!selectedProvince && (
            <div className="col-span-3 bg-blue-900/20 border border-blue-700 rounded p-4 text-blue-300">
              <p className="text-center">📍 Silakan pilih provinsi terlebih dahulu untuk melihat jadwal sholat</p>
            </div>
          )}

          {selectedProvince && !selectedCity && (
            <div className="col-span-3 bg-blue-900/20 border border-blue-700 rounded p-4 text-blue-300">
              <p className="text-center">🏙️ Silakan pilih kota/kabupaten untuk melihat jadwal sholat</p>
            </div>
          )}
          
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Pilih Provinsi
            </label>
            <p className="text-xs text-gray-500 mb-2">Pilih provinsi tempat tinggal Anda</p>
            <select
              value={selectedProvince}
              onChange={(e) => {
                setIsTransitioning(true); // Set flag transitioning
                setSelectedProvince(e.target.value);
              }}
              className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Pilih Provinsi --</option>
              {provinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Pilih Kabupaten/Kota
            </label>
            <p className="text-xs text-gray-500 mb-2">Pilih kabupaten atau kota</p>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Pilih Kota --</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Pilih Bulan
            </label>
            <p className="text-xs text-gray-500 mb-2">Pilih bulan yang ingin dilihat</p>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Countdown Card */}
        {isTransitioning ? (
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-700 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                  <div className="h-8 bg-gray-700 rounded w-24"></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="h-10 bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-24"></div>
              </div>
              
              <div className="text-right">
                <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-24"></div>
              </div>
            </div>
          </div>
        ) : nextPrayer ? (
          <div className="bg-gradient-to-r from-teal-900 via-blue-900 to-purple-900 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-300">Sholat Berikutnya</p>
                  <p className="text-3xl font-bold text-teal-400">{nextPrayer.name}</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-4xl font-mono font-bold text-teal-400">{timeRemaining}</p>
                <p className="text-sm text-gray-400 mt-1">Menuju {nextPrayer.time}</p>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-400">Sekarang</p>
                <p className="text-2xl font-mono">{dayjs().format('HH.mm.ss')}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-700 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                  <div className="h-8 bg-gray-700 rounded w-24"></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="h-10 bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-24"></div>
              </div>
              
              <div className="text-right">
                <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-24"></div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Prayer Schedule */}
        <div className="bg-gray-900 rounded-2xl p-6 text-white border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold">Jadwal Sholat Hari Ini</h3>
              {currentDate && !isTransitioning && (
                <span className="px-3 py-1 bg-teal-500/20 text-teal-400 text-sm rounded-full">
                  {currentDate}
                </span>
              )}
              {isTransitioning && (
                <div className="h-6 bg-gray-700 rounded w-32 animate-pulse"></div>
              )}
            </div>
          </div>
          
          <div className="text-sm text-gray-400 mb-6">
            {isTransitioning ? (
              <div className="h-4 bg-gray-700 rounded w-48 animate-pulse"></div>
            ) : (
              `${selectedCity}, ${selectedProvince}`
            )}
          </div>
          
          {isTransitioning ? (
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-5 rounded-xl border-2 border-gray-700 bg-gray-800 animate-pulse">
                  <div className="text-center">
                    <div className="h-4 bg-gray-700 rounded mb-2 w-12 mx-auto"></div>
                    <div className="h-6 bg-gray-700 rounded w-16 mx-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : prayerTimes.length > 0 ? (
            <div className="grid grid-cols-5 gap-4">
              {prayerTimes.map((prayer) => (
                <div
                  key={prayer.name}
                  className={`p-5 rounded-xl border-2 transition-all ${
                    prayer.isNext
                      ? 'bg-orange-900/50 border-orange-500 text-orange-400 shadow-lg shadow-orange-500/20'
                      : prayer.isPassed
                      ? 'bg-gray-800 border-gray-700 text-gray-500'
                      : 'bg-blue-900/30 border-blue-500/30 text-blue-400'
                  }`}
                >
                  <div className="text-center">
                    {prayer.isNext && (
                      <div className="flex justify-center mb-2">
                        <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                    )}
                    <p className="text-sm mb-2">{prayer.name}</p>
                    <p className={`text-2xl font-bold ${
                      prayer.isNext ? 'text-orange-400' : prayer.isPassed ? 'text-gray-500' : 'text-blue-400'
                    }`}>
                      {prayer.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-5 rounded-xl border-2 border-gray-700 bg-gray-800 animate-pulse">
                  <div className="text-center">
                    <div className="h-4 bg-gray-700 rounded mb-2 w-12 mx-auto"></div>
                    <div className="h-6 bg-gray-700 rounded w-16 mx-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full Month Schedule Table */}
        <div className="bg-gray-900 rounded-2xl p-6 text-white border border-gray-800">
          <h3 className="text-xl font-bold mb-4">
            {isTransitioning ? (
              <div className="h-6 bg-gray-700 rounded w-48 animate-pulse"></div>
            ) : (
              `Jadwal Lengkap ${months.find(m => m.value === selectedMonth)?.label} 2026`
            )}
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800">
                  <th className="p-3 text-left text-sm font-semibold">Tanggal</th>
                  <th className="p-3 text-center text-sm font-semibold">Subuh</th>
                  <th className="p-3 text-center text-sm font-semibold">Dzuhur</th>
                  <th className="p-3 text-center text-sm font-semibold">Ashar</th>
                  <th className="p-3 text-center text-sm font-semibold">Maghrib</th>
                  <th className="p-3 text-center text-sm font-semibold">Isya</th>
                </tr>
              </thead>
              <tbody>
                {isTransitioning ? (
                  // Skeleton rows saat transitioning
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
                          <div className="h-4 bg-gray-700 rounded w-8 animate-pulse"></div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="h-4 bg-gray-700 rounded w-12 mx-auto animate-pulse"></div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="h-4 bg-gray-700 rounded w-12 mx-auto animate-pulse"></div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="h-4 bg-gray-700 rounded w-12 mx-auto animate-pulse"></div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="h-4 bg-gray-700 rounded w-12 mx-auto animate-pulse"></div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="h-4 bg-gray-700 rounded w-12 mx-auto animate-pulse"></div>
                      </td>
                    </tr>
                  ))
                ) : fullSchedule.length > 0 ? (
                  fullSchedule.map((day) => (
                    <tr key={day.tanggal} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{day.hari}</span>
                          <span className="text-gray-400">{day.tanggal}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center text-blue-400">{day.subuh}</td>
                      <td className="p-3 text-center">{day.dzuhur}</td>
                      <td className="p-3 text-center">{day.ashar}</td>
                      <td className="p-3 text-center">{day.maghrib}</td>
                      <td className="p-3 text-center">{day.isya}</td>
                    </tr>
                  ))
                ) : (
                  // Skeleton rows saat data kosong
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-4 bg-gray-700 rounded w-16"></div>
                          <div className="h-4 bg-gray-700 rounded w-8"></div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="h-4 bg-gray-700 rounded w-12 mx-auto"></div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="h-4 bg-gray-700 rounded w-12 mx-auto"></div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="h-4 bg-gray-700 rounded w-12 mx-auto"></div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="h-4 bg-gray-700 rounded w-12 mx-auto"></div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="h-4 bg-gray-700 rounded w-12 mx-auto"></div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
