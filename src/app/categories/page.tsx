// src/app/categories/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Typography, Paper, Grid, TextField, InputAdornment, 
  IconButton, CircularProgress, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TablePagination, TableSortLabel,
  Chip, Tooltip, Button, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent
} from '@mui/material'
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  VisibilityOutlined as ViewIcon,
  Sort as SortIcon
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

// Ana bileşen
export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [filteredCategories, setFilteredCategories] = useState<any[]>([])
  const [topSellingProducts, setTopSellingProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [timeRange, setTimeRange] = useState('3') // Son 3 ay
  const [sortBy, setSortBy] = useState('sales') // Satış miktarına göre sırala
  const [sortOrder, setSortOrder] = useState('desc') // Azalan sırada
  const router = useRouter()
  const supabase = createClient()
  
  // Kategorileri yükle
  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Son X aydaki kategorileri al
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth() + 1
        
        // Yıl ve ay hesaplama
        const dates = []
        const monthsToFetch = parseInt(timeRange)
        
        for (let i = 0; i < monthsToFetch; i++) {
          let month = currentMonth - i
          let year = currentYear
          
          if (month <= 0) {
            month += 12
            year -= 1
          }
          
          dates.push({ year, month })
        }
        
        // Kategori bazlı satış özeti
        const categoryPromises = dates.map(({ year, month }) => 
          supabase
            .from('monthly_category_summaries')
            .select(`
              category_id,
              total_sales,
              total_profit,
              total_profit_percentage,
              categories(category_name)
            `)
            .eq('year', year)
            .eq('month', month)
        )
        
        const categoryResults = await Promise.all(categoryPromises)
        
        // Hata kontrolü
        for (const result of categoryResults) {
          if (result.error) throw result.error
        }
        
        // Kategorileri birleştir ve hesapla
        const categoryMap = new Map()
        
        categoryResults.forEach((result, index) => {
          const { year, month } = dates[index]
          const monthKey = `m${year}_${month}`
          
          result.data?.forEach((row) => {
            if (!row.category_id || !row.categories) return
            
            if (!categoryMap.has(row.category_id)) {
              categoryMap.set(row.category_id, {
                id: row.category_id,
                category_name: row.categories.category_name,
                total_sales: 0,
                total_profit: 0,
                months_data: {},
                active_months: 0,
                customer_count: new Set()
              })
            }
            
            const category = categoryMap.get(row.category_id)
            category.total_sales += row.total_sales
            category.total_profit += row.total_profit || 0
            
            if (!category.months_data[monthKey]) {
              category.months_data[monthKey] = {
                total_sales: 0,
                total_profit: 0,
                profit_percentage: 0
              }
              category.active_months += 1
            }
            
            category.months_data[monthKey].total_sales += row.total_sales
            category.months_data[monthKey].total_profit += row.total_profit || 0
            
            // Müşteri sayısını takip etmek için müşteri ID'lerini ekle
            if (row.customer_id) {
              category.customer_count.add(row.customer_id)
            }
          })
        })
        
        // En son ayı bul
        const lastMonthKey = `m${dates[0].year}_${dates[0].month}`
        const prevMonthKey = dates.length > 1 ? `m${dates[1].year}_${dates[1].month}` : null
        
        // Son değerleri hesapla
        for (const category of categoryMap.values()) {
          // Ortalama kar oranı
          category.avg_profit_percentage = category.total_sales > 0
            ? (category.total_profit / category.total_sales) * 100
            : 0
          
          // Son ay ve önceki ay değişimi
          const lastMonth = category.months_data[lastMonthKey]
          const prevMonth = prevMonthKey ? category.months_data[prevMonthKey] : null
          
          if (lastMonth && prevMonth) {
            category.sales_change_percentage = prevMonth.total_sales > 0
              ? ((lastMonth.total_sales - prevMonth.total_sales) / prevMonth.total_sales) * 100
              : 0
            
            category.profit_change_percentage = prevMonth.total_profit > 0
              ? ((lastMonth.total_profit - prevMonth.total_profit) / prevMonth.total_profit) * 100
              : 0
          } else {
            category.sales_change_percentage = 0
            category.profit_change_percentage = 0
          }
          
          // Son ay değerleri
          category.last_month_sales = lastMonth?.total_sales || 0
          category.last_month_profit = lastMonth?.total_profit || 0
          
          // Müşteri sayısını ayarla
          category.customer_count = category.customer_count.size
        }
        
        // Sonuçları Array'e çevir
        let categoriesArray = Array.from(categoryMap.values())
        
        // Sıralama
        categoriesArray = sortCategories(categoriesArray, sortBy, sortOrder)
        
        setCategories(categoriesArray)
        setFilteredCategories(categoriesArray)
        
        // En çok satan ürünleri al
        await loadTopSellingProducts()
        
      } catch (error: any) {
        console.error('Kategori verileri yüklenirken hata:', error)
        setError('Kategori verileri yüklenemedi. Lütfen daha sonra tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }
    
    const loadTopSellingProducts = async () => {
      try {
        // Son ayda en çok satan ürünleri al
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth() + 1
        
        // Önceki ay hesapla
        let prevMonth = currentMonth - 1
        let prevYear = currentYear
        
        if (prevMonth <= 0) {
          prevMonth += 12
          prevYear -= 1
        }
        
        // Son ay satış işlemlerini al
        const { data: productData, error: productError } = await supabase
          .from('sales_transactions')
          .select(`
            product_id,
            total_amount,
            products(product_name, category_id, categories(category_name))
          `)
          .gte('document_date', `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`)
          .order('total_amount', { ascending: false })
          .limit(100)
        
        if (productError) throw productError
        
        // Ürünleri grupla
        const productMap = new Map()
        
        productData?.forEach((transaction) => {
          if (!transaction.product_id || !transaction.products) return
          
          const productId = transaction.product_id
          const productName = transaction.products.product_name
          const categoryId = transaction.products.category_id
          const categoryName = transaction.products.categories?.category_name || 'Bilinmeyen'
          
          if (!productMap.has(productId)) {
            productMap.set(productId, {
              id: productId,
              product_name: productName,
              category_id: categoryId,
              category_name: categoryName,
              total_sales: 0,
              transaction_count: 0
            })
          }
          
          const product = productMap.get(productId)
          product.total_sales += transaction.total_amount
          product.transaction_count += 1
        })
        
        // İlk 10 ürünü al
        const topProducts = Array.from(productMap.values())
          .sort((a, b) => b.total_sales - a.total_sales)
          .slice(0, 10)
        
        setTopSellingProducts(topProducts)
        
      } catch (error: any) {
        console.error('Ürün verileri yüklenirken hata:', error)
      }
    }
    
    loadCategories()
  }, [timeRange])
  
  // Kategorileri filtrele
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCategories(categories)
      return
    }
    
    const lowercasedSearch = searchTerm.toLowerCase()
    const filtered = categories.filter(
      category => category.category_name.toLowerCase().includes(lowercasedSearch)
    )
    
    setFilteredCategories(filtered)
    setPage(0)
  }, [searchTerm, categories])
  
  // Kategorileri sırala
  useEffect(() => {
    const sorted = sortCategories([...filteredCategories], sortBy, sortOrder)
    setFilteredCategories(sorted)
  }, [sortBy, sortOrder])
  
  // Sıralama fonksiyonu
  const sortCategories = (categoryArray: any[], sortField: string, order: string) => {
    const sorted = [...categoryArray].sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'name':
          comparison = a.category_name.localeCompare(b.category_name)
          break
        case 'sales':
          comparison = a.total_sales - b.total_sales
          break
        case 'profit':
          comparison = a.total_profit - b.total_profit
          break
        case 'profit_percentage':
          comparison = a.avg_profit_percentage - b.avg_profit_percentage
          break
        case 'customer_count':
          comparison = a.customer_count - b.customer_count
          break
        case 'change':
          comparison = a.sales_change_percentage - b.sales_change_percentage
          break
        default:
          comparison = a.total_sales - b.total_sales
      }
      
      return order === 'asc' ? comparison : -comparison
    })
    
    return sorted
  }
  
  // Sıralama yönünü değiştir
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }
  
  // Sayfa değişimi
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }
  
  // Sayfa başına kayıt sayısı değişimi
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }
  
  // Kategori detayına git
  const handleViewCategory = (categoryId: number) => {
    router.push(`/categories/${categoryId}`)
  }
  
  // Zaman aralığı değişimi
  const handleTimeRangeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setTimeRange(event.target.value as string)
  }
  
  // Grafik için rastgele renkler
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658']
  
  // Üst kategorileri grafik için formatlama
  const topCategoriesChart = filteredCategories
    .slice(0, 6)
    .map(category => ({
      name: category.category_name,
      sales: category.total_sales,
      profit: category.total_profit
    }))
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Kategori Analizi
      </Typography>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography>{error}</Typography>
        </Paper>
      )}
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Kategori adı ile ara..."
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
                sx={{ mr: 2 }}
              />
              
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel id="time-range-label">Dönem</InputLabel>
                <Select
                  labelId="time-range-label"
                  id="time-range-select"
                  value={timeRange}
                  label="Dönem"
                  onChange={handleTimeRangeChange}
                >
                  <MenuItem value="1">Son 1 Ay</MenuItem>
                  <MenuItem value="3">Son 3 Ay</MenuItem>
                  <MenuItem value="6">Son 6 Ay</MenuItem>
                  <MenuItem value="12">Son 12 Ay</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Toplam Kategori
            </Typography>
            <Typography variant="h4">
              {loading ? <CircularProgress size={20} /> : filteredCategories.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              En Çok Satan Kategoriler
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={topCategoriesChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => `₺${Number(value).toLocaleString('tr-TR')}`} />
                  <Legend />
                  <Bar dataKey="sales" name="Satış" fill="#1976d2" />
                  <Bar dataKey="profit" name="Kâr" fill="#2e7d32" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              En Çok Satan Ürünler
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ height: '90%', overflowY: 'auto' }}>
                {topSellingProducts.map((product, index) => (
                  <Card key={product.id} sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                      <Grid container alignItems="center">
                        <Grid item xs={1}>
                          <Typography variant="body1" color="text.secondary">
                            {index + 1}
                          </Typography>
                        </Grid>
                        <Grid item xs={7}>
                          <Typography variant="body2" noWrap>
                            {product.product_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.category_name}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" align="right">
                            ₺{product.total_sales.toLocaleString('tr-TR')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
                
                {topSellingProducts.length === 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      Ürün verisi bulunamadı
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
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
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'name'}
                        direction={sortBy === 'name' ? sortOrder as 'asc' | 'desc' : 'asc'}
                        onClick={() => handleSort('name')}
                      >
                        Kategori Adı
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortBy === 'sales'}
                        direction={sortBy === 'sales' ? sortOrder as 'asc' | 'desc' : 'desc'}
                        onClick={() => handleSort('sales')}
                      >
                        Toplam Satış
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortBy === 'profit'}
                        direction={sortBy === 'profit' ? sortOrder as 'asc' | 'desc' : 'desc'}
                        onClick={() => handleSort('profit')}
                      >
                        Toplam Kâr
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortBy === 'profit_percentage'}
                        direction={sortBy === 'profit_percentage' ? sortOrder as 'asc' | 'desc' : 'desc'}
                        onClick={() => handleSort('profit_percentage')}
                      >
                        Kâr Oranı (%)
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortBy === 'change'}
                        direction={sortBy === 'change' ? sortOrder as 'asc' | 'desc' : 'desc'}
                        onClick={() => handleSort('change')}
                      >
                        Değişim
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortBy === 'customer_count'}
                        direction={sortBy === 'customer_count' ? sortOrder as 'asc' | 'desc' : 'desc'}
                        onClick={() => handleSort('customer_count')}
                      >
                        Müşteri Sayısı
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCategories
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((category) => (
                      <TableRow key={category.id} hover>
                        <TableCell>
                          <Typography variant="body1">
                            {category.category_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          ₺{category.total_sales.toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell align="right">
                          ₺{category.total_profit.toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell align="right">
                          {category.avg_profit_percentage.toFixed(1)}%
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            {category.sales_change_percentage > 0 ? (
                              <TrendingUpIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                            ) : category.sales_change_percentage < 0 ? (
                              <TrendingDownIcon fontSize="small" color="error" sx={{ mr: 0.5 }} />
                            ) : null}
                            <Typography 
                              color={
                                category.sales_change_percentage > 0 
                                  ? 'success.main' 
                                  : category.sales_change_percentage < 0 
                                    ? 'error.main' 
                                    : 'text.primary'
                              }
                            >
                              %{Math.abs(category.sales_change_percentage).toFixed(1)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {category.customer_count}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Kategori Detayı">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewCategory(category.id)}
                              startIcon={<ViewIcon />}
                            >
                              Detay
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  
                  {filteredCategories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <Typography variant="body1" color="text.secondary">
                          {searchTerm
                            ? 'Arama kriterlerine uygun kategori bulunamadı.'
                            : 'Henüz kategori kaydı bulunmuyor.'}
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
              count={filteredCategories.length}
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