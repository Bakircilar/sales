// src/lib/utils/formatters.ts
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * Para birimi formatı
 * @param value Formatlanacak sayı
 * @param currency Para birimi (varsayılan: TRY)
 * @returns Formatlanmış para birimi string'i
 */
export function formatCurrency(value: number, currency: string = 'TRY'): string {
  const symbols: Record<string, string> = {
    TRY: '₺',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };

  const symbol = symbols[currency] || '₺';
  
  return `${symbol}${value.toLocaleString('tr-TR')}`;
}

/**
 * Tarih formatı
 * @param dateString Formatlanacak tarih
 * @param dateFormat Çıktı formatı (varsayılan: dd.MM.yyyy)
 * @returns Formatlanmış tarih string'i
 */
export function formatDate(dateString: string, dateFormat: string = 'dd.MM.yyyy'): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    return format(date, dateFormat, { locale: tr });
  } catch (error) {
    console.error('Tarih formatlanırken hata oluştu:', error);
    return dateString;
  }
}

/**
 * Yüzde formatı
 * @param value Formatlanacak yüzde değeri
 * @param decimals Ondalık basamak sayısı
 * @returns Formatlanmış yüzde string'i
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `%${value.toFixed(decimals)}`;
}

/**
 * Dosya adını kısaltma
 * @param filename Dosya adı
 * @param maxLength Maksimum uzunluk
 * @returns Kısaltılmış dosya adı
 */
export function shortenFileName(filename: string, maxLength: number = 25): string {
  if (filename.length <= maxLength) return filename;
  
  const extension = filename.split('.').pop();
  const name = filename.substring(0, filename.lastIndexOf('.'));
  
  const shortName = name.substring(0, maxLength - extension!.length - 3) + '...';
  return `${shortName}.${extension}`;
}

/**
 * Risk seviyesine göre renk kodu
 * @param risk Risk seviyesi
 * @returns Renk kodu
 */
export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'Yüksek':
      return 'error';
    case 'Orta':
      return 'warning';
    case 'Düşük':
      return 'success';
    default:
      return 'default';
  }
}