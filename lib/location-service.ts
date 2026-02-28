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

class LocationService {
  private baseUrl = 'https://equran.id/api/v2';

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
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }

  async getProvinces(): Promise<string[]> {
    try {
      console.log('Fetching provinces from:', `${this.baseUrl}/shalat/provinsi`);
      const response = await fetch(`${this.baseUrl}/shalat/provinsi`);

      console.log('Provinces response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Provinces error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ProvinceData = await response.json();
      console.log('Provinces data received:', data);
      return data.data;
    } catch (error) {
      console.error('Error fetching provinces:', error);
      // Return fallback provinces immediately
      const fallbackProvinces = [
        'Aceh', 'Bali', 'Banten', 'Bengkulu', 'D.I. Yogyakarta', 'DKI Jakarta',
        'Gorontalo', 'Jambi', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur',
        'Kalimantan Barat', 'Kalimantan Selatan', 'Kalimantan Tengah', 'Kalimantan Timur',
        'Kalimantan Utara', 'Kepulauan Bangka Belitung', 'Kepulauan Riau', 'Lampung',
        'Maluku', 'Maluku Utara', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
        'Papua', 'Papua Barat', 'Riau', 'Sulawesi Barat', 'Sulawesi Selatan',
        'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara', 'Sumatera Barat',
        'Sumatera Selatan', 'Sumatera Utara'
      ];
      console.log('Using fallback provinces:', fallbackProvinces);
      return fallbackProvinces;
    }
  }

  async getCities(province: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/shalat/kabkota`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provinsi: province,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CityData = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching cities:', error);
      throw error;
    }
  }

  async getPrayerTimes(province: string, city: string, year?: number, month?: number): Promise<PrayerTimesData['data']> {
    try {
      const currentYear = year || 2026; // Default to 2026 as per API documentation
      const currentMonth = month || new Date().getMonth() + 1; // JS months are 0-based

      // Validasi input
      if (!province || !city) {
        throw new Error('Province and city are required');
      }

      const requestBody = {
        provinsi: province,
        kabkota: city,
        tahun: currentYear,
        bulan: currentMonth,
      };

      console.log('Fetching prayer times with body:', requestBody);
      console.log('URL:', `${this.baseUrl}/shalat`);

      const response = await fetch(`${this.baseUrl}/shalat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        // Parsing error message untuk memberikan error yang lebih jelas
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            throw new Error(`API Error: ${errorData.message}`);
          }
        } catch {
          // Kalau tidak bisa parse, gunakan error asli
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PrayerTimesData = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching prayer times:', error);
      throw error;
    }
  }

  // Method untuk mendapatkan jadwal sholat berdasarkan koordinat GPS
  async getPrayerTimesByLocation(latitude: number, longitude: number, year?: number, month?: number): Promise<PrayerTimesData['data']> {
    try {
      // Gunakan Bogor sebagai default karena sudah teruji dari dokumentasi API
      const defaultProvince = 'Jawa Barat';
      const defaultCity = 'Kota Bogor';

      console.log(`GPS Location: ${latitude}, ${longitude} - Using default: ${defaultProvince}, ${defaultCity}`);

      return await this.getPrayerTimes(defaultProvince, defaultCity, year, month);
    } catch (error) {
      console.error('Error fetching prayer times by location:', error);
      // Fallback ke Jakarta jika Bogor gagal
      try {
        console.log('Trying fallback to Jakarta...');
        return await this.getPrayerTimes('DKI Jakarta', 'Kota Jakarta', year, month);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
  }

  // Function to find nearest city based on coordinates
  // This is a simplified version - in production, you might want to use a reverse geocoding service
  async findNearestCity(latitude: number, longitude: number): Promise<{ province: string; city: string }> {
    try {
      // Get all provinces first
      const provinces = await this.getProvinces();

      // For simplicity, we'll use Jakarta as default and let user choose
      // In a real implementation, you would use reverse geocoding or coordinate matching
      const defaultProvince = 'DKI Jakarta';
      const cities = await this.getCities(defaultProvince);

      // Return first city as default (user can change later)
      return {
        province: defaultProvince,
        city: cities[0] || 'Kota Jakarta Pusat',
      };
    } catch (error) {
      console.error('Error finding nearest city:', error);
      // Fallback to Jakarta
      return {
        province: 'DKI Jakarta',
        city: 'Kota Jakarta Pusat',
      };
    }
  }
}

export const locationService = new LocationService();
