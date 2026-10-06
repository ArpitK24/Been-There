import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  extractEmailDomain,
  isDisposableEmailDomain,
  validateSignupEmail,
} from '@/lib/auth/email-policy';

describe('Disposable Email Policy & Normalization', () => {
  describe('Email Normalization', () => {
    it('trims leading/trailing whitespace and lowercases email', () => {
      expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    });

    it('returns empty string for empty input', () => {
      expect(normalizeEmail('')).toBe('');
    });
  });

  describe('Domain Extraction', () => {
    it('extracts valid domain from normalized email', () => {
      expect(extractEmailDomain('alex@gmail.com')).toBe('gmail.com');
      expect(extractEmailDomain('alex.mercer@sub.domain.co.uk')).toBe('sub.domain.co.uk');
    });

    it('returns null for invalid email formats', () => {
      expect(extractEmailDomain('not-an-email')).toBeNull();
      expect(extractEmailDomain('@domain.com')).toBeNull();
      expect(extractEmailDomain('user@')).toBeNull();
      expect(extractEmailDomain('user@.com')).toBeNull();
      expect(extractEmailDomain('user@domain.')).toBeNull();
    });
  });

  describe('Disposable Domain Detection', () => {
    it('identifies known disposable email domains', () => {
      expect(isDisposableEmailDomain('mailinator.com')).toBe(true);
      expect(isDisposableEmailDomain('tempmail.com')).toBe(true);
      expect(isDisposableEmailDomain('10minutemail.com')).toBe(true);
      expect(isDisposableEmailDomain('yopmail.com')).toBe(true);
      expect(isDisposableEmailDomain('guerrillamail.com')).toBe(true);
    });

    it('allows standard public and enterprise domains', () => {
      expect(isDisposableEmailDomain('gmail.com')).toBe(false);
      expect(isDisposableEmailDomain('outlook.com')).toBe(false);
      expect(isDisposableEmailDomain('yahoo.com')).toBe(false);
      expect(isDisposableEmailDomain('icloud.com')).toBe(false);
      expect(isDisposableEmailDomain('proton.me')).toBe(false);
    });
  });

  describe('Full Signup Email Validation (validateSignupEmail)', () => {
    it('accepts valid standard email addresses', () => {
      const result = validateSignupEmail('user@gmail.com');
      expect(result.isValid).toBe(true);
      expect(result.normalizedEmail).toBe('user@gmail.com');
      expect(result.error).toBeUndefined();
    });

    it('rejects known disposable email domains', () => {
      const result = validateSignupEmail('test@mailinator.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Disposable and temporary email addresses are not permitted');
    });

    it('handles mixed-case and uppercase domains consistently', () => {
      const normalCase = validateSignupEmail('USER@GMAIL.COM');
      expect(normalCase.isValid).toBe(true);
      expect(normalCase.normalizedEmail).toBe('user@gmail.com');

      const disposableCase = validateSignupEmail('User@MAILINATOR.COM');
      expect(disposableCase.isValid).toBe(false);
      expect(disposableCase.normalizedEmail).toBe('user@mailinator.com');
      expect(disposableCase.error).toContain('Disposable');
    });

    it('rejects malformed email formats', () => {
      expect(validateSignupEmail('invalid-email').isValid).toBe(false);
      expect(validateSignupEmail('@missinguser.com').isValid).toBe(false);
      expect(validateSignupEmail('user@missingdomain').isValid).toBe(false);
      expect(validateSignupEmail('').isValid).toBe(false);
      expect(validateSignupEmail('   ').isValid).toBe(false);
    });
  });
});
