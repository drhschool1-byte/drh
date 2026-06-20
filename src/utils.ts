/**
 * Utility functions for Arabic text normalization, cleansing, and search optimization.
 * Perfect for solving mismatching Hamzas, Teh Marbuta, Alef Maksura, and Eastern Arabic Numerals.
 */

/**
 * Normalizes Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) and Persian numerals to Western digits (0123456789).
 */
export function convertArabicNumerals(str: string): string {
  if (!str) return '';
  return str
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

/**
 * Normalizes Arabic text for flexible lookup.
 * - Trims and lowercases
 * - Converts Eastern Arabic / Persian digits to Western digits
 * - Removes Arabic Tashkeel (diacritics: Fatha, Damma, Kasra, Shadda, etc.)
 * - Standardizes Alef (أ, إ, آ -> ا)
 * - Standardizes Teh Marbuta (ة -> ه)
 * - Standardizes Yeh / Alef Maksura (ى -> ي)
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    // Convert Eastern/Persian numerals
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    // Remove Tashkeel (diacritics)
    .replace(/[\u064B-\u065F]/g, '')
    // Normalize Alef Hamzas
    .replace(/[أإآ]/g, 'ا')
    // Normalize Teh Marbuta to Heh
    .replace(/ة/g, 'ه')
    // Normalize Yeh/Alef Maksura to Yeh
    .replace(/ى/g, 'ي');
}

/**
 * Performs a smart check to determine if a target name matches a search query under Arabic rules.
 * Supports multi-word queries where search terms can match in any order.
 * E.g., query "محمود احمد" will match full name "أحمد محمد محمود علي".
 */
export function matchArabicSearch(targetName: string, queryText: string): boolean {
  if (!targetName || !queryText) return false;
  
  const normalizedTarget = normalizeArabicText(targetName);
  const queryTerms = normalizeArabicText(queryText)
    .split(/\s+/)
    .filter(Boolean);
    
  if (queryTerms.length === 0) return false;
  
  // Verify that EVERY term of the query is included in the target name
  return queryTerms.every(term => normalizedTarget.includes(term));
}

/**
 * Calculates a final monthly score (out of 20) given an optional history of month scores
 * and a chosen calculation method: "average" (default), "highest", or "active".
 * 
 * If history is empty, falls back to the existing flat monthly score.
 */
export function calculateMonthlyFromHistory(
  history: { [monthName: string]: number } | undefined,
  fallbackVal: number,
  method: 'average' | 'highest' | 'active' | string = 'average',
  activeMonth?: string
): number {
  if (!history || Object.keys(history).length === 0) {
    return Math.min(20, Math.max(0, Number(fallbackVal ?? 0)));
  }

  const values = Object.values(history).map(v => Number(v ?? 0));

  if (method === 'highest') {
    return Math.round(Math.max(...values, 0));
  } else if (method === 'active' && activeMonth && activeMonth in history) {
    return Math.round(Number(history[activeMonth] ?? 0));
  } else {
    // Default: 'average'
    const sum = values.reduce((acc, v) => acc + v, 0);
    return Math.round(sum / values.length);
  }
}
