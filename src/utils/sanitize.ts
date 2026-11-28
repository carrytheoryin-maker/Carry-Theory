/**
 * Client-side input sanitization & safe URL validation helpers.
 * Complements React's default text escaping and authoritative server validation.
 */

export function sanitizeText(value: string, maxLen = 500): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeMultilineText(value: string, maxLen = 2000): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length <= 180 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.trim();
  const digits = cleaned.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15 && /^[+\d\s()-]{7,25}$/.test(cleaned);
}

export function isValidPinCode(pinCode: string): boolean {
  return /^\d{6}$/.test(pinCode.trim());
}

export function isSafeUrl(url: string | undefined | null, allowMailTel = true): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    const allowed = allowMailTel
      ? ['http:', 'https:', 'mailto:', 'tel:']
      : ['http:', 'https:'];
    return allowed.includes(parsed.protocol);
  } catch {
    return false;
  }
}
