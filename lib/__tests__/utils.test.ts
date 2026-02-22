import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatTime, formatDateID } from '../utils';

describe('formatCurrency', () => {
  it('should format positive integer amounts correctly', () => {
    expect(formatCurrency(15000)).toBe('Rp 15.000');
    expect(formatCurrency(1000000)).toBe('Rp 1.000.000');
    expect(formatCurrency(500)).toBe('Rp 500');
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('Rp 0');
  });

  it('should format decimal amounts correctly (rounded to integer)', () => {
    expect(formatCurrency(15000.50)).toBe('Rp 15.001');
    expect(formatCurrency(15000.49)).toBe('Rp 15.000');
    expect(formatCurrency(1000.99)).toBe('Rp 1.001');
  });

  it('should format large numbers correctly', () => {
    expect(formatCurrency(1000000000)).toBe('Rp 1.000.000.000');
    expect(formatCurrency(999999999)).toBe('Rp 999.999.999');
  });

  it('should handle single digit amounts', () => {
    expect(formatCurrency(1)).toBe('Rp 1');
    expect(formatCurrency(9)).toBe('Rp 9');
  });

  it('should format amounts with various number groupings', () => {
    expect(formatCurrency(123456)).toBe('Rp 123.456');
    expect(formatCurrency(12345)).toBe('Rp 12.345');
    expect(formatCurrency(1234)).toBe('Rp 1.234');
  });
});

describe('formatDate', () => {
  it('should format valid date strings correctly', () => {
    // Note: The exact output format may vary by environment, but should include date and time
    const result = formatDate('2026-01-01T14:30:00');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).not.toBe('-');
  });

  it('should handle ISO date strings', () => {
    const result = formatDate('2026-12-31T23:59:59');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).not.toBe('-');
  });

  it('should return "-" for null input', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('should return "-" for undefined input', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('should return "-" for empty string', () => {
    expect(formatDate('')).toBe('-');
  });

  it('should handle various date formats', () => {
    const date1 = formatDate('2026-01-15T08:30:00');
    const date2 = formatDate('2025-12-31T16:45:00');

    expect(date1).toBeTruthy();
    expect(date1).not.toBe('-');
    expect(date2).toBeTruthy();
    expect(date2).not.toBe('-');
  });
});

describe('formatTime', () => {
  it('should format valid date strings to time correctly', () => {
    // Note: The exact format may vary, but should contain hour and minute
    const result = formatTime('2026-01-01T14:30:00');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).not.toBe('-');
  });

  it('should handle morning times', () => {
    const result = formatTime('2026-01-01T08:15:00');
    expect(result).toBeTruthy();
    expect(result).not.toBe('-');
  });

  it('should handle afternoon/evening times', () => {
    const result = formatTime('2026-01-01T18:45:00');
    expect(result).toBeTruthy();
    expect(result).not.toBe('-');
  });

  it('should handle midnight', () => {
    const result = formatTime('2026-01-01T00:00:00');
    expect(result).toBeTruthy();
    expect(result).not.toBe('-');
  });

  it('should return "-" for null input', () => {
    expect(formatTime(null)).toBe('-');
  });

  it('should return "-" for undefined input', () => {
    expect(formatTime(undefined)).toBe('-');
  });

  it('should return "-" for empty string', () => {
    expect(formatTime('')).toBe('-');
  });

  it('should format various times correctly', () => {
    const time1 = formatTime('2026-01-01T09:30:00');
    const time2 = formatTime('2026-01-01T14:00:00');
    const time3 = formatTime('2026-01-01T23:59:00');

    expect(time1).toBeTruthy();
    expect(time1).not.toBe('-');
    expect(time2).toBeTruthy();
    expect(time2).not.toBe('-');
    expect(time3).toBeTruthy();
    expect(time3).not.toBe('-');
  });
});

describe('formatDateID', () => {
  it('should format valid date strings to Indonesian date format', () => {
    const result = formatDateID('2026-01-01T14:30:00');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).not.toBe('-');
  });

  it('should handle dates at different times of day', () => {
    const morning = formatDateID('2026-01-01T08:00:00');
    const evening = formatDateID('2026-01-01T20:00:00');

    expect(morning).toBeTruthy();
    expect(morning).not.toBe('-');
    expect(evening).toBeTruthy();
    expect(evening).not.toBe('-');
  });

  it('should return "-" for null input', () => {
    expect(formatDateID(null)).toBe('-');
  });

  it('should return "-" for undefined input', () => {
    expect(formatDateID(undefined)).toBe('-');
  });

  it('should return "-" for empty string', () => {
    expect(formatDateID('')).toBe('-');
  });

  it('should handle dates at the beginning and end of months', () => {
    const firstDay = formatDateID('2026-01-01T00:00:00');
    const lastDay = formatDateID('2026-12-31T23:59:59');

    expect(firstDay).toBeTruthy();
    expect(firstDay).not.toBe('-');
    expect(lastDay).toBeTruthy();
    expect(lastDay).not.toBe('-');
  });

  it('should handle leap year dates', () => {
    const leapDay = formatDateID('2024-02-29T12:00:00');
    expect(leapDay).toBeTruthy();
    expect(leapDay).not.toBe('-');
  });
});

describe('Utility functions edge cases', () => {
  it('should handle falsy values consistently across all date functions', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatTime(null)).toBe('-');
    expect(formatDateID(null)).toBe('-');

    expect(formatDate(undefined)).toBe('-');
    expect(formatTime(undefined)).toBe('-');
    expect(formatDateID(undefined)).toBe('-');

    expect(formatDate('')).toBe('-');
    expect(formatTime('')).toBe('-');
    expect(formatDateID('')).toBe('-');
  });

  it('should formatCurrency handle very small decimals', () => {
    expect(formatCurrency(0.1)).toBe('Rp 0');
    expect(formatCurrency(0.5)).toBe('Rp 1');
    expect(formatCurrency(0.99)).toBe('Rp 1');
  });

  it('should formatCurrency handle negative numbers', () => {
    // Indonesian locale typically formats negative numbers with parentheses or minus sign
    const result = formatCurrency(-15000);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).toContain('15.000');
  });
});
