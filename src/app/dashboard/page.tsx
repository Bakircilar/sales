// src/app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Box, Grid, Paper, Typography, Divider, Chip, List,
  ListItem, ListItemText, ListItemAvatar, Avatar, CircularProgress
} from '@mui/material'
import {
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Warning as WarningIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

// Özet kartı bileşeni
const SummaryCard = ({ title, value, icon, change, loading, color = '#1976d2' }: any) => (
  <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Avatar sx={{ bgcolor: color, mr: 2 }}>
        {icon}
      </Avatar>
      <Typography variant="h6" component="div">
        {title}
      </Typography>
    </Box>
    
    {loading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 60 }}>
        <CircularProgress size={30} />
      </Box>
    ) : (
      <>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          {value}
        </Typography>
        
        {change !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {change >= 0 ? (
              <>
                <ArrowUpwardIcon fontSize="small" color="success" />
                <Typography variant="body2" color="success.main">
                  %{Math.abs(change).toFixed(1)} artış
                </Typography>
              </>
            ) : (
              <>
                <ArrowDownwardIcon fontSize="small" color="error" />
                <Typography variant="body2" color="error.main">
                  %{Math.abs(change).toFixed(1)} azalış
                </Typography>
              </>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              geçen aya göre
            </Typography>
          </Box>
        )}
      </>
    )}
  </Paper>
)

// Ana dashboard bileşeni
export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [monthlySales, setMonthlySales] = useState<any[]>([])
  const [categorySales, setCategorySales] = useState<any[]>([])
  const [riskCustomers, setRiskCustomers] = useState<any[]>([])
  const [summaryData, setSummaryData] = useState({
    totalSales: 0,
    salesChange: 0,
    totalProfit: 0,
    profitChange: 0,
    customerCount: 0,
    customerChange: 0,
    categoryCount: 0
  })
  
  const supabase = createClient()
  
  useEffect(() => {
    // Tüm dashboard verilerini yükle
    const loadDashboardData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // 1. Aylık satış verilerini al
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth() + 1
        
        // Son 6 ayın verilerini al
        const { data: monthlyData, error: monthlyError } = await supabase
          .from('monthly_customer_summaries')
          .select('year, month, total_sales, total_profit')
          .or(`year.neq.${currentYear},and(year.eq.${currentYear},month.lte.${currentMonth})`)
          .order('year', { ascending: true })
          .order('month', { ascending: true })
          .limit(12)
        
        if (monthlyError) throw monthlyError
        
        // Aylık verileri grupla
        const monthlyGroups = new Map()
        monthlyData?.forEach((row) => {
          const key = `${row.year}-${row.month}`
          if (!monthlyGroups.has(key)) {
            monthlyGroups.set(key, {
              year: row.year,
              month: row.month,
              total_sales: 0,
              total_profit: 0
            })
          }
          
          const group = monthlyGroups.get(key)
          group.total_sales += row.total_sales
          group.total_profit += row.total_profit || 0
        })
        
        // Ayları formatla ve sırala
        const formattedMonthlyData = Array.from(monthlyGroups.values())
          .map((row) => ({
            ...row,
            period: format(new Date(row.year, row.month - 1), 'MMM yyyy', { locale: tr })
          }))
          .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year
            return a.month - b.month
          })
          .slice(-6) // Son 6 ay
        
        setMonthlySales(formattedMonthlyData)
        
        // 2. Kategori verilerini al
        const { data: categoryData, error: categoryError } = await supabase
          .from('monthly_category_summaries')
          .select(`
            total_sales,
            total_profit,
            categories(category_name)
          `)
          .eq('year', currentYear)
          .eq('month', currentMonth)
        
        if (categoryError) throw categoryError
        
        // Kategori verilerini grupla
        const categoryGroups = new Map()
        categoryData?.forEach((row) => {
          const categoryName = row.categories?.category_name || 'Diğer'
          
          if (!categoryGroups.has(categoryName)) {
            categoryGroups.set(categoryName, {
              category: categoryName,
              total_sales: 0,
              total_profit: 0
            })
          }
          
          const group = categoryGroups.get(categoryName)
          group.total_sales += row.total_sales
          group.total_profit += row.total_profit || 0
        })
        
        // En yüksek satışa sahip 6 kategoriyi al, gerisini "Diğer" olarak grupla
        const sortedCategories = Array.from(categoryGroups.values())
          .sort((a, b) => b.total_sales - a.total_sales)
        
        const top6Categories = sortedCategories.slice(0, 6)
        const otherCategories = sortedCategories.slice(6)
        
        if (otherCategories.length > 0) {
          const otherGroup = {
            category: 'Diğer',
            total_sales: otherCategories.reduce((sum, cat) => sum + cat.total_sales, 0),
            total_profit: otherCategories.reduce((sum, cat) => sum + cat.total_profit, 0)
          }
          
          top6Categories.push(otherGroup)
        }
        
        setCategorySales(top6Categories)
        
        // 3. Risk altındaki müşterileri al
        const { data: riskData, error: riskError } = await supabase
          .from('customer_category_loss_analysis')
          .select(`
            id,
            risk_level,
            consecutive_inactive_months,
            last_purchase_date,
            average_monthly_purchase,
            customers(customer_name),
            categories(category_name)
          `)
          .eq('risk_level', 'Yüksek')
          .order('consecutive_inactive_months', { ascending: false })
          .limit(5)
        
        if (riskError) throw riskError
        
        setRiskCustomers(riskData || [])
        
        // 4. Özet verileri hesapla
        if (formattedMonthlyData.length >= 2) {
          const currentMonth = formattedMonthlyData[formattedMonthlyData.length - 1]
          const prevMonth = formattedMonthlyData[formattedMonthlyData.length - 2]
          
          const salesChange = prevMonth.total_sales > 0
            ? ((currentMonth.total_sales - prevMonth.total_sales) / prevMonth.total_sales) * 100
            : 0
          
          const profitChange = prevMonth.total_profit > 0
            ? ((currentMonth.total_profit - prevMonth.total_profit) / prevMonth.total_profit) * 100
            : 0
          
          // Müşteri sayısını al
          const { count: currentCustomers, error: countError } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
          
          if (countError) throw countError
          
          // Kategori sayısını al
          const { count: categoryCount, error: catCountError } = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true })
          
          if (catCountError) throw catCountError
          
          setSummaryData({
            totalSales: currentMonth.total_sales,
            salesChange,
            totalProfit: currentMonth.total_profit,
            profitChange,
            customerCount: currentCustomers || 0,
            customerChange: 2.5, // Örnek değer
            categoryCount: categoryCount || 0
          })
        }
      } catch (error: any) {
        console.error('Dashboard veri yükleme hatası:', error)
        setError('Veriler yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }
    
    loadDashboardData()
  }, [])
  
  // Rastgele renk oluşturma fonksiyonu
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658']
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography>{error}</Typography>
        </Paper>
      )}
      
      <Grid container spacing={3}>
        {/* Özet Kartları */}
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Toplam Satış"
            value={`₺${loading ? '-' : summaryData.totalSales.toLocaleString('tr-TR')}`}
            icon={<TrendingUpIcon />}
            change={summaryData.salesChange}
            loading={loading}
            color="#1976d2"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Toplam Kâr"
            value={`₺${loading ? '-' : summaryData.totalProfit.toLocaleString('tr-TR')}`}
            icon={<InventoryIcon />}
            change={summaryData.profitChange}
            loading={loading}
            color="#2e7d32"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Müşteri Sayısı"
            value={loading ? '-' : summaryData.customerCount.toLocaleString('tr-TR')}
            icon={<PersonIcon />}
            change={summaryData.customerChange}
            loading={loading}
            color="#ed6c02"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Kategori Sayısı"
            value={loading ? '-' : summaryData.categoryCount.toLocaleString('tr-TR')}
            icon={<CategoryIcon />}
            loading={loading}
            color="#9c27b0"
          />
        </Grid>
        
        {/* Aylık Satış Grafiği */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Aylık Satış ve Kâr
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" orientation="left" stroke="#1976d2" />
                  <YAxis yAxisId="right" orientation="right" stroke="#2e7d32" />
                  <Tooltip formatter={(value) => `₺${Number(value).toLocaleString('tr-TR')}`} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="total_sales" name="Satış" fill="#1976d2" />
                  <Bar yAxisId="right" dataKey="total_profit" name="Kâr" fill="#2e7d32" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        
        {/* Kategori Dağılımı */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Kategori Dağılımı
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80%' }}>
                <CircularProgress />
              </Box>
            ) : (
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
            )}
          </Paper>
        </Grid>
        
        {/* Risk Altındaki Müşteriler */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon color="warning" sx={{ mr: 1 }} />
              Risk Altındaki Müşteriler
            </Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
                <CircularProgress />
              </Box>
            ) : riskCustomers.length > 0 ? (
              <List>
                <Grid container>
                  {riskCustomers.map((customer) => (
                    <Grid item xs={12} md={6} key={customer.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            <WarningIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={customer.customers?.customer_name}
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.primary">
                                {customer.categories?.category_name}
                              </Typography>
                              <Typography variant="body2" component="span">
                                {' - '}
                                {customer.consecutive_inactive_months} aydır alım yapmadı
                              </Typography>
                              <Box sx={{ mt: 1 }}>
                                <Chip
                                  size="small"
                                  label={`Son Alım: ${format(new Date(customer.last_purchase_date), 'dd.MM.yyyy')}`}
                                  color="default"
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={`Ortalama Alım: ₺${customer.average_monthly_purchase?.toLocaleString('tr-TR')}`}
                                  color="info"
                                  variant="outlined"
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            </>
                          }
                        />
                      </ListItem>
                    </Grid>
                  ))}
                </Grid>
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                Risk altında müşteri bulunamadı.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}