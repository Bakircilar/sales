// src/app/customers/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardHeader,
  Divider, List, ListItem, ListItemText, Chip, Button,
  CircularProgress, Tab, Tabs, useTheme
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Category as CategoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { format, subMonths, isAfter } from 'date-fns'
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
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
      style={{ paddingTop: '20px' }}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const theme = useTheme()
  const [customer, setCustomer] = useState<any | null>(null)
  const [monthlySales, setMonthlySales] = useState<any[]>([])
  const [categorySales, setCategorySales] = useState<any[]>([])
  const [riskCategories, setRiskCategories] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const supabase = createClient()
  
  // Sekme değişimi
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }
  
  // Müşteri detaylarını yükle
  useEffect(() => {
    const loadCustomerDetails = async () => {
      if (!id) return
      
      setLoading(true)
      setError(null)
      
      try {
        // 1. Müşteri bilgilerini al
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .single()
        
        if (customerError) throw customerError
        
        setCustomer(customerData)
        
        // 2. Aylık satış verilerini al (son 12 ay)
        const now = new Date()
        const monthPromises = []
        
        for (let i = 0; i < 12; i++) {
          const targetDate = subMonths(now, i)
          const year = targetDate.getFullYear()
          const month = targetDate.getMonth() + 1
          
          monthPromises.push(
            supabase
              .from('monthly_customer_summaries')
              .select('year, month, total_sales, total_profit, total_profit_percentage')
              .eq('year', year)
              .eq('month', month)
              .eq('customer_id', id)
              .maybeSingle()
          )
        }
        
        const monthResults = await Promise.all(monthPromises)
        
        // Hata kontrolü
        monthResults.forEach((result) => {
          if (result.error) console.error('Ay verileri alınırken hata:', result.error)
        })
        
        // Ayları formatlama
        const formattedMonthData = monthResults
          .map((result, index) => {
            const targetDate = subMonths(now, index)
            
            if (!result.data) {
              return {
                date: targetDate,
                year: targetDate.getFullYear(),
                month: targetDate.getMonth() + 1,
                period: format(targetDate, 'MMM yyyy', { locale: tr }),
                total_sales: 0,
                total_profit: 0,
                profit_percentage: 0
              }
            }
            
            return {
              date: targetDate,
              year: result.data.year,
              month: result.data.month,
              period: format(targetDate, 'MMM yyyy', { locale: tr }),
              total_sales: result.data.total_sales || 0,
              total_profit: result.data.total_profit || 0,
              profit_percentage: result.data.total_profit_percentage || 0
            }
          })
          .sort((a, b) => a.date.getTime() - b.date.getTime())
        
        setMonthlySales(formattedMonthData)
        
        // 3. Kategori verilerini al
        const { data: categoryData, error: categoryError } = await supabase
          .from('monthly_category_summaries')
          .select(`
            year,
            month,
            total_sales,
            total_profit,
            categories(id, category_name)
          `)
          .eq('customer_id', id)
        
        if (categoryError) throw categoryError
        
        // Kategori verilerini grupla
        const categoryGroups = new Map()
        
        categoryData?.forEach((row) => {
          if (!row.categories) return
          
          const categoryId = row.categories.id
          const categoryName = row.categories.category_name
          
          if (!categoryGroups.has(categoryId)) {
            categoryGroups.set(categoryId, {
              id: categoryId,
              category: categoryName,
              total_sales: 0,
              total_profit: 0,
              months: new Set()
            })
          }
          
          const group = categoryGroups.get(categoryId)
          group.total_sales += row.total_sales
          group.total_profit += row.total_profit || 0
          group.months.add(`${row.year}-${row.month}`)
        })
        
        // Top kategorileri al
        const sortedCategories = Array.from(categoryGroups.values())
          .map(category => ({
            ...category,
            months_count: category.months.size
          }))
          .sort((a, b) => b.total_sales - a.total_sales)
        
        setCategorySales(sortedCategories)
        
        // 4. Risk kategorilerini al
        const { data: riskData, error: riskError } = await supabase
          .from('customer_category_loss_analysis')
          .select(`
            id,
            risk_level,
            consecutive_inactive_months,
            last_purchase_date,
            average_monthly_purchase,
            categories(id, category_name)
          `)
          .eq('customer_id', id)
          .order('consecutive_inactive_months', { ascending: false })
        
        if (riskError) throw riskError
        
        const sixMonthsAgo = subMonths(now, 6)
        
        const highRiskCategories = riskData
          ?.filter(item => {
            // Son 6 aydır alım yoksa veya risk seviyesi yüksekse
            const lastPurchaseDate = new Date(item.last_purchase_date)
            return (
              item.risk_level === 'Yüksek' ||
              !isAfter(lastPurchaseDate, sixMonthsAgo)
            )
          })
          .map(item => ({
            ...item,
            months_since_purchase: item.consecutive_inactive_months
          }))
          .sort((a, b) => b.months_since_purchase - a.months_since_purchase)
        
        setRiskCategories(highRiskCategories || [])
        
        // 5. Son işlemleri al
        const { data: transactionData, error: transactionError } = await supabase
          .from('sales_transactions')
          .select(`
            id,
            document_date,
            document_number,
            quantity,
            total_amount,
            total_amount_with_tax,
            pre_sale_total_profit,
            products(product_name, category_id, categories(category_name))
          `)
          .eq('customer_id', id)
          .order('document_date', { ascending: false })
          .limit(10)
        
        if (transactionError) throw transactionError
        
        setRecentTransactions(transactionData || [])
        
      } catch (error: any) {
        console.error('Müşteri detayları yüklenirken hata:', error)
        setError('Müşteri detayları yüklenemedi. Lütfen daha sonra tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }
    
    loadCustomerDetails()
  }, [id])
  
  const goBack = () => {
    router.back()
  }
  
  // Grafikler için renkler
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658']
  
  // Günleri Türkçe olarak formatlama
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMMM yyyy', { locale: tr })
    } catch (e) {
      return dateStr
    }
  }
  
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
          Müşteri Detayı
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
                <Typography variant="h5" gutterBottom>
                  {customer?.customer_name}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip label={`Müşteri Kodu: ${customer?.customer_code}`} color="primary" />
                  {customer?.sector_code && (
                    <Chip label={`Sektör Kodu: ${customer?.sector_code}`} />
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="customer tabs">
              <Tab label="Genel Bakış" id="customer-tab-0" />
              <Tab label="Kategori Analizi" id="customer-tab-1" />
              <Tab label="Kayıp Tespiti" id="customer-tab-2" />
              <Tab label="Son İşlemler" id="customer-tab-3" />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    Aylık Satış Trendi
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={monthlySales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis yAxisId="left" orientation="left" stroke="#1976d2" />
                      <YAxis yAxisId="right" orientation="right" stroke="#2e7d32" />
                      <Tooltip formatter={(value) => `₺${Number(value).toLocaleString('tr-TR')}`} />
                      <Legend />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="total_sales" 
                        name="Satış" 
                        stroke="#1976d2" 
                        strokeWidth={2} 
                        dot={{ r: 4 }} 
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="total_profit" 
                        name="Kâr" 
                        stroke="#2e7d32" 
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
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 2, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    Kategori Dağılımı
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={categorySales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₺${Number(value).toLocaleString('tr-TR')}`} />
                      <Legend />
                      <Bar dataKey="total_sales" name="Toplam Satış" fill="#1976d2" />
                      <Bar dataKey="total_profit" name="Toplam Kâr" fill="#2e7d32" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    Kategori Oranları
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={categorySales}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: %${(percent * 100).toFixed(0)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total_sales"
                        nameKey="category"
                      >
                        {categorySales.map((entry, index) => (
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
                    {categorySales.map((category) => (
                      <ListItem key={category.id} divider>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={6}>
                            <ListItemText
                              primary={category.category}
                              secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                  <Chip 
                                    size="small" 
                                    label={`${category.months_count} ay aktif`} 
                                    color={category.months_count > 6 ? 'success' : 'primary'}
                                  />
                                </Box>
                              }
                            />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                              Toplam Satış
                            </Typography>
                            <Typography variant="body1">
                              ₺{category.total_sales.toLocaleString('tr-TR')}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                              Toplam Kâr
                            </Typography>
                            <Typography variant="body1">
                              ₺{category.total_profit.toLocaleString('tr-TR')}
                            </Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                    ))}
                    
                    {categorySales.length === 0 && (
                      <ListItem>
                        <ListItemText 
                          primary="Kategori verisi bulunamadı" 
                          secondary="Bu müşteri için henüz kategori satış verisi bulunmuyor."
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
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WarningIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      Risk Altındaki Kategoriler
                    </Typography>
                  </Box>
                  
                  <List>
                    {riskCategories.map((category) => (
                      <ListItem key={category.id} divider>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <ListItemText
                              primary={category.categories?.category_name}
                              secondary={
                                <>
                                  <Typography variant="body2" component="span" color="error">
                                    {category.months_since_purchase} aydır alım yapılmadı
                                  </Typography>
                                  <Box sx={{ mt: 1 }}>
                                    <Chip
                                      size="small"
                                      label={`Son Alım: ${formatDate(category.last_purchase_date)}`}
                                      color="default"
                                      variant="outlined"
                                    />
                                  </Box>
                                </>
                              }
                            />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                              Ortalama Aylık Alım
                            </Typography>
                            <Typography variant="body1">
                              ₺{category.average_monthly_purchase?.toLocaleString('tr-TR') || '0'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                              Risk Seviyesi
                            </Typography>
                            <Chip
                              label={category.risk_level}
                              color={
                                category.risk_level === 'Yüksek'
                                  ? 'error'
                                  : category.risk_level === 'Orta'
                                    ? 'warning'
                                    : 'success'
                              }
                            />
                          </Grid>
                        </Grid>
                      </ListItem>
                    ))}
                    
                    {riskCategories.length === 0 && (
                      <ListItem>
                        <ListItemText 
                          primary="Risk altında kategori bulunamadı" 
                          secondary="Bu müşteriye ait risk altında kategori bulunmuyor."
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <Paper>
              <List>
                {recentTransactions.map((transaction) => (
                  <ListItem key={transaction.id} divider>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <ListItemText
                          primary={transaction.products?.product_name}
                          secondary={
                            <>
                              <Typography variant="body2" component="span" color="text.primary">
                                {transaction.products?.categories?.category_name}
                              </Typography>
                              <Typography variant="body2" component="span">
                                {' - '}
                                {formatDate(transaction.document_date)}
                              </Typography>
                              <Box sx={{ mt: 1 }}>
                                <Chip
                                  size="small"
                                  label={`Belge No: ${transaction.document_number || 'Belirtilmemiş'}`}
                                  variant="outlined"
                                />
                              </Box>
                            </>
                          }
                        />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="body2" color="text.secondary">
                          Miktar
                        </Typography>
                        <Typography variant="body1">
                          {transaction.quantity}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="body2" color="text.secondary">
                          Tutar (KDV hariç)
                        </Typography>
                        <Typography variant="body1">
                          ₺{transaction.total_amount.toLocaleString('tr-TR')}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="body2" color="text.secondary">
                          Kâr
                        </Typography>
                        <Typography 
                          variant="body1"
                          color={transaction.pre_sale_total_profit > 0 ? 'success.main' : 'error.main'}
                        >
                          ₺{(transaction.pre_sale_total_profit || 0).toLocaleString('tr-TR')}
                        </Typography>
                      </Grid>
                    </Grid>
                  </ListItem>
                ))}
                
                {recentTransactions.length === 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="İşlem bulunamadı" 
                      secondary="Bu müşteri için henüz işlem kaydı bulunmuyor."
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
          </TabPanel>
        </>
      )}
    </Box>
  )
}