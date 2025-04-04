// src/hooks/useSortableData.ts
import { useState, useMemo } from 'react';

type SortConfig<T> = {
  key: keyof T;
  direction: 'asc' | 'desc';
};

/**
 * Veri sıralama için özel hook
 * @param items Sıralanacak veriler
 * @param initialConfig Başlangıç sıralama konfigürasyonu
 * @returns Sıralanmış veriler ve sıralama fonksiyonu
 */
export function useSortableData<T>(
  items: T[],
  initialConfig: SortConfig<T> | null = null
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(initialConfig);
  
  const sortedItems = useMemo(() => {
    // Eğer sıralama yapılandırması yoksa, verileri olduğu gibi döndür
    if (!sortConfig) return items;
    
    // Sıralama için verilerin bir kopyasını oluştur
    const sortableItems = [...items];
    
    // Verileri sırala
    sortableItems.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return sortableItems;
  }, [items, sortConfig]);
  
  // Sıralama fonksiyonu
  const requestSort = (key: keyof T) => {
    // Eğer aynı anahtar için sıralama yapılıyorsa, yönü tersine çevir
    // Aksi takdirde, yeni bir sıralama yapılandırması oluştur
    setSortConfig(prevConfig => {
      if (prevConfig?.key === key) {
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };
  
  return { items: sortedItems, requestSort, sortConfig };
}