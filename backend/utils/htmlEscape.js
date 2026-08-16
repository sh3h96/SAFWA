/**
 * Safely escapes HTML special characters in string inputs to prevent HTML injection in emails
 * @param {string} str - Raw input string
 * @returns {string} Escaped HTML string
 */
const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

module.exports = escapeHtml;
