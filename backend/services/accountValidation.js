export const PASSWORD_POLICY_MESSAGE = 'Use at least 12 characters, 1 uppercase letter and 1 number (maximum 72 bytes).';

export function isValidPassword(value) {
  return typeof value === 'string' && value.length >= 12 && /[A-Z]/.test(value) && /[0-9]/.test(value) && Buffer.byteLength(value, 'utf8') <= 72;
}

export function normalizeAccountEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
