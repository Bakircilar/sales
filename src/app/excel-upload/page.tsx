// src/app/excel-upload/page.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Box, Typography, Paper, Button, CircularProgress,
  Stepper, Step, StepLabel, Grid, Alert, Chip, List, 
  ListItem, ListItemText, LinearProgress, Divider
} from '@mui/material'
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-toastify'
import { v4 as uuidv4 } from 'uuid'
import { ImportHistory } from '@/lib/supabase/database.types'

const steps = ['Excel Dosyasını Seç', 'Veri Önizleme ve Doğrulama', 'Veri Tabanına Aktar']

export default function ExcelUploadPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<any[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batchId, setBatchId] = useState('')
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([])
  
  const supabase = createClient()

  // Excel dosyasını yükleme
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    
    if (acceptedFiles.length === 0) {
      setError('Lütfen geçerli bir Excel dosyası (.xlsx, .xls) yükleyin.')
      return
    }
    
    const file = acceptedFiles[0]
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Lütfen geçerli bir Excel dosyası (.xlsx, .xls) yükleyin.')
      return
    }
    
    setFile(file)
    readExcelFile(file)
    setActiveStep(1)
  }, [])

  // Dosya Yükleme için useDropzone hook'u
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  })

  // Excel dosyasını okuma
  const readExcelFile = (file: File) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false })
        
        setData(json.slice(0, 100)) // Sadece ilk 100 satırı göster
        setTotalRows(json.length)
        
        toast.success(`${json.length} satır başarıyla okundu`)
      } catch (error) {
        setError('Excel dosyası okunurken bir hata oluştu. Lütfen dosyayı kontrol edin.')
        toast.error('Excel dosyası okunurken bir hata oluştu')
      }
    }
    
    reader.onerror = () => {
      setError('Dosya okunurken bir hata oluştu.')
      toast.error('Dosya okunurken bir hata oluştu')
    }
    
    reader.readAsBinaryString(file)
  }

  // Veri tabanına aktarma
  const importDataToDatabase = async () => {
    if (!file || data.length === 0) {
      setError('Yüklenecek veri bulunamadı.')
      return
    }
    
    setIsProcessing(true)
    setError(null)
    
    // Yeni bir batch ID oluştur
    const newBatchId = uuidv4()
    setBatchId(newBatchId)
    
    try {
      // Excel'i tekrar tam olarak oku
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[]
          
          // Kategorileri ve müşterileri eklemek için helper fonksiyonlar
          const processedCategories = new Set()
          const processedBrands = new Set()
          const processedCustomers = new Set()
          const processedProducts = new Set()
          const processedPersonnel = new Set()
          
          // Batch için import kaydı oluştur
          const { error: importError } = await supabase
            .from('import_history')
            .insert({
              filename: file.name,
              batch_id: newBatchId,
              row_count: json.length,
              successful: false
            })
          
          if (importError) {
            throw new Error(`Import kaydı oluşturulamadı: ${importError.message}`)
          }
          
          // Her 100 satırda bir progress update et
          const updateInterval = Math.max(1, Math.floor(json.length / 100))
          
          // Önce ana verileri ekle (kategoriler, müşteriler, ürünler, personel)
          for (let i = 0; i < json.length; i++) {
            const row = json[i]
            
            // 1. Kategoriyi ekle (eğer daha önce eklenmemişse)
            if (row['Kategori'] && !processedCategories.has(row['Kategori'])) {
              const { error: categoryError } = await supabase
                .from('categories')
                .upsert({ 
                  category_name: row['Kategori']
                }, {
                  onConflict: 'category_name'
                })
              
              if (categoryError) {
                console.error('Kategori eklenirken hata:', categoryError)
              } else {
                processedCategories.add(row['Kategori'])
              }
            }
            
            // 2. Markayı ekle (eğer daha önce eklenmemişse)
            if (row['Marka'] && !processedBrands.has(row['Marka'])) {
              const { error: brandError } = await supabase
                .from('brands')
                .upsert({ 
                  brand_name: row['Marka']
                }, {
                  onConflict: 'brand_name'
                })
              
              if (brandError) {
                console.error('Marka eklenirken hata:', brandError)
              } else {
                processedBrands.add(row['Marka'])
              }
            }
            
            // 3. Müşteriyi ekle (eğer daha önce eklenmemişse)
            if (row['Cari Kodu'] && !processedCustomers.has(row['Cari Kodu'])) {
              const { error: customerError } = await supabase
                .from('customers')
                .upsert({ 
                  customer_code: row['Cari Kodu'],
                  customer_name: row['Cari İsmi'] || 'Bilinmeyen Müşteri',
                  sector_code: row['SektorKodu'] || null
                }, {
                  onConflict: 'customer_code'
                })
              
              if (customerError) {
                console.error('Müşteri eklenirken hata:', customerError)
              } else {
                processedCustomers.add(row['Cari Kodu'])
              }
            }
            
            // 4. Satış personelini ekle (eğer daha önce eklenmemişse)
            if (row['Satıcı Kodu'] && !processedPersonnel.has(row['Satıcı Kodu'])) {
              const { error: personnelError } = await supabase
                .from('sales_personnel')
                .upsert({ 
                  personnel_code: row['Satıcı Kodu'],
                  personnel_name: row['Satıcı İsmi'] || 'Bilinmeyen Personel'
                }, {
                  onConflict: 'personnel_code'
                })
              
              if (personnelError) {
                console.error('Personel eklenirken hata:', personnelError)
              } else {
                processedPersonnel.add(row['Satıcı Kodu'])
              }
            }
            
            // İlerlemeyi güncelle
            if (i % updateInterval === 0) {
              setProgress(Math.floor((i / json.length) * 50)) // İlk %50'lik kısım
            }
          }
          
          // ID'leri almak için gerekli verileri çek
          const { data: categories } = await supabase.from('categories').select('id, category_name')
          const { data: brands } = await supabase.from('brands').select('id, brand_name')
          const { data: customers } = await supabase.from('customers').select('id, customer_code')
          const { data: personnel } = await supabase.from('sales_personnel').select('id, personnel_code')
          
          // Kategori ve marka lookup tabloları oluştur
          const categoryMap = new Map()
          const brandMap = new Map()
          const customerMap = new Map()
          const personnelMap = new Map()
          
          categories?.forEach(cat => categoryMap.set(cat.category_name, cat.id))
          brands?.forEach(brand => brandMap.set(brand.brand_name, brand.id))
          customers?.forEach(cust => customerMap.set(cust.customer_code, cust.id))
          personnel?.forEach(pers => personnelMap.set(pers.personnel_code, pers.id))
          
          // 5. Ürünleri ekle
          for (let i = 0; i < json.length; i++) {
            const row = json[i]
            
            if (row['STOK KODU'] && !processedProducts.has(row['STOK KODU'])) {
              const categoryId = row['Kategori'] ? categoryMap.get(row['Kategori']) || null : null
              const brandId = row['Marka'] ? brandMap.get(row['Marka']) || null : null
              
              const { error: productError } = await supabase
                .from('products')
                .upsert({ 
                  product_code: row['STOK KODU'],
                  product_name: row['Stok İsmi'] || 'Bilinmeyen Ürün',
                  category_id: categoryId,
                  brand_id: brandId,
                  unit: row['Birimi'] || null,
                  latest_cost: isNaN(parseFloat(row['A.Teklif+'])) ? null : parseFloat(row['A.Teklif+']),
                  latest_cost_with_tax: isNaN(parseFloat(row['A.TeklifDahil'])) ? null : parseFloat(row['A.TeklifDahil']),
                  latest_cost_date: row['A.TeklifTarihi'] || null
                }, {
                  onConflict: 'product_code'
                })
              
              if (productError) {
                console.error('Ürün eklenirken hata:', productError)
              } else {
                processedProducts.add(row['STOK KODU'])
              }
            }
            
            // İlerlemeyi güncelle
            if (i % updateInterval === 0) {
              setProgress(50 + Math.floor((i / json.length) * 25)) // %50-75 arası
            }
          }
          
          // Ürün ID'lerini almak için gerekli verileri çek
          const { data: products } = await supabase.from('products').select('id, product_code')
          
          // Ürün lookup tablosu oluştur
          const productMap = new Map()
          products?.forEach(prod => productMap.set(prod.product_code, prod.id))
          
          // 6. Satış işlemlerini ekle
          for (let i = 0; i < json.length; i++) {
            const row = json[i]
            
            const customerId = row['Cari Kodu'] ? customerMap.get(row['Cari Kodu']) || null : null
            const productId = row['STOK KODU'] ? productMap.get(row['STOK KODU']) || null : null
            const personnelId = row['Satıcı Kodu'] ? personnelMap.get(row['Satıcı Kodu']) || null : null
            
            // Satış tarihini doğru formata çevir
            let documentDate = null
            if (row['Evrak Tarihi']) {
              try {
                // Excel tarih formatından ISO formatına çevirme
                const excelDate = row['Evrak Tarihi']
                // Eğer sayı ise Excel tarih formatındadır
                if (!isNaN(Number(excelDate))) {
                  const date = new Date(Math.floor((Number(excelDate) - 25569) * 86400 * 1000))
                  documentDate = date.toISOString().split('T')[0]
                } else {
                  // String formatındaki tarihi parse et
                  const date = new Date(excelDate)
                  documentDate = date.toISOString().split('T')[0]
                }
              } catch (e) {
                console.error('Tarih çevirme hatası:', e)
                documentDate = new Date().toISOString().split('T')[0] // Hata durumunda bugünün tarihini kullan
              }
            }
            
            const { error: transactionError } = await supabase
              .from('sales_transactions')
              .insert({ 
                transaction_type: row['Tip'] || null,
                document_date: documentDate,
                customer_id: customerId,
                product_id: productId,
                document_number: row['Evrak No'] || null,
                invoice_number: row['Belge No'] || null,
                quantity: isNaN(parseFloat(row['Miktar'])) ? 0 : parseFloat(row['Miktar']),
                unit_price: isNaN(parseFloat(row['BirimSatış'])) ? 0 : parseFloat(row['BirimSatış']),
                unit_price_with_tax: isNaN(parseFloat(row['BirimSatışKDV'])) ? null : parseFloat(row['BirimSatışKDV']),
                total_amount: isNaN(parseFloat(row['Tutar'])) ? 0 : parseFloat(row['Tutar']),
                total_amount_with_tax: isNaN(parseFloat(row['TutarKDV'])) ? null : parseFloat(row['TutarKDV']),
                tax_amount: isNaN(parseFloat(row['Vergi'])) ? null : parseFloat(row['Vergi']),
                sales_status: row['SatısDurumu'] || null,
                purchase_status: row['AlısDurumu'] || null,
                
                // Satış öncesi maliyet bilgileri
                pre_sale_unit_cost: isNaN(parseFloat(row['SÖ-BirimMaliyet'])) ? null : parseFloat(row['SÖ-BirimMaliyet']),
                pre_sale_unit_cost_with_tax: isNaN(parseFloat(row['Sö-BirimMaliyetKdv'])) ? null : parseFloat(row['Sö-BirimMaliyetKdv']),
                pre_sale_purchase_date: row['SÖ-AlışTarihi'] || null,
                pre_sale_unit_profit: isNaN(parseFloat(row['SÖ-BirimKar'])) ? null : parseFloat(row['SÖ-BirimKar']),
                pre_sale_total_profit: isNaN(parseFloat(row['SÖ-ToplamKar'])) ? null : parseFloat(row['SÖ-ToplamKar']),
                pre_sale_profit_percentage: isNaN(parseFloat(row['SÖ-KarYuzde'])) ? null : parseFloat(row['SÖ-KarYuzde']),
                
                // Ortalama maliyet bilgileri
                average_unit_cost: isNaN(parseFloat(row['OrtalamaMaliyet'])) ? null : parseFloat(row['OrtalamaMaliyet']),
                average_unit_cost_with_tax: isNaN(parseFloat(row['OrtalamaMaliyetKDVli'])) ? null : parseFloat(row['OrtalamaMaliyetKDVli']),
                avg_unit_profit: isNaN(parseFloat(row['BirimKarOrtMalGöre'])) ? null : parseFloat(row['BirimKarOrtMalGöre']),
                avg_total_profit: isNaN(parseFloat(row['ToplamKarOrtMalGöre'])) ? null : parseFloat(row['ToplamKarOrtMalGöre']),
                avg_profit_percentage: isNaN(parseFloat(row['OrtalamaKarYuzde'])) ? null : parseFloat(row['OrtalamaKarYuzde']),
                
                // Güncel maliyet üzerinden hesaplanan kar bilgileri
                current_unit_profit: isNaN(parseFloat(row['TeklifAdetKar'])) ? null : parseFloat(row['TeklifAdetKar']),
                current_total_profit: isNaN(parseFloat(row['TeklifToplamKar'])) ? null : parseFloat(row['TeklifToplamKar']),
                current_profit_percentage: isNaN(parseFloat(row['TeklifKarYuzde'])) ? null : parseFloat(row['TeklifKarYuzde']),
                
                personnel_id: personnelId,
                notes: row['Aciklama1'] || null,
                additional_notes: row['EAçıklama1'] || null,
                import_batch_id: newBatchId
              })
            
            if (transactionError) {
              console.error('Satış işlemi eklenirken hata:', transactionError)
            }
            
            // İlerlemeyi güncelle
            if (i % updateInterval === 0) {
              setProgress(75 + Math.floor((i / json.length) * 25)) // %75-100 arası
            }
          }
          
          // Import kaydını successful olarak güncelle
          await supabase
            .from('import_history')
            .update({ successful: true })
            .eq('batch_id', newBatchId)
          
          setProgress(100)
          setActiveStep(2)
          toast.success('Veriler başarıyla içe aktarıldı!')
          loadImportHistory()
          
        } catch (error: any) {
          setError(`İçe aktarma işlemi sırasında bir hata oluştu: ${error.message}`)
          toast.error('İçe aktarma işlemi başarısız oldu')
          
          // Hata mesajını import kaydına ekle
          await supabase
            .from('import_history')
            .update({ 
              successful: false,
              error_message: error.message
            })
            .eq('batch_id', newBatchId)
        }
      }
      
      reader.onerror = () => {
        setError('Dosya okunurken bir hata oluştu.')
        toast.error('Dosya okunurken bir hata oluştu')
      }
      
      reader.readAsBinaryString(file)
      
    } catch (error: any) {
      setError(`İşlem sırasında bir hata oluştu: ${error.message}`)
      toast.error('İşlem başarısız oldu')
    } finally {
      setIsProcessing(false)
    }
  }

  // Yükleme geçmişini yükle
  const loadImportHistory = async () => {
    const { data, error } = await supabase
      .from('import_history')
      .select('*')
      .order('import_date', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Yükleme geçmişi alınırken hata oluştu:', error)
    } else {
      setImportHistory(data)
    }
  }

  // Sayfa yüklendiğinde ve başarılı yüklemeden sonra geçmişi yükle
  useEffect(() => {
    loadImportHistory()
  }, [])

  // Yeniden başlat
  const handleReset = () => {
    setActiveStep(0)
    setFile(null)
    setData([])
    setTotalRows(0)
    setProgress(0)
    setError(null)
    setBatchId('')
  }

  return (
    <Box sx={{ maxWidth: '100%', mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Excel Verileri Yükleme
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {activeStep === 0 && (
            <Paper
              {...getRootProps()}
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: isDragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
                borderRadius: 2,
                bgcolor: isDragActive ? 'rgba(25, 118, 210, 0.1)' : 'white',
                cursor: 'pointer',
                minHeight: 200
              }}
            >
              <input {...getInputProps()} />
              <CloudUploadIcon sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Dosyayı Bırakın' : 'Excel Dosyasını Sürükleyin veya Seçin'}
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                .xlsx veya .xls formatındaki Excel dosyalarını destekler
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CloudUploadIcon />}
                sx={{ mt: 2 }}
                onClick={(e) => e.stopPropagation()}
              >
                Dosya Seç
              </Button>
            </Paper>
          )}

          {activeStep === 1 && (
            <Box>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item>
                    <Chip 
                      label={file?.name} 
                      color="primary" 
                      variant="outlined" 
                      onDelete={handleReset}
                    />
                  </Grid>
                  <Grid item>
                    <Typography variant="body2" color="textSecondary">
                      {totalRows} satır bulundu
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="h6" gutterBottom>
                Veri Önizleme (İlk 100 Satır)
              </Typography>

              <Paper sx={{ width: '100%', overflow: 'auto', maxHeight: 400 }}>
                {data.length > 0 && (
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {Object.keys(data[0]).map((key) => (
                        <Chip key={key} label={key} size="small" />
                      ))}
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ overflow: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                          <tr>
                            {Object.keys(data[0]).map((key) => (
                              <th key={key} style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.map((row, index) => (
                            <tr key={index}>
                              {Object.keys(data[0]).map((key) => (
                                <td key={key} style={{ border: '1px solid #ddd', padding: 8 }}>
                                  {row[key]?.toString() || ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  </Box>
                )}
              </Paper>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  onClick={handleReset}
                  variant="outlined"
                >
                  Geri
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={importDataToDatabase}
                  disabled={isProcessing}
                  startIcon={isProcessing ? <CircularProgress size={20} /> : null}
                >
                  {isProcessing ? 'İşleniyor...' : 'Veri Tabanına Aktar'}
                </Button>
              </Box>

              {isProcessing && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
                    {progress}% Tamamlandı
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  İçe Aktarma Tamamlandı!
                </Typography>
                <Typography variant="body1" paragraph>
                  {totalRows} satır başarıyla veri tabanına aktarıldı.
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Batch ID: {batchId}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleReset}
                  startIcon={<RefreshIcon />}
                  sx={{ mt: 2 }}
                >
                  Yeni Yükleme Başlat
                </Button>
              </Paper>
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Son Yüklemeler
            </Typography>
            
            <List>
              {importHistory.length > 0 ? (
                importHistory.map((item) => (
                  <ListItem key={item.id} divider>
                    <ListItemText
                      primary={item.filename}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="textPrimary">
                            {new Date(item.import_date).toLocaleString('tr-TR')}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Chip
                              size="small"
                              label={item.successful ? 'Başarılı' : 'Başarısız'}
                              color={item.successful ? 'success' : 'error'}
                              icon={item.successful ? <CheckCircleIcon /> : <ErrorIcon />}
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="body2" color="textSecondary">
                              {item.row_count || 0} satır
                            </Typography>
                          </Box>
                        </>
                      }
                    />
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="Henüz yükleme yapılmadı" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}