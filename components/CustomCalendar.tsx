'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { holidayService, Holiday } from '@/lib/holiday-service';
import { useTheme } from '@/lib/theme-context';
import Link from 'next/link';

export default function CustomCalendar() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const { theme } = useTheme();

  useEffect(() => {
    dayjs.locale('id');
    loadHolidays(currentDate.year());
  }, [currentDate.year()]);

  const loadHolidays = async (year: number) => {
    try {
      setLoading(true);
      const holidayData = await holidayService.getHolidays(year);
      setHolidays(holidayData);
    } catch (error) {
      console.error('Error loading holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');

    // Pastikan grid kalender selalu dimulai dari Minggu (day() === 0)
    let startOfWeek = startOfMonth;
    while (startOfWeek.day() !== 0) {
      startOfWeek = startOfWeek.subtract(1, 'day');
    }

    // Dan berakhir di Sabtu (day() === 6) setelah akhir bulan
    let endOfWeek = endOfMonth;
    while (endOfWeek.day() !== 6) {
      endOfWeek = endOfWeek.add(1, 'day');
    }

    const days: dayjs.Dayjs[] = [];
    let day = startOfWeek;

    while (day.isBefore(endOfWeek) || day.isSame(endOfWeek)) {
      days.push(day);
      day = day.add(1, 'day');
    }

    return days;
  };

  const getHolidayForDate = (date: dayjs.Dayjs) => {
    return holidays.find((holiday: Holiday) => holiday.date === date.format('YYYY-MM-DD'));
  };

  const isToday = (date: dayjs.Dayjs) => {
    return date.isSame(dayjs(), 'day');
  };

  const isCurrentMonth = (date: dayjs.Dayjs) => {
    return date.isSame(currentDate, 'month');
  };

  const isWeekend = (date: dayjs.Dayjs) => {
    // Direct string comparison to avoid any locale/day number issues
    const dayName = date.format('dddd');
    const isSunday = dayName === 'Minggu';
    return isSunday;
  };

  const handlePrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
  };

  const handleHolidayClick = (holiday: Holiday, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHoliday(holiday);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedHoliday(null);
  };

  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data hari libur...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Kalender Indonesia
            </h1>
            <div className="flex gap-2">
              <button
                onClick={handlePrevMonth}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                &lt;
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Hari Ini
              </button>
              <button
                onClick={handleNextMonth}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                &gt;
              </button>
            </div>
          </div>

          {/* Month Year Display */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {currentDate.format('MMMM YYYY')}
            </h2>
            <div className="flex items-center justify-center gap-4 mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Total Hari Libur: {holidays.length}
              </p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded dark:bg-red-900/40 dark:border-red-700"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Hari Libur</span>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr>
                  {weekDays.map((day) => (
                    <th
                      key={day}
                      className="w-1/7 p-4 text-center font-bold text-blue-600 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil(getDaysInMonth().length / 7) }).map((_, weekIndex) => (
                  <tr key={weekIndex}>
                    {getDaysInMonth()
                      .slice(weekIndex * 7, (weekIndex + 1) * 7)
                      .map((date, dayIndex) => {
                        const holiday = getHolidayForDate(date);
                        const today = isToday(date);
                        const currentMonth = isCurrentMonth(date);
                        const weekend = isWeekend(date);
                        const isSunday = weekend;
                        
                        return (
                          <td
                            key={dayIndex}
                            className={`
                              w-1/7 border border-gray-200 h-28 align-top relative dark:border-gray-700
                              ${!currentMonth ? 'bg-gray-50 text-gray-400 dark:bg-gray-900/40 dark:text-gray-500' : ''}
                              ${currentMonth ? 'hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-700/40' : ''}
                              transition-colors
                            `}
                            onClick={() => currentMonth && setCurrentDate(date)}
                          >
                            <div className="p-2 h-full flex flex-col relative">
                              <div className={`
                                absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-medium
                                ${!currentMonth ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}
                                ${isSunday && currentMonth ? 'text-red-600 dark:text-red-300 font-bold' : ''}
                              `}>
                                {date.date()}
                              </div>
                              {today && (
                                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 pointer-events-none">
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">{date.date()}</span>
                                  </div>
                                </div>
                              )}
                              {holiday && (
                                <div className="flex-1 flex items-center mt-10">
                                  <div 
                                    className="text-xs bg-red-100 text-red-800 rounded px-1.5 py-1 leading-tight w-full text-center cursor-pointer hover:bg-red-200 transition-colors dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/60"
                                    onClick={(e) => handleHolidayClick(holiday, e)}
                                  >
                                    <div className="font-medium truncate">
                                      {holiday.name.split(' ')[0]}
                                    </div>
                                    {holiday.name.split(' ').length > 1 && (
                                      <div className="text-xs opacity-75 truncate mt-0.5">
                                        {holiday.name.split(' ').slice(1).join(' ')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 rounded-full border-2 border-blue-600 dark:bg-blue-950/40 dark:border-blue-400"></div>
              <span className="text-gray-700 dark:text-gray-200">Hari Ini</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-700"></div>
              <span className="text-gray-700 dark:text-gray-200">Akhir Pekan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 border border-gray-200 dark:bg-gray-900/40 dark:border-gray-700"></div>
              <span className="text-gray-700 dark:text-gray-200">Bulan Lain</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded dark:bg-red-900/40 dark:border-red-700"></div>
              <span className="text-gray-700 dark:text-gray-200">Hari Libur</span>
            </div>
          </div>
        </div>
      </div>

      {/* Holiday Popup */}
      {showPopup && selectedHoliday && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Detail Hari Libur</h3>
              <button
                onClick={closePopup}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                    {selectedHoliday.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {dayjs(selectedHoliday.date).format('DD MMMM YYYY')}
                  </p>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Hari libur nasional Indonesia. Pada hari ini, kegiatan perkantoran dan bisnis biasanya diliburkan.
                </p>
              </div>
              
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Klik hari libur pada kalender untuk melihat detail</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={closePopup}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
