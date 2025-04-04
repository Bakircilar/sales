// src/lib/utils/excelProcessor.ts
import * as XLSX from 'xlsx';

/**
 * Excel dosyasını JSON'a dönüştürme
 * @param file Excel dosyası
 * @returns JSON verileri
 */
export function excelToJson(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        
        resolve(json as any[]);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsBinaryString(file);
  });
}

/**
 * Excel tarihini JS tarihine dönüştürme
 * @param excelDate Excel tarih değeri
 * @returns JavaScript Date objesi
 */
export function excelDateToJSDate(excelDate: number): Date {
  // Excel tarihleri 1 Ocak 1900'den itibaren gün sayısı olarak saklanır
  // JavaScript ise milisaniye olarak 1 Ocak 1970'ten itibaren saklar
  // Gündeki milisaniye: 24 saat * 60 dakika * 60 saniye * 1000 milisaniye = 86400000
  return new Date(Math.floor((excelDate - 25569) * 86400000));
}