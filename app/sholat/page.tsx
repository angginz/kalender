'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import TopNav from '@/components/TopNav';
import dayjs from 'dayjs';
import { locationService, type DetectedRegion, type LocationData } from '@/lib/location-service';
import { useTheme } from '@/lib/theme-context';

interface PrayerTime {
  name: string;
  time: string;
  isNext: boolean;
  isPassed: boolean;
}

interface DailyPrayerSchedule {
  tanggal: number;
  tanggal_lengkap: string;
  hari: string;
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface LocationCacheData {
  savedAt: number;
  locationData: LocationData;
  detectedRegion: DetectedRegion;
}

const LOCATION_CACHE_KEY = 'sholat_location_cache_v1';
const LOCATION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

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

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/^kota\s+/, '')
    .replace(/^kabupaten\s+/, '')
    .replace(/^kab\.\s+/, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectAreaType(value: string): 'kota' | 'kabupaten' | 'unknown' {
  const lower = value.toLowerCase().trim();
  if (lower.startsWith('kota ')) return 'kota';
  if (lower.startsWith('kabupaten ') || lower.startsWith('kab. ')) return 'kabupaten';
  return 'unknown';
}

function findBestCityMatch(cities: string[], target: string): string | null {
  const normalizedTarget = normalizeText(target);
  const targetType = detectAreaType(target);
  const sameTypeCities =
    targetType === 'unknown' ? cities : cities.filter((city) => detectAreaType(city) === targetType);
  const candidatePool = sameTypeCities.length > 0 ? sameTypeCities : cities;

  const exact = candidatePool.find((city) => normalizeText(city) === normalizedTarget);
  if (exact) return exact;

  const partial = candidatePool.find((city) => {
    const normalizedCity = normalizeText(city);
    return normalizedCity.includes(normalizedTarget) || normalizedTarget.includes(normalizedCity);
  });

  return partial ?? candidatePool[0] ?? null;
}

export default function SholatPage() {
  const { theme } = useTheme();
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [provinceQuery, setProvinceQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [isProvinceDropdownOpen, setIsProvinceDropdownOpen] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [fullSchedule, setFullSchedule] = useState<DailyPrayerSchedule[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [detectedRegion, setDetectedRegion] = useState<DetectedRegion | null>(null);
  const [autoDetectAttempted, setAutoDetectAttempted] = useState(false);
  const [pendingDetectedCity, setPendingDetectedCity] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    'default'
  );
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const notifiedPrayerKeysRef = useRef<Set<string>>(new Set());
  const toastIdRef = useRef(0);
  const provinceBoxRef = useRef<HTMLDivElement | null>(null);
  const cityBoxRef = useRef<HTMLDivElement | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type']) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2800);
  }, []);

  const filteredProvinces = provinces
    .filter((province) => province.toLowerCase().includes(provinceQuery.trim().toLowerCase()))
    .slice(0, 30);

  const filteredCities = cities
    .filter((city) => city.toLowerCase().includes(cityQuery.trim().toLowerCase()))
    .slice(0, 30);

  const readLocationCache = useCallback((): LocationCacheData | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(LOCATION_CACHE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as LocationCacheData;
      if (!parsed?.savedAt || !parsed.locationData || !parsed.detectedRegion) {
        return null;
      }

      const isExpired = Date.now() - parsed.savedAt > LOCATION_CACHE_TTL_MS;
      if (isExpired) {
        window.localStorage.removeItem(LOCATION_CACHE_KEY);
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }, []);

  const saveLocationCache = useCallback((location: LocationData, region: DetectedRegion) => {
    if (typeof window === 'undefined') {
      return;
    }

    const payload: LocationCacheData = {
      savedAt: Date.now(),
      locationData: location,
      detectedRegion: region,
    };

    window.localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(payload));
  }, []);

  const updateNextPrayer = useCallback((prayers: PrayerTime[]) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    let nextPrayerFound = false;

    const updatedPrayers = prayers.map((prayer) => {
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

  const fetchPrayerTimes = useCallback(async () => {
    if (isTransitioning || !selectedProvince || !selectedCity) {
      return;
    }

    if (cities.length > 0 && !cities.includes(selectedCity)) {
      return;
    }

    try {
      setErrorMessage('');
      const data = await locationService.getPrayerTimes(
        selectedProvince,
        selectedCity,
        new Date().getFullYear(),
        selectedMonth
      );

      const today = new Date();
      const isCurrentMonth = selectedMonth === today.getMonth() + 1;

      if (isCurrentMonth) {
        const todaySchedule = data.jadwal.find((j) => j.tanggal === today.getDate());

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
      const message = error instanceof Error ? error.message : 'Gagal memuat jadwal sholat';
      setErrorMessage(message);
    }
  }, [selectedProvince, selectedCity, selectedMonth, cities, isTransitioning, updateNextPrayer]);

  const detectLocationAndSelectCity = useCallback(async () => {
    try {
      setErrorMessage('');

      const currentLocation = await locationService.getCurrentLocation();
      setLocationData(currentLocation);

      const region = await locationService.detectRegionByCoordinates(
        currentLocation.latitude,
        currentLocation.longitude
      );

      setDetectedRegion(region);
      setPendingDetectedCity(region.city);
      setIsTransitioning(true);
      setSelectedProvince(region.province);
      saveLocationCache(currentLocation, region);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mendeteksi lokasi';
      setErrorMessage(message);
    }
  }, [saveLocationCache]);

  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const provincesList = await locationService.getProvinces();
        setProvinces(provincesList);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memuat daftar provinsi';
        setErrorMessage(message);
      }
    };

    loadProvinces();
  }, []);

  useEffect(() => {
    if (provinces.length === 0 || autoDetectAttempted) {
      return;
    }

    setAutoDetectAttempted(true);
    const cachedLocation = readLocationCache();

    if (cachedLocation) {
      setLocationData(cachedLocation.locationData);
      setDetectedRegion(cachedLocation.detectedRegion);
      setPendingDetectedCity(cachedLocation.detectedRegion.city);
      setIsTransitioning(true);
      setSelectedProvince(cachedLocation.detectedRegion.province);
      return;
    }

    detectLocationAndSelectCity();
  }, [provinces, autoDetectAttempted, detectLocationAndSelectCity, readLocationCache]);

  useEffect(() => {
    const loadCities = async () => {
      if (!selectedProvince) {
        setCities([]);
        setSelectedCity('');
        return;
      }

      try {
        const citiesList = await locationService.getCities(selectedProvince);
        setCities(citiesList);

        if (pendingDetectedCity) {
          const autoCity = findBestCityMatch(citiesList, pendingDetectedCity);
          setSelectedCity(autoCity ?? '');
          setPendingDetectedCity('');
        } else {
          setSelectedCity((prev) => (citiesList.includes(prev) ? prev : ''));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memuat daftar kota';
        setErrorMessage(message);
        setCities([]);
        setSelectedCity('');
      } finally {
        setIsTransitioning(false);
      }
    };

    loadCities();
  }, [selectedProvince, pendingDetectedCity]);

  useEffect(() => {
    setProvinceQuery(selectedProvince);
  }, [selectedProvince]);

  useEffect(() => {
    setCityQuery(selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (provinceBoxRef.current && !provinceBoxRef.current.contains(target)) {
        setIsProvinceDropdownOpen(false);
      }
      if (cityBoxRef.current && !cityBoxRef.current.contains(target)) {
        setIsCityDropdownOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    fetchPrayerTimes();
  }, [fetchPrayerTimes]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    setNotificationPermission(Notification.permission);
  }, []);

  const enableNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      showToast('Browser ini tidak mendukung notifikasi.', 'error');
      return;
    }

    if (Notification.permission === 'denied') {
      setNotificationPermission('denied');
      showToast('Notifikasi diblokir browser. Aktifkan manual di pengaturan situs.', 'error');
      return;
    }

    let permission: NotificationPermission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }

    if (permission === 'granted') {
      setIsNotificationEnabled(true);
      showToast('Notifikasi sholat aktif.', 'success');
    } else if (permission === 'default') {
      showToast('Izin notifikasi belum diberikan.', 'info');
    } else {
      showToast('Notifikasi diblokir browser.', 'error');
    }
  }, [showToast]);

  const disableNotifications = useCallback(() => {
    setIsNotificationEnabled(false);
    showToast('Notifikasi sholat nonaktif.', 'info');
  }, [showToast]);

  const toggleNotifications = useCallback(() => {
    if (isNotificationEnabled) {
      disableNotifications();
      return;
    }

    void enableNotifications();
  }, [disableNotifications, enableNotifications, isNotificationEnabled]);

  useEffect(() => {
    if (!isNotificationEnabled || notificationPermission !== 'granted' || prayerTimes.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentHm = `${hh}:${mm}`;
      const dayKey = dayjs(now).format('YYYY-MM-DD');

      notifiedPrayerKeysRef.current = new Set(
        [...notifiedPrayerKeysRef.current].filter((key) => key.startsWith(dayKey))
      );

      prayerTimes.forEach((prayer) => {
        if (prayer.time !== currentHm) {
          return;
        }

        const notifyKey = `${dayKey}-${selectedProvince}-${selectedCity}-${prayer.name}-${prayer.time}`;
        if (notifiedPrayerKeysRef.current.has(notifyKey)) {
          return;
        }

        const title = `Waktu ${prayer.name}`;
        const body = selectedCity && selectedProvince
          ? `Sudah masuk waktu ${prayer.name} di ${selectedCity}, ${selectedProvince} (${prayer.time})`
          : `Sudah masuk waktu ${prayer.name} (${prayer.time})`;

        new Notification(title, {
          body,
          tag: notifyKey,
        });

        notifiedPrayerKeysRef.current.add(notifyKey);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [isNotificationEnabled, notificationPermission, prayerTimes, selectedCity, selectedProvince]);

  useEffect(() => {
    if (!nextPrayer) return;

    const updateTimer = () => {
      const now = new Date();
      const [hours, minutes] = nextPrayer.time.split(':').map(Number);

      const targetTime = new Date();
      targetTime.setHours(hours, minutes, 0, 0);

      if (targetTime < now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      const diff = targetTime.getTime() - now.getTime();
      const hoursRemaining = Math.floor(diff / (1000 * 60 * 60));
      const minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsRemaining = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${hoursRemaining.toString().padStart(2, '0')}:${minutesRemaining
          .toString()
          .padStart(2, '0')}:${secondsRemaining.toString().padStart(2, '0')}`
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

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Jadwal Sholat Indonesia</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleNotifications}
              disabled={notificationPermission === 'unsupported'}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isNotificationEnabled && notificationPermission === 'granted'
                  ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-300'
                  : 'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
              } disabled:opacity-50`}
              title="Toggle notifikasi sholat"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 2a5 5 0 00-5 5v2.6c0 .7-.2 1.3-.6 1.9l-1.1 1.6a1 1 0 00.8 1.5h11.8a1 1 0 00.8-1.5l-1.1-1.6a3.2 3.2 0 01-.6-1.9V7a5 5 0 00-5-5zm-2 13a2 2 0 104 0H8z" />
              </svg>
              <span className="text-sm font-medium">Notifikasi</span>
            </button>

            <button
              onClick={detectLocationAndSelectCity}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Deteksi Ulang Lokasi
            </button>
          </div>
        </div>

        {notificationPermission === 'denied' && (
          <p className="text-sm text-red-600 dark:text-red-400 -mt-4">
            Izin notifikasi diblokir browser. Aktifkan manual di pengaturan situs.
          </p>
        )}

        <div className="fixed top-5 right-5 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`min-w-[240px] max-w-[320px] rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur ${
                toast.type === 'success'
                  ? 'bg-emerald-100/95 border-emerald-300 text-emerald-800'
                  : toast.type === 'error'
                  ? 'bg-red-100/95 border-red-300 text-red-800'
                  : 'bg-sky-100/95 border-sky-300 text-sky-800'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>

        {notificationPermission === 'unsupported' && (
          <p className="text-sm text-gray-600 dark:text-gray-300 -mt-4">
            Browser ini tidak mendukung notifikasi.
          </p>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-300 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Lokasi Aktif</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedCity || detectedRegion?.city || 'Belum terdeteksi'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {selectedProvince || detectedRegion?.province || 'Pilih provinsi/kota untuk melanjutkan'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-300 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-600 dark:text-white">
                <span className="font-medium">Zona Waktu:</span>
                <span>{detectedRegion?.timezone || 'Asia/Jakarta'}</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-600 bg-slate-700 text-white dark:border-slate-500 dark:bg-slate-700 dark:text-white">
                <span className="font-medium">Koordinat:</span>
                <span>
                  {locationData
                    ? `${locationData.latitude.toFixed(5)}, ${locationData.longitude.toFixed(5)}`
                    : 'Belum tersedia'}
                </span>
              </div>
            </div>
          </div>

          {errorMessage && <p className="text-red-600 dark:text-red-400 mt-2 text-sm">{errorMessage}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-300 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pilih Provinsi</label>
            <div ref={provinceBoxRef} className="relative">
              <input
                type="text"
                value={provinceQuery}
                onFocus={() => setIsProvinceDropdownOpen(true)}
                onChange={(e) => {
                  const value = e.target.value;
                  setProvinceQuery(value);
                  setIsProvinceDropdownOpen(true);

                  if (selectedProvince && value !== selectedProvince) {
                    setSelectedProvince('');
                    setSelectedCity('');
                    setCityQuery('');
                    setCities([]);
                    setPendingDetectedCity('');
                  }
                }}
                placeholder="Cari & pilih provinsi..."
                className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-black dark:text-white"
              />

              {isProvinceDropdownOpen && (
                <div className="absolute z-20 mt-2 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-lg">
                  {filteredProvinces.length > 0 ? (
                    filteredProvinces.map((province) => (
                      <button
                        key={province}
                        type="button"
                        onClick={() => {
                          setIsTransitioning(true);
                          setProvinceQuery(province);
                          setSelectedProvince(province);
                          setSelectedCity('');
                          setCityQuery('');
                          setPendingDetectedCity('');
                          setIsProvinceDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-gray-800"
                      >
                        {province}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Provinsi tidak ditemukan</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-300 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pilih Kabupaten/Kota</label>
            <div ref={cityBoxRef} className="relative">
              <input
                type="text"
                value={cityQuery}
                onFocus={() => selectedProvince && setIsCityDropdownOpen(true)}
                onChange={(e) => {
                  const value = e.target.value;
                  setCityQuery(value);
                  if (selectedProvince) {
                    setIsCityDropdownOpen(true);
                  }
                  if (selectedCity && value !== selectedCity) {
                    setSelectedCity('');
                  }
                }}
                placeholder={selectedProvince ? 'Cari & pilih kota/kabupaten...' : 'Pilih provinsi terlebih dahulu'}
                disabled={!selectedProvince}
                className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-black dark:text-white disabled:opacity-60"
              />

              {isCityDropdownOpen && selectedProvince && (
                <div className="absolute z-20 mt-2 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-lg">
                  {filteredCities.length > 0 ? (
                    filteredCities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setCityQuery(city);
                          setSelectedCity(city);
                          setIsCityDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-gray-800"
                      >
                        {city}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Kota/kabupaten tidak ditemukan</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-300 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pilih Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-black dark:text-white"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {nextPrayer ? (
          <div className="countdown-card bg-gradient-to-r from-teal-100 via-blue-100 to-purple-100 dark:from-teal-200 dark:via-blue-200 dark:to-purple-200 rounded-2xl p-6 text-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="countdown-label text-sm text-slate-700">Sholat Berikutnya</p>
                <p className="countdown-main text-3xl font-bold text-teal-800">{nextPrayer.name}</p>
              </div>

              <div className="text-center">
                <p className="countdown-main text-4xl font-mono font-bold text-teal-800">{timeRemaining}</p>
                <p className="countdown-label text-sm text-slate-700 mt-1">Menuju {nextPrayer.time}</p>
              </div>

              <div className="text-right">
                <p className="countdown-label text-sm text-slate-700">Sekarang</p>
                <p className="countdown-time text-2xl font-mono text-slate-900">{dayjs().format('HH.mm.ss')}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300">
            {isTransitioning ? 'Memuat kota...' : 'Pilih provinsi dan kota untuk menampilkan jadwal sholat'}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-black dark:text-white border border-gray-300 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold">Jadwal Sholat Hari Ini</h3>
            {currentDate && (
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full border ${
                  theme === 'dark'
                    ? '!bg-teal-700 !text-white border-teal-300/50'
                    : 'bg-teal-100 text-teal-800 border-teal-200'
                }`}
              >
                {currentDate}
              </span>
            )}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {selectedCity && selectedProvince ? `${selectedCity}, ${selectedProvince}` : '-'}
          </div>

          {prayerTimes.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {prayerTimes.map((prayer) => (
                <div
                  key={prayer.name}
                  className={`p-4 rounded-xl border-2 ${
                    prayer.isNext
                      ? 'bg-orange-100 dark:bg-orange-900/50 border-orange-400 text-orange-600 dark:text-orange-400'
                      : prayer.isPassed
                      ? 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500'
                      : 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-500/30 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  <p className="text-sm mb-2 text-center">{prayer.name}</p>
                  <p className="text-2xl font-bold text-center">{prayer.time}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Data jadwal hari ini belum tersedia.</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-black dark:text-white border border-gray-300 dark:border-gray-800">
          <h3 className="text-xl font-bold mb-4">
            Jadwal Lengkap {months.find((m) => m.value === selectedMonth)?.label} {new Date().getFullYear()}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-800">
                  <th className="p-3 text-left text-sm font-semibold">Tanggal</th>
                  <th className="p-3 text-center text-sm font-semibold">Subuh</th>
                  <th className="p-3 text-center text-sm font-semibold">Dzuhur</th>
                  <th className="p-3 text-center text-sm font-semibold">Ashar</th>
                  <th className="p-3 text-center text-sm font-semibold">Maghrib</th>
                  <th className="p-3 text-center text-sm font-semibold">Isya</th>
                </tr>
              </thead>
              <tbody>
                {fullSchedule.length > 0 ? (
                  fullSchedule.map((day) => (
                    <tr
                      key={day.tanggal}
                      className="border-b border-gray-300 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{day.hari}</span>
                          <span className="text-gray-500 dark:text-gray-400">{day.tanggal}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center text-blue-600 dark:text-blue-400">{day.subuh}</td>
                      <td className="p-3 text-center">{day.dzuhur}</td>
                      <td className="p-3 text-center">{day.ashar}</td>
                      <td className="p-3 text-center">{day.maghrib}</td>
                      <td className="p-3 text-center">{day.isya}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-3 text-center text-gray-500" colSpan={6}>
                      Data jadwal belum tersedia.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
