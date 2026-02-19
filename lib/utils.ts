import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency using Indonesian locale (IDR)
 * @example formatCurrency(15000) // "Rp15.000"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date using Indonesian locale with date and time
 * @example formatDate("2026-01-01T14:30:00") // "01 Jan 2026, 14:30"
 * @example formatDate(null) // "-"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format time using Indonesian locale (HH:MM format)
 * @example formatTime("2026-01-01T14:30:00") // "14:30"
 * @example formatTime(null) // "-"
 */
export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

/**
 * Format date using Indonesian locale (date only, no time)
 * @example formatDateID("2026-01-01T14:30:00") // "1 Jan 2026"
 * @example formatDateID(null) // "-"
 */
export function formatDateID(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
