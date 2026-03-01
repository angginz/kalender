export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ProvinceData {
  code: number;
  message: string;
  data: string[];
}

export interface CityData {
  code: number;
  message: string;
  data: string[];
}

export interface PrayerTimesData {
  code: number;
  message: string;
  data: {
    provinsi: string;
    kabkota: string;
    bulan: number;
    tahun: number;
    bulan_nama: string;
    jadwal: Array<{
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
    }>;
  };
}

interface IslamicApiPrayerResponse {
  code: number;
  status: 'success' | 'error';
  message?: string;
  data?: Record<string, unknown>;
}

export interface DetectedRegion {
  province: string;
  city: string;
  timezone?: string;
  source: 'islamicapi' | 'coordinate-fallback';
}

interface CoordinateFallbackCity {
  province: string;
  city: string;
  lat: number;
  lon: number;
}

interface ManualRegionOverride {
  province: string;
  city: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

const COORDINATE_FALLBACK_CITIES: CoordinateFallbackCity[] = [
  { province: 'Jawa Barat', city: 'Kota Bekasi', lat: -6.2383, lon: 106.9756 },
  { province: 'Jawa Barat', city: 'Kab. Bekasi', lat: -6.2416, lon: 107.1485 },
  { province: 'Jawa Barat', city: 'Kota Bogor', lat: -6.595, lon: 106.8166 },
  { province: 'Jawa Barat', city: 'Kota Depok', lat: -6.4025, lon: 106.7942 },
  { province: 'DKI Jakarta', city: 'Kota Jakarta', lat: -6.2088, lon: 106.8456 },
  { province: 'Banten', city: 'Kota Tangerang', lat: -6.1783, lon: 106.6319 },
  { province: 'Jawa Barat', city: 'Kota Bandung', lat: -6.9175, lon: 107.6191 },
  { province: 'Jawa Tengah', city: 'Kota Semarang', lat: -6.9667, lon: 110.4167 },
  { province: 'Jawa Timur', city: 'Kota Surabaya', lat: -7.2575, lon: 112.7521 },
  { province: 'DI Yogyakarta', city: 'Kota Yogyakarta', lat: -7.7956, lon: 110.3695 },
  { province: 'Sumatera Utara', city: 'Kota Medan', lat: 3.5952, lon: 98.6722 },
  { province: 'Sulawesi Selatan', city: 'Kota Makassar', lat: -5.1477, lon: 119.4327 },
  { province: 'Bali', city: 'Kota Denpasar', lat: -8.6500, lon: 115.2167 },
];

const MANUAL_REGION_OVERRIDES: ManualRegionOverride[] = [
  // Area inti Kota Bekasi; tanpa override ini beberapa titik sering tertarik ke Kab. Bekasi.
  { province: 'Jawa Barat', city: 'Kota Bekasi', minLat: -6.40, maxLat: -6.16, minLon: 106.88, maxLon: 107.06 },
];

class LocationService {
  private equranBaseUrl = 'https://equran.id/api/v2';

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  }

  async getProvinces(): Promise<string[]> {
    const response = await fetch(`${this.equranBaseUrl}/shalat/provinsi`);

    if (!response.ok) {
      throw new Error(`Failed to fetch provinces (${response.status})`);
    }

    const data: ProvinceData = await response.json();
    return data.data;
  }

  async getCities(province: string): Promise<string[]> {
    const response = await fetch(`${this.equranBaseUrl}/shalat/kabkota`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provinsi: province,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch cities (${response.status})`);
    }

    const data: CityData = await response.json();
    return data.data;
  }

  async getPrayerTimes(province: string, city: string, year?: number, month?: number): Promise<PrayerTimesData['data']> {
    const currentYear = year ?? new Date().getFullYear();
    const currentMonth = month ?? new Date().getMonth() + 1;

    if (!province || !city) {
      throw new Error('Province and city are required');
    }

    const response = await fetch(`${this.equranBaseUrl}/shalat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provinsi: province,
        kabkota: city,
        tahun: currentYear,
        bulan: currentMonth,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to fetch prayer times (${response.status})`);
    }

    const data: PrayerTimesData = await response.json();
    return data.data;
  }

  async detectRegionByCoordinates(latitude: number, longitude: number): Promise<DetectedRegion> {
    let timezone: string | undefined;

    try {
      const islamicData = await this.fetchIslamicApiData(latitude, longitude);
      timezone = this.readString(islamicData, ['timezone', 'name']) ?? undefined;

      const provinceCandidates = this.extractCandidates(islamicData, [
        ['location', 'province'],
        ['location', 'state'],
        ['location', 'region'],
        ['address', 'state'],
        ['address', 'province'],
      ]);

      const cityCandidates = this.extractCandidates(islamicData, [
        ['location', 'city'],
        ['location', 'district'],
        ['location', 'regency'],
        ['address', 'city'],
        ['address', 'county'],
        ['address', 'municipality'],
      ]);

      if (provinceCandidates.length > 0 || cityCandidates.length > 0) {
        const provinces = await this.getProvinces();
        const matchedProvince = this.findBestMatch(provinces, provinceCandidates);

        if (matchedProvince) {
          const cities = await this.getCities(matchedProvince);
          const matchedCity = this.findBestMatch(cities, cityCandidates);

          if (matchedCity) {
            return {
              province: matchedProvince,
              city: matchedCity,
              timezone,
              source: 'islamicapi',
            };
          }
        }
      }
    } catch {
      // fallback below
    }

    const fallback = await this.findNearestCityFromCoordinates(latitude, longitude);
    return {
      ...fallback,
      timezone,
      source: 'coordinate-fallback',
    };
  }

  private async fetchIslamicApiData(latitude: number, longitude: number): Promise<Record<string, unknown>> {
    const query = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      method: '20',
      school: '1',
    });

    const response = await fetch(`/api/prayer-time?${query.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const payload = (await response.json()) as IslamicApiPrayerResponse;

    if (!response.ok || payload.status !== 'success' || !payload.data) {
      throw new Error(payload.message || `Failed Islamic API request (${response.status})`);
    }

    return payload.data;
  }

  private async findNearestCityFromCoordinates(latitude: number, longitude: number): Promise<{ province: string; city: string }> {
    const manualOverride = MANUAL_REGION_OVERRIDES.find(
      (item) =>
        latitude >= item.minLat &&
        latitude <= item.maxLat &&
        longitude >= item.minLon &&
        longitude <= item.maxLon
    );

    if (manualOverride) {
      return {
        province: manualOverride.province,
        city: manualOverride.city,
      };
    }

    const nearest = COORDINATE_FALLBACK_CITIES.reduce((best, current) => {
      const currentDistance = this.calculateDistance(latitude, longitude, current.lat, current.lon);
      if (!best || currentDistance < best.distance) {
        return { city: current, distance: currentDistance };
      }
      return best;
    }, null as { city: CoordinateFallbackCity; distance: number } | null);

    const fallbackProvince = nearest?.city.province ?? 'DKI Jakarta';
    const fallbackCityKeyword = nearest?.city.city ?? 'Kota Jakarta';

    try {
      const cities = await this.getCities(fallbackProvince);
      const matchedCity = this.findBestMatch(cities, [fallbackCityKeyword]);

      return {
        province: fallbackProvince,
        city: matchedCity ?? cities[0] ?? fallbackCityKeyword,
      };
    } catch {
      return {
        province: fallbackProvince,
        city: fallbackCityKeyword,
      };
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private extractCandidates(data: Record<string, unknown>, paths: string[][]): string[] {
    return paths
      .map((path) => this.readString(data, path))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private readString(data: Record<string, unknown>, path: string[]): string | null {
    let current: unknown = data;

    for (const key of path) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        return null;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return typeof current === 'string' ? current : null;
  }

  private findBestMatch(items: string[], candidates: string[]): string | null {
    if (items.length === 0 || candidates.length === 0) {
      return null;
    }

    const normalizedItems = items.map((item) => ({
      original: item,
      normalized: this.normalizeName(item),
    }));

    for (const candidate of candidates) {
      const normalizedCandidate = this.normalizeName(candidate);
      const exact = normalizedItems.find((item) => item.normalized === normalizedCandidate);
      if (exact) {
        return exact.original;
      }

      const partial = normalizedItems.find(
        (item) => item.normalized.includes(normalizedCandidate) || normalizedCandidate.includes(item.normalized)
      );
      if (partial) {
        return partial.original;
      }
    }

    return null;
  }

  private normalizeName(value: string): string {
    return value
      .toLowerCase()
      .replace(/^provinsi\s+/, '')
      .replace(/^province\s+/, '')
      .replace(/^kota\s+/, '')
      .replace(/^kabupaten\s+/, '')
      .replace(/^kab\.\s+/, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const locationService = new LocationService();
