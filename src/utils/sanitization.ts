/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param text - The text to escape
 * @returns The escaped text safe for HTML insertion
 */
export const escapeHtml = (text: string): string => {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char));
};
