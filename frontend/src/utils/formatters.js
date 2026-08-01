/**
 * Centralized formatting utilities for currency, numbers, and strings.
 */

/**
 * Formats a numeric value into a currency string (e.g. 45 -> "45 ر.س").
 * @param {number|string} amount 
 * @param {string} currencySymbol 
 * @returns {string}
 */
export function formatCurrency(amount, currencySymbol = 'ر.س') {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `0 ${currencySymbol}`;
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${numericAmount.toLocaleString('ar-SA')} ${currencySymbol}`;
}

/**
 * Formats a number with locale formatting.
 * @param {number|string} val 
 * @returns {string}
 */
export function formatNumber(val) {
  if (val === undefined || val === null || isNaN(val)) {
    return '0';
  }
  const numericVal = typeof val === 'string' ? parseFloat(val) : val;
  return numericVal.toLocaleString('ar-SA');
}
