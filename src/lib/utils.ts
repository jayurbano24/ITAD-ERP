import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases de Tailwind de forma inteligente
 * Evita conflictos entre clases similares
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea fechas al formato guatemalteco
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Formatea moneda en Quetzales
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
  }).format(amount)
}

