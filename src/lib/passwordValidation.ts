const SPECIAL_CHARS = /[.+,;!@#$^&*()_\-=\[\]{}'"|\\:/<>?~`%]/;

export function validatePassword(password: string): { valid: boolean; error: string | null } {
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters' };
  }

  if (!SPECIAL_CHARS.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (e.g. !@#$%^&*)' };
  }

  return { valid: true, error: null };
}
