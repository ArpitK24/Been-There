import { DISPOSABLE_EMAIL_DOMAINS } from './disposable-domains';

export interface EmailPolicyResult {
  isValid: boolean;
  normalizedEmail: string;
  error?: string;
}

/**
 * Normalizes an email address by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Extracts the domain portion of an email address.
 * Returns null if the email is invalid or has no domain.
 */
export function extractEmailDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const atIndex = normalized.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return null;
  }

  const domain = normalized.slice(atIndex + 1).trim();
  // Ensure domain contains at least one dot and valid characters
  if (!domain || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return null;
  }

  return domain;
}

/**
 * Checks whether a given domain is in the known disposable email domains blocklist.
 */
export function isDisposableEmailDomain(domain: string): boolean {
  if (!domain) return false;
  const normalizedDomain = domain.trim().toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.has(normalizedDomain);
}

/**
 * Validates an email address against syntax rules and known disposable domain blocklists.
 * Independent of Supabase or any network call for easy testing.
 */
export function validateSignupEmail(email: string): EmailPolicyResult {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return {
      isValid: false,
      normalizedEmail: '',
      error: 'Email address cannot be empty',
    };
  }

  // Basic RFC 5322 compliant regex for structural email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(normalized)) {
    return {
      isValid: false,
      normalizedEmail: normalized,
      error: 'Please enter a valid email address format',
    };
  }

  const domain = extractEmailDomain(normalized);
  if (!domain) {
    return {
      isValid: false,
      normalizedEmail: normalized,
      error: 'Invalid email domain',
    };
  }

  if (isDisposableEmailDomain(domain)) {
    return {
      isValid: false,
      normalizedEmail: normalized,
      error: 'Disposable and temporary email addresses are not permitted',
    };
  }

  return {
    isValid: true,
    normalizedEmail: normalized,
  };
}
