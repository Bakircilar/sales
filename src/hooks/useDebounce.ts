// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

/**
 * Değerleri geciktirmek için debounce hook'u
 * @param value İzlenecek değer
 * @param delay Gecikme süresi (ms)
 * @returns Geciktirilmiş değer
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}