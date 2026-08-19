/**
 * Centralized formatting utilities for currency, numbers, dates, and times.
 * Enforces Western/Latin Numerals (0-9) and Gregorian Calendar globally across SAFWA.
 */

/**
 * Helper to convert any Arabic-Indic digits (٠-٩) to Western/Latin digits (0-9).
 * @param {string|number} input 
 * @returns {string}
 */
export function toWesternNumerals(input) {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

/**
 * Formats a numeric monetary value into a currency string with Western numerals (e.g. 1250 -> "1,250 ر.س").
 * @param {number|string} amount 
 * @param {string} currencySymbol 
 * @returns {string}
 */
export function formatCurrency(amount, currencySymbol = 'ر.س') {
  if (amount === undefined || amount === null || amount === '' || isNaN(amount)) {
    return `0 ${currencySymbol}`;
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericAmount);
  return `${toWesternNumerals(formatted)} ${currencySymbol}`;
}

/**
 * Formats a number using Western numerals with thousands separators (e.g. 1250 -> "1,250").
 * Do NOT use for IDs, invoice numbers, phone numbers, or license plates.
 * @param {number|string} val 
 * @returns {string}
 */
export function formatNumber(val) {
  if (val === undefined || val === null || val === '' || isNaN(val)) {
    return '0';
  }
  const numericVal = typeof val === 'string' ? parseFloat(val) : val;
  const formatted = new Intl.NumberFormat('en-US').format(numericVal);
  return toWesternNumerals(formatted);
}

/**
 * Formats a Date object or date string into a standard Gregorian Date string (e.g. "2026/08/19").
 * @param {Date|string} dateInput 
 * @returns {string}
 */
export function formatDate(dateInput) {
  if (!dateInput) return '-';
  
  // Handle plain YYYY-MM-DD or YYYY/MM/DD strings directly to prevent timezone offsets
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
      const parts = trimmed.split(/[-/]/);
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return toWesternNumerals(`${y}/${m}/${d}`);
    }
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return toWesternNumerals(`${year}/${month}/${day}`);
}

/**
 * Formats a Date object or date string into a localized Gregorian Date string with Arabic month names & Western numerals (e.g. "19 أغسطس 2026").
 * @param {Date|string} dateInput 
 * @returns {string}
 */
export function formatDateLong(dateInput) {
  if (!dateInput) return '-';

  const monthsArabic = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
      const parts = trimmed.split(/[-/]/);
      const y = parts[0];
      const mIndex = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (mIndex >= 0 && mIndex < 12) {
        return `${toWesternNumerals(d)} ${monthsArabic[mIndex]} ${toWesternNumerals(y)}`;
      }
    }
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  const day = date.getDate();
  const year = date.getFullYear();
  const monthName = monthsArabic[date.getMonth()];

  return `${toWesternNumerals(day)} ${monthName} ${toWesternNumerals(year)}`;
}

/**
 * Formats a Date object, ISO string, or HH:mm time string into a 12-hour time format with Western numerals (e.g. "09:30 ص" or "02:15 م").
 * @param {Date|string} dateInput 
 * @returns {string}
 */
export function formatTime(dateInput) {
  if (!dateInput) return '-';
  let hours, minutes;

  if (typeof dateInput === 'string' && dateInput.includes(':') && !dateInput.includes('T')) {
    const parts = dateInput.trim().split(':');
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
  } else {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '-';
    hours = date.getHours();
    minutes = date.getMinutes();
  }

  if (isNaN(hours) || isNaN(minutes)) return '-';

  const period = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12 || 12;
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');

  return toWesternNumerals(`${formattedHours}:${formattedMinutes} ${period}`);
}

/**
 * Formats a Date object or ISO string into combined Gregorian Date and 12-Hour Time with Western numerals (e.g. "2026/08/19 - 02:15 م").
 * @param {Date|string} dateInput 
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  return `${formatDate(dateInput)} - ${formatTime(dateInput)}`;
}
