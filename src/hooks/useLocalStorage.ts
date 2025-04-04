// src/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

/**
 * LocalStorage için özel hook
 * @param key LocalStorage anahtarı
 * @param initialValue Başlangıç değeri
 * @returns Storage değeri ve değiştirme fonksiyonu
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // State'i başlat
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      // LocalStorage'dan değeri al
      const item = window.localStorage.getItem(key);
      // Parse edilmiş JSON'ı veya başlangıç değerini döndür
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('LocalStorage değeri alınırken hata:', error);
      return initialValue;
    }
  });
  
  // LocalStorage'a değeri kaydet
  const setValue = (value: T) => {
    try {
      // State değerini güncelle
      setStoredValue(value);
      // LocalStorage değerini güncelle
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('LocalStorage değeri ayarlanırken hata:', error);
    }
  };
  
  return [storedValue, setValue];
}