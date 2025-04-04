// src/app/customers/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  TextField, InputAdornment, IconButton, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Chip, Tooltip, Button
} from '@mui/material'
import {
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  VisibilityOutlined as ViewIcon
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const router = useRouter()
  const supabase = createClient()
  
  // Müşterileri yükle
  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // İlgili son 3 ayda aktif olan müşterileri al
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth() + 1
        
        // Yıl ve ay hesaplama
        const dates = []
        for (let i = 0; i < 3; i++) {
          let month = currentMonth - i
          let year = currentYear
          
          if (month <= 0) {
            month += 12
            year -= 1
          }
          
          dates.push({ year, month })
        }
        
        // Müşteri bazlı satış özeti
        const customerPromises = dates.map(({ year, month }) => 
          supabase
            .from('monthly_customer_summaries')
            .select(`
              customer_id,
              total_sales,
              total_profit,
              total_profit_percentage,
              customers(customer_name, customer_code, sector_code)
            `)
            .eq('year', year)
            .eq('month', month)
        )
        
        const customerResults = await Promise.all(customerPromises)
        
        // Hata kontrolü
        for (const result of customerResults) {
          if (result.error) throw result.error
        }
        
        // Müşterileri birleştir ve hesapla
        const customerMap = new Map()
        
        customerResults.forEach((result, index) => {
          const { year, month } = dates[index]
          const monthKey = `m${year}_${month}`
          
          result.data?.forEach((row) => {
            if (!row.customer_id || !row.customers) return
            
            if (!customerMap.has(row.customer_id)) {
              customerMap.set(row.customer_id, {
                id: row.customer_id,
                customer_name: row.customers.customer_name,
                customer_code: row.customers.customer_code,
                sector_code: row.customers.sector_code,
                total_sales: 0,
                total_profit: 0,
                months_data: {},
                active_months: 0
              })
            }
            
            const customer = customerMap.get(row.customer_id)
            customer.total_sales += row.total_sales
            customer.total_profit += row.total_profit || 0
            customer.months_data[monthKey] = {
              total_sales: row.total_sales,
              total_profit: row.total_profit || 0,
              profit_percentage: row.total_profit_percentage || 0
            }
            customer.active_months += 1
          })
        })
        
        // En son ayı bul
        const lastMonthKey = `m${dates[0].year}_${dates[0].month}`
        const prevMonthKey = `m${dates[1].year}_${dates[1].month}`
        
        // Son değerleri hesapla
        for (const customer of customerMap.values()) {
          // Ortalama kar oranı
          customer.avg_profit_percentage = customer.total_sales > 0
            ? (customer.total_profit / customer.total_sales) * 100
            : 0
          
          // Son ay ve önceki ay değişimi
          const lastMonth = customer.months_data[lastMonthKey]
          const prevMonth = customer.months_data[prevMonthKey]
          
          if (lastMonth && prevMonth) {
            customer.sales_change_percentage = prevMonth.total_sales > 0
              ? ((lastMonth.total_sales - prevMonth.total_sales) / prevMonth.total_sales) * 100
              : 0
            
            customer.profit_change_percentage = prevMonth.total_profit > 0
              ? ((lastMonth.total_profit - prevMonth.total_profit) / prevMonth.total_profit) * 100
              : 0
          } else {
            customer.sales_change_percentage = 0
            customer.profit_change_percentage = 0
          }
          
          // Son ay değerleri
          customer.last_month_sales = lastMonth?.total_sales || 0
          customer.last_month_profit = lastMonth?.total_profit || 0
        }
        
        // Sonuçları Array'e çevir ve sırala
        const customersArray = Array.from(customerMap.values())
          .sort((a, b) => b.total_sales - a.total_sales)
        
        setCustomers(customersArray)
        setFilteredCustomers(customersArray)
      } catch (error: any) {
        console.error('Müşteri verileri yüklenirken hata:', error)
        setError('Müşteri verileri yüklenemedi. Lütfen daha sonra tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }
    
    loadCustomers()
  }, [])
  
  // Müşterileri filtreleme
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers)
      return
    }
    
    const lowercasedSearch = searchTerm.toLowerCase()
    const filtered = customers.filter(
      customer => 
        customer.customer_name.toLowerCase().includes(lowercasedSearch) ||
        customer.customer_code.toLowerCase().includes(lowercasedSearch) ||
        (customer.sector_code && customer.sector_code.toLowerCase().includes(lowercasedSearch))
    )
    
    setFilteredCustomers(filtered)
    setPage(0)
  }, [searchTerm, customers])
  
  // Sayfa değişimi
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }
  
  // Sayfa başına kayıt sayısı değişimi
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }
  
  // Müşteri detayına git
  const handleViewCustomer = (customerId: number) => {
    router.push(`/customers/${customerId}`)
  }
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Müşteri Analizi
      </Typography>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography>{error}</Typography>
        </Paper>
      )}
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Müşteri adı, kodu veya sektör kodu ile ara..."
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
          </Paper>
        </Grid>
      </Grid>
      
      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Müşteri</TableCell>
                    <TableCell align="right">Son Ay Satış</TableCell>
                    <TableCell align="right">Değişim</TableCell>
                    <TableCell align="right">3 Aylık Toplam</TableCell>
                    <TableCell align="right">Kâr Oranı (%)</TableCell>
                    <TableCell align="right">Aktif Ay</TableCell>
                    <TableCell align="center">İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCustomers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((customer) => (
                      <TableRow key={customer.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body1">{customer.customer_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {customer.customer_code} {customer.sector_code ? `(${customer.sector_code})` : ''}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          ₺{customer.last_month_sales.toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            {customer.sales_change_percentage > 0 ? (
                              <TrendingUpIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                            ) : customer.sales_change_percentage < 0 ? (
                              <TrendingDownIcon fontSize="small" color="error" sx={{ mr: a0.5 }} />
                            ) : null}
                            <Typography 
                              color={
                                customer.sales_change_percentage > 0 
                                  ? 'success.main' 
                                  : customer.sales_change_percentage < 0 
                                    ? 'error.main' 
                                    : 'text.primary'
                              }
                            >
                              %{Math.abs(customer.sales_change_percentage).toFixed(1)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">₺{customer.total_sales.toLocaleString('tr-TR')}</TableCell>
                        <TableCell align="right">
                          {customer.avg_profit_percentage.toFixed(1)}%
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={`${customer.active_months}/3`}
                            color={
                              customer.active_months === 3 
                                ? 'success' 
                                : customer.active_months === 2 
                                  ? 'primary' 
                                  : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Müşteri Detayı">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewCustomer(customer.id)}
                              startIcon={<ViewIcon />}
                            >
                              Detay
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  
                  {filteredCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <Typography variant="body1" color="text.secondary">
                          {searchTerm
                            ? 'Arama kriterlerine uygun müşteri bulunamadı.'
                            : 'Henüz müşteri kaydı bulunmuyor.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredCustomers.length}
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