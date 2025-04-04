// src/app/categories/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardHeader,
  Divider, List, ListItem, ListItemText, Chip, Button,
  CircularProgress, Tab, Tabs, useTheme, Avatar
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Category as CategoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts'
import { format, subMonths, parseISO, isAfter } from 'date-fns'
import { tr } from 'date-fns/locale'

// Tab paneli arayüzü
interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

// Tab paneli bileşeni
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`category-tabpanel-${index}`}
      aria-labelledby={`category-tab-${index}`}
      {...other}
      style={{ paddingTop: '20px' }}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

// Ana bileşen
export default function CategoryDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const theme = useTheme()
  const [category, setCategory] = useState<any | null>(null)
  const [monthlySales, setMonthlySales] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const supabase = createClient()
  
  // Sekme değişimi
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }
  
  // Kategori detaylarını yükle
  useEffect(() => {
    const loadCategoryDetails = async () => {
      if (!id) return
      
      setLoading(true)
      setError(null)
      
      try {
        // 1. Kategori bilgilerini al
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', id)
          .single()
        
        if (categoryError) throw categoryError
        
        setCategory(categoryData)
        
        // 2. Aylık satış verilerini al (son 12 ay)
        const now = new Date()
        const monthPromises = []
        
        for (let i = 0; i < 12; i++) {
          const targetDate = subMonths(now, i)
          const year = targetDate.getFullYear()
          const month = targetDate.getMonth() + 1
          
          monthPromises.push(
            supabase
              .from('monthly_category_summaries')
              .select('year, month, total_sales, total_profit, total_profit_percentage')
              .eq('year', year)
              .eq('month', month)
              .eq('category_id', id)
          )
        }
        
        const monthResults = await Promise.all(monthPromises)
        
        // Hata kontrolü
        monthResults.forEach((result) => {
          if (result.error) console.error('Ay verileri alınırken hata:', result.error)
        })
        
        // Ay bazında verileri birleştir
        const monthlyMap = new Map()
        
        monthResults.forEach((result, index) => {
          const targetDate = subMonths(now, index)
          const year = targetDate.getFullYear()
          const month = targetDate.getMonth() + 1
          const monthKey = `${year}-${month}`
          
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, {
              date: targetDate,
              year,
              month,
              period: format(targetDate, 'MMM yyyy', { locale: tr }),
              total_sales: 0,
              total_profit: 0,
              profit_percentage: 0
            })
          }
          
          // Her haftanın verilerini topla
          result.data?.forEach((row) => {
            const month = monthlyMap.get(monthKey)
            month.total_sales += row.total_sales
            month.total_profit += row.total_profit || 0
            
            // Ortalama kâr yüzdesini hesapla
            if (month.total_sales > 0) {
              month.profit_percentage = (month.total_profit / month.total_sales) * 100
            }
          })
        })
        
        const formattedMonthData = Array.from(monthlyMap.values())
          .sort((a, b) => a.date.getTime() - b.date.getTime())
        
        setMonthlySales(formattedMonthData)
        
        // 3. En çok satın alan müşterileri al
        const { data: customerData, error: customerError } = await supabase
          .from('monthly_category_summaries')
          .select(`
            customer_id,
            total_sales,
            total_profit,
            customers(customer_name, customer_code)
          `)
          .eq('category_id', id)
          .order('total_sales', { ascending: false })
        
        if (customerError) throw customerError
        
        // Müşterileri grupla
        const customerMap = new Map()
        
        customerData?.forEach((row) => {
          if (!row.customer_id || !row.customers) return
          
          if (!customerMap.has(row.customer_id)) {
            customerMap.set(row.customer_id, {
              id: row.customer_id,
              customer_name: row.customers.customer_name,
              customer_code: row.customers.customer_code,
              total_sales: 0,
              total_profit: 0
            })
          }
          
          const customer = customerMap.get(row.customer_id)
          customer.total_sales += row.total_sales
          customer.total_profit += row.total_profit || 0
        })
        
        // İlk 10 müşteriyi al
        const topCustomersList = Array.from(customerMap.values())
          .sort((a, b) => b.total_sales - a.total_sales)
          .slice(0, 10)
        
        setTopCustomers(topCustomersList)
        
        // 4. Kategorideki en çok satan ürünleri al
        const { data: productData, error: productError } = await supabase
          .from('sales_transactions')
          .select(`
            product_id,
            quantity,
            total_amount,
            pre_sale_total_profit,
            products(product_name, product_code)
          `)
          .eq('products.category_id', id)
          .order('total_amount', { ascending: false })
          .limit(100)
        
        if (productError) throw productError
        
        // Ürünleri grupla
        const productMap = new Map()
        
        productData?.forEach((transaction) => {
          if (!transaction.product_id || !transaction.products) return
          
          if (!productMap.has(transaction.product_id)) {
            productMap.set(transaction.product_id, {
              id: transaction.product_id,
              product_name: transaction.products.product_name,
              product_code: transaction.products.product_code,
              total_sales: 0,
              total_profit: 0,
              quantity: 0,
              transaction_count: 0
            })
          }
          
          const product = productMap.get(transaction.product_id)
          product.total_sales += transaction.total_amount
          product.total_profit += transaction.pre_sale_total_profit || 0
          product.quantity += transaction.quantity
          product.transaction_count += 1
        })
        
        // İlk 10 ürünü al
        const topProductsList = Array.from(productMap.values())
          .sort((a, b) => b.total_sales - a.total_sales)
          .slice(0, 10)
        
        setTopProducts(topProductsList)
        
      } catch (error: any) {
        console.error('Kategori detayları yüklenirken hata:', error)
        setError('Kategori detayları yüklenemedi. Lütfen daha sonra tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }
    
    loadCategoryDetails()
  }, [id])
  
  // Geri dön
  const goBack = () => {
    router.back()
  }
  
  // Müşteri detayına git
  const goToCustomerDetail = (customerId: number) => {
    router.push(`/customers/${customerId}`)
  }
  
  // Grafik için rastgele renkler
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658']
  
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={goBack}
          sx={{ mr: 2 }}
        >
          Geri
        </Button>
        <Typography variant="h4" component="h1">
          Kategori Detayı
        </Typography>
      </Box>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography>{error}</Typography>
        </Paper>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 56, height: 56 }}>
                      <CategoryIcon sx={{ fontSize: 30 }} />
                    </Avatar>
                  </Grid>
                  <Grid item xs>
                    <Typography variant="h5" gutterBottom>
                      {category?.category_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Kategori ID: {category?.id}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="category tabs">
              <Tab label="Satış Trendi" id="category-tab-0" />
              <Tab label="En Çok Satan Ürünler" id="category-tab-1" />
              <Tab label="En Çok Alan Müşteriler" id="category-tab-2" />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    Aylık Satış ve Kâr Trendi
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <AreaChart data={monthlySales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis yAxisId="left" orientation="left" stroke="#1976d2" />
                      <YAxis yAxisId="right" orientation="right" stroke="#2e7d32" />
                      <Tooltip formatter={(value) => `₺${Number(value).toLocaleString('tr-TR')}`} />
                      <Legend />
                      <Area 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="total_sales" 
                        name="Satış" 
                        stroke="#1976d2"
                        fill="#1976d2"
                        fillOpacity={0.3}
                      />
                      <Area 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="total_profit" 
                        name="Kâr" 
                        stroke="#2e7d32"
                        fill="#2e7d32"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper sx={{ p: 2, height: 300 }}>
                  <Typography variant="h6" gutterBottom>
                    Kâr Oranı (%)
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={monthlySales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis domain={[0, 'dataMax + 5']} />
                      <Tooltip formatter={(value) => `%${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="profit_percentage" 
                        name="Kâr Oranı" 
                        stroke="#9c27b0" 
                        strokeWidth={2}
                        dot={{ r: 4 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    En Çok Satan Ürünler
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart 
                      data={topProducts}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="product_name" 
                        width={90}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip formatter={(value) => `₺${Number(value).toLocaleString('tr-TR')}`} />
                      <Legend />
                      <Bar dataKey="total_sales" name="Satış" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    Ürün Kârlılığı
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart 
                      data={topProducts.map(product => ({
                        ...product,
                        profit_percentage: product.total_sales > 0 
                          ? (product.total_profit / product.total_sales) * 100 
                          : 0
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="product_name" 
                        width={90}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip formatter={(value) => `%${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="profit_percentage" name="Kâr Oranı (%)" fill="#9c27b0" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper>
                  <List>
                    {topProducts.map((product) => (
                      <ListItem key={product.id} divider>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={5}>
                            <ListItemText
                              primary={product.product_name}
                              secondary={`Ürün Kodu: ${product.product_code}`}
                            />
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <Typography variant="body2" color="text.secondary">
                              Toplam Satış
                            </Typography>
                            <Typography variant="body1">
                              ₺{product.total_sales.toLocaleString('tr-TR')}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <Typography variant="body2" color="text.secondary">
                              Toplam Kâr
                            </Typography>
                            <Typography variant="body1">
                              ₺{product.total_profit.toLocaleString('tr-TR')}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={1}>
                            <Typography variant="body2" color="text.secondary">
                              Miktar
                            </Typography>
                            <Typography variant="body1">
                              {product.quantity.toLocaleString('tr-TR')}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <Typography variant="body2" color="text.secondary">
                              Kâr Oranı
                            </Typography>
                            <Typography variant="body1">
                              %{product.total_sales > 0 
                                ? ((product.total_profit / product.total_sales) * 100).toFixed(2) 
                                : '0.00'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                    ))}
                    
                    {topProducts.length === 0 && (
                      <ListItem>
                        <ListItemText 
                          primary="Ürün verisi bulunamadı" 
                          secondary="Bu kategori için henüz ürün satış verisi bulunmuyor."
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    En Çok Alan Müşteriler
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart 
                      data={topCustomers}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="customer_name" 
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip formatter={(value) => `₺${Number(value).toLocaleString('tr-TR')}`} />
                      <Legend />
                      <Bar dataKey="total_sales" name="Satış" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    Müşteri Dağılımı
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={topCustomers}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: %${(percent * 100).toFixed(0)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total_sales"
                        nameKey="customer_name"
                      >
                        {topCustomers.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₺${Number(value).toLocaleString('tr-TR')}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper>
                  <List>
                    {topCustomers.map((customer) => (
                      <ListItem key={customer.id} divider>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={6}>
                            <ListItemText
                              primary={customer.customer_name}
                              secondary={`Müşteri Kodu: ${customer.customer_code}`}
                            />
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <Typography variant="body2" color="text.secondary">
                              Toplam Satış
                            </Typography>
                            <Typography variant="body1">
                              ₺{customer.total_sales.toLocaleString('tr-TR')}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <Typography variant="body2" color="text.secondary">
                              Toplam Kâr
                            </Typography>
                            <Typography variant="body1">
                              ₺{customer.total_profit.toLocaleString('tr-TR')}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<PersonIcon />}
                              onClick={() => goToCustomerDetail(customer.id)}
                            >
                              Müşteri Detayı
                            </Button>
                          </Grid>
                        </Grid>
                      </ListItem>
                    ))}
                    
                    {topCustomers.length === 0 && (
                      <ListItem>
                        <ListItemText 
                          primary="Müşteri verisi bulunamadı" 
                          secondary="Bu kategori için henüz müşteri satış verisi bulunmuyor."
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </>
      )}
    </Box>
  )
}