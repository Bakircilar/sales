// src/app/data-check/page.tsx - Tam ve güncel hali
'use client'

import { useState, useEffect } from 'react'
import {
  Box, Typography, Paper, Grid, TextField, InputAdornment, 
  IconButton, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, CircularProgress,
  TableSortLabel, Card, CardContent, Chip, Button, Alert
} from '@mui/material'
import {
  Search as SearchIcon,
  Warning as WarningIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-toastify'

export default function DataCheckPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [summary, setSummary] = useState({
    totalRecords: 0,
    totalAmount: 0,
    totalCustomers: 0,
    totalProducts: 0
  })
  
  const supabase = createClient()
  
  // Sayfalama (pagination) kullanarak sınırsız veri aktarma
  const exportToExcel = async () => {
    try {
      // Yükleniyor göstergesini aç
      setLoading(true);
      
      // Kullanıcıyı bilgilendir
      toast.info('Excel hazırlanıyor, bu işlem büyük veri setlerinde zaman alabilir...');
      
      // Toplam kayıt sayısını al
      const { count, error: countError } = await supabase
        .from('sales_transactions')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      if (!count || count === 0) {
        toast.error('Dışa aktarılacak veri bulunamadı');
        setLoading(false);
        return;
      }
      
      console.log(`Toplam ${count} kayıt aktarılacak`);
      
      // Sayfalama için değişkenler
      const pageSize = 1000; // Her sayfada 1000 kayıt
      const totalPages = Math.ceil(count / pageSize);
      let allData = [];
      
      // İlerleme durumunu göster
      const progressUpdate = (page, total) => {
        const percentage = Math.round((page / total) * 100);
        console.log(`Veri çekiliyor: %${percentage} (${page}/${total} sayfa)`);
        
        // İsteğe bağlı: İlerleme durumunu kullanıcıya göster
        toast.update('excel-progress', { 
          render: `Veriler aktarılıyor: %${percentage}`, 
          progress: percentage / 100 
        });
      };
      
      // Toast göstergesi oluştur
      const toastId = toast.loading('Veriler Excel için hazırlanıyor...', { 
        toastId: 'excel-progress' 
      });
      
      // Sayfalar halinde verileri çek
      for (let page = 0; page < totalPages; page++) {
        progressUpdate(page + 1, totalPages);
        
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        const { data: pageData, error: pageError } = await supabase
          .from('sales_transactions')
          .select(`
            id,
            document_date,
            document_number,
            quantity,
            unit_price,
            total_amount,
            pre_sale_total_profit,
            customers (
              id,
              customer_code,
              customer_name
            ),
            products (
              id,
              product_code,
              product_name,
              category_id,
              categories (
                id,
                category_name
              )
            )
          `)
          .order('document_date', { ascending: false })
          .range(from, to);
        
        if (pageError) throw pageError;
        
        if (pageData && pageData.length > 0) {
          allData = [...allData, ...pageData];
        }
      }
      
      console.log(`Toplam ${allData.length} kayıt çekildi, Excel'e aktarılıyor...`);
      
      // Verileri Excel formatına dönüştür
      const exportData = allData.map(t => ({
        "ID": t.id || '',
        "Belge No": t.document_number || '',
        "Tarih": t.document_date ? new Date(t.document_date).toLocaleDateString('tr-TR') : '',
        "Müşteri Kodu": t.customers?.customer_code || '',
        "Müşteri Adı": t.customers?.customer_name || '',
        "Ürün Kodu": t.products?.product_code || '',
        "Ürün Adı": t.products?.product_name || '',
        "Kategori": t.products?.categories?.category_name || '',
        "Miktar": t.quantity || 0,
        "Birim Fiyat": t.unit_price || 0,
        "Toplam Tutar": t.total_amount || 0,
        "Kar": t.pre_sale_total_profit || 0
      }));
      
      // Excel çalışma kitabı oluştur
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Veriler");
      
      // Kolon genişliklerini ayarla
      const colWidths = [
        { wch: 8 },   // ID
        { wch: 15 },  // Belge No
        { wch: 12 },  // Tarih
        { wch: 15 },  // Müşteri Kodu
        { wch: 30 },  // Müşteri Adı
        { wch: 15 },  // Ürün Kodu
        { wch: 40 },  // Ürün Adı
        { wch: 20 },  // Kategori
        { wch: 10 },  // Miktar
        { wch: 15 },  // Birim Fiyat
        { wch: 15 },  // Toplam Tutar
        { wch: 15 }   // Kar
      ];
      worksheet['!cols'] = colWidths;
      
      // Dosyayı indir
      XLSX.writeFile(workbook, "veri_karsilastirma.xlsx");
      
      // Başarı mesajı göster
      toast.update(toastId, { 
        render: `${allData.length} kayıt başarıyla Excel'e aktarıldı`, 
        type: 'success',
        isLoading: false,
        autoClose: 5000,
        closeButton: true
      });
      
    } catch (error) {
      console.error('Excel dışa aktarma hatası:', error);
      toast.error('Excel dışa aktarma sırasında bir hata oluştu: ' + error);
    } finally {
      setLoading(false);
    }
  };

  // Değerleri yükle
  useEffect(() => {
    const loadTransactionData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Sayfa yüklendiğinde kaç kayıt alınacağını belirle
        // Önce toplam kayıt sayısını al
        const { count, error: countError } = await supabase
          .from('sales_transactions')
          .select('*', { count: 'exact', head: true })
        
        if (countError) throw countError
        
        console.log(`Toplam kayıt sayısı: ${count}`);
        
        // Tüm işlemleri müşteri ve ürün bilgileriyle birlikte al (limitsiz)
        const { data, error } = await supabase
          .from('sales_transactions')
          .select(`
            id,
            document_date,
            document_number,
            quantity,
            unit_price,
            total_amount,
            pre_sale_total_profit,
            customers (
              id,
              customer_code,
              customer_name
            ),
            products (
              id,
              product_code,
              product_name,
              category_id,
              categories (
                id,
                category_name
              )
            )
          `)
          .order('document_date', { ascending: false })
          .limit(1000) // UI performansı için ilk 1000 kayıt
        
        if (error) throw error
        
        setTransactions(data || [])
        setFilteredTransactions(data || [])
        
        // Özet hesapla
        const totalAmount = data?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0
        const uniqueCustomers = new Set(data?.map(item => item.customers?.id).filter(id => id !== undefined))
        const uniqueProducts = new Set(data?.map(item => item.products?.id).filter(id => id !== undefined))
        
        setSummary({
          totalRecords: count || data?.length || 0,
          totalAmount,
          totalCustomers: uniqueCustomers.size,
          totalProducts: uniqueProducts.size
        })
        
      } catch (error: any) {
        console.error('Veri yüklenirken hata:', error)
        setError('Veriler yüklenemedi: ' + error.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadTransactionData()
  }, [])
  
  // Filtreleme
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTransactions(transactions)
      return
    }
    
    const lowercasedSearch = searchTerm.toLowerCase()
    const filtered = transactions.filter(
      transaction => {
        return (
          (transaction.customers?.customer_name || '').toLowerCase().includes(lowercasedSearch) ||
          (transaction.customers?.customer_code || '').toLowerCase().includes(lowercasedSearch) ||
          (transaction.products?.product_name || '').toLowerCase().includes(lowercasedSearch) ||
          (transaction.products?.product_code || '').toLowerCase().includes(lowercasedSearch) ||
          (transaction.document_number || '').toLowerCase().includes(lowercasedSearch)
        )
      }
    )
    
    setFilteredTransactions(filtered)
    setPage(0)
  }, [searchTerm, transactions])
  
  // Sayfa değişimi
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }
  
  // Sayfa başına kayıt sayısı değişimi
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Veri Karşılaştırma
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Toplam Kayıt
              </Typography>
              <Typography variant="h4">
                {summary.totalRecords.toLocaleString('tr-TR')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Toplam Tutar
              </Typography>
              <Typography variant="h4">
                ₺{summary.totalAmount.toLocaleString('tr-TR')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Müşteri Sayısı
              </Typography>
              <Typography variant="h4">
                {summary.totalCustomers.toLocaleString('tr-TR')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ürün Sayısı
              </Typography>
              <Typography variant="h4">
                {summary.totalProducts.toLocaleString('tr-TR')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Müşteri adı, kodu veya ürün adı ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setSearchTerm('')} size="small">
                      X
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<FileDownloadIcon />}
              onClick={exportToExcel}
              disabled={loading || filteredTransactions.length === 0}
            >
              Excel'e Aktar ({summary.totalRecords} Kayıt)
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Bu sayfada veri tabanındaki son 1000 kayıt gösterilmektedir. Tüm verileri Excel'e aktarmak için "Excel'e Aktar" butonunu kullanabilirsiniz.
      </Alert>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon sx={{ mr: 1 }} />
            <Typography>{error}</Typography>
          </Box>
        </Paper>
      )}
      
      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 640 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Belge No</TableCell>
                    <TableCell>Tarih</TableCell>
                    <TableCell>Müşteri Kodu</TableCell>
                    <TableCell>Müşteri Adı</TableCell>
                    <TableCell>Ürün Kodu</TableCell>
                    <TableCell>Ürün Adı</TableCell>
                    <TableCell>Kategori</TableCell>
                    <TableCell align="right">Miktar</TableCell>
                    <TableCell align="right">Birim Fiyat</TableCell>
                    <TableCell align="right">Toplam Tutar</TableCell>
                    <TableCell align="right">Kar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 5 }}>
                        <CircularProgress size={40} />
                        <Typography variant="body2" sx={{ mt: 2 }}>
                          Veriler yükleniyor... Bu işlem büyük veri setlerinde zaman alabilir.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((transaction) => (
                      <TableRow key={transaction.id} hover>
                        <TableCell>{transaction.document_number || '-'}</TableCell>
                        <TableCell>
                          {transaction.document_date ? 
                            new Date(transaction.document_date).toLocaleDateString('tr-TR') : 
                            '-'}
                        </TableCell>
                        <TableCell>{transaction.customers?.customer_code || '-'}</TableCell>
                        <TableCell>{transaction.customers?.customer_name || '-'}</TableCell>
                        <TableCell>{transaction.products?.product_code || '-'}</TableCell>
                        <TableCell>{transaction.products?.product_name || '-'}</TableCell>
                        <TableCell>
                          {transaction.products?.categories?.category_name ? (
                            <Chip 
                              label={transaction.products.categories.category_name} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {transaction.quantity?.toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell align="right">
                          ₺{transaction.unit_price?.toLocaleString('tr-TR') || '0.00'}
                        </TableCell>
                        <TableCell align="right">
                          ₺{transaction.total_amount?.toLocaleString('tr-TR') || '0.00'}
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          color: (transaction.pre_sale_total_profit || 0) > 0 ? 'success.main' : 'error.main'
                        }}>
                          ₺{transaction.pre_sale_total_profit?.toLocaleString('tr-TR') || '0.00'}
                        </TableCell>
                      </TableRow>
                    ))}
                  
                  {!loading && filteredTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        {searchTerm 
                          ? 'Arama kriterlerine uygun kayıt bulunamadı'
                          : 'Henüz işlem kaydı bulunmuyor'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              rowsPerPageOptions={[20, 50, 100]}
              component="div"
              count={filteredTransactions.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Sayfa başına satır:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            />
          </>
        )}
      </Paper>
    </Box>
  )
}