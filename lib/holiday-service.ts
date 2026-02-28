export interface Holiday {
  date: string;
  name: string;
}

export interface HolidayApiResponse {
  holidays: Holiday[];
}

class HolidayService {
  private baseUrl = 'https://libur.deno.dev/api';
  private cache: Map<string, Holiday[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds

  async getHolidays(year?: number): Promise<Holiday[]> {
    const currentYear = year || new Date().getFullYear();
    const cacheKey = `holidays-${currentYear}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    const cacheTime = this.cacheExpiry.get(cacheKey);
    
    if (cached && cacheTime && Date.now() < cacheTime) {
      return cached;
    }

    try {
      const response = await fetch(`${this.baseUrl}?year=${currentYear}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch holidays: ${response.statusText}`);
      }
      
      const data: Holiday[] = await response.json();
      
      // Cache the results
      this.cache.set(cacheKey, data);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
      
      return data;
    } catch (error) {
      console.error('Error fetching holidays:', error);
      // Return cached data if available, even if expired
      return cached || [];
    }
  }

  async getHolidayByDate(date: string): Promise<Holiday | null> {
    const holidays = await this.getHolidays();
    return holidays.find(holiday => holiday.date === date) || null;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const holidayService = new HolidayService();
