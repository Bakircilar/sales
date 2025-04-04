// src/app/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Box, Typography, Paper, Grid, Tabs, Tab, TextField,
  Button, Divider, List, ListItem, ListItemText, ListItemSecondaryAction,
  Switch, FormControlLabel, Alert, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  FormControl, InputLabel, Select, MenuItem, SelectChangeEvent,
  Card, CardContent, Avatar
} from '@mui/material'
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  DataUsage as DataUsageIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Logout as LogoutIcon
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-toastify'
import { format } from 'date-fns'
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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
      style={{ paddingTop: '20px' }}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

// Ana bileşen
export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>({
    email: '',
    full_name: '',
    phone: '',
    company: '',
    position: '',
    language: 'tr'
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [users, setUsers] = useState<any[]>([])
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    role: 'user'
  })
  const [notifications, setNotifications] = useState({
    email_daily: true,
    email_weekly: true,
    email_monthly: true,
    push_alerts: true,
    risk_alerts: true,
    system_updates: false
  })
  const [dataSettings, setDataSettings] = useState({
    auto_calculate: true,
    retention_period: '12',
    currency: 'TRY',
    default_view: 'monthly'
  })
  const [importHistory, setImportHistory] = useState<any[]>([])
  
  const supabase = createClient()
  
  // Sekme değişimi
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }
  
  // Sayfa yüklenirken kullanıcı bilgilerini al
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (profile) {
            setUserProfile({
              ...userProfile,
              email: user.email || '',
              full_name: profile.full_name || '',
              phone: profile.phone || '',
              company: profile.company || '',
              position: profile.position || '',
              language: profile.language || 'tr'
            })
          }
        }
        
        // Kullanıcıları getir
        await loadUsers()
        
        // İçe aktarma geçmişini getir
        await loadImportHistory()
        
      } catch (error) {
        console.error('Profil yüklenirken hata:', error)
      }
    }
    
    const loadUsers = async () => {
      try {
        // Gerçek uygulamada kullanıcıları rol bazlı getir
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, created_at, last_sign_in_at')
        
        if (error) throw error
        
        setUsers(data || [])
      } catch (error) {
        console.error('Kullanıcılar yüklenirken hata:', error)
      }
    }
    
    const loadImportHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('import_history')
          .select('*')
          .order('import_date', { ascending: false })
          .limit(10)
        
        if (error) throw error
        
        setImportHistory(data || [])
      } catch (error) {
        console.error('İçe aktarma geçmişi yüklenirken hata:', error)
      }
    }
    
    loadUserProfile()
  }, [])
  
  // Profil bilgilerini güncelle
  const handleUpdateProfile = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Oturum açık değil')
      }
      
      // Profil güncelleme
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: userProfile.full_name,
          phone: userProfile.phone,
          company: userProfile.company,
          position: userProfile.position,
          language: userProfile.language,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      setSuccess('Profil başarıyla güncellendi')
      toast.success('Profil başarıyla güncellendi')
    } catch (error: any) {
      setError('Profil güncellenirken hata oluştu: ' + error.message)
      toast.error('Profil güncellenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }
  
  // Şifre değiştir
  const handleChangePassword = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      if (passwordData.new_password !== passwordData.confirm_password) {
        throw new Error('Yeni şifreler eşleşmiyor')
      }
      
      // Supabase şifre güncelleme
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      })
      
      if (error) throw error
      
      setSuccess('Şifre başarıyla güncellendi')
      toast.success('Şifre başarıyla güncellendi')
      
      // Şifre alanlarını temizle
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
    } catch (error: any) {
      setError('Şifre değiştirilirken hata oluştu: ' + error.message)
      toast.error('Şifre değiştirilirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }
  
  // Kullanıcı ekleme dialogunu aç
  const openAddUserDialog = () => {
    setNewUser({
      email: '',
      role: 'user'
    })
    setUserDialogOpen(true)
  }
  
  // Kullanıcı ekleme
  const handleAddUser = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Gerçek bir uygulamada burada kullanıcı davet edilir veya oluşturulur
      toast.success(`${newUser.email} davet edildi`)
      setUserDialogOpen(false)
      
      // Örnek olarak kullanıcıyı listeye ekle
      setUsers([
        ...users,
        {
          id: 'temp-' + Date.now(),
          email: newUser.email,
          role: newUser.role,
          full_name: 'Yeni Kullanıcı',
          created_at: new Date().toISOString()
        }
      ])
    } catch (error: any) {
      setError('Kullanıcı eklenirken hata oluştu: ' + error.message)
      toast.error('Kullanıcı eklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }
  
  // Bildirim ayarlarını kaydet
  const handleSaveNotifications = () => {
    toast.success('Bildirim ayarları kaydedildi')
  }
  
  // Veri ayarlarını kaydet
  const handleSaveDataSettings = () => {
    toast.success('Veri işleme ayarları kaydedildi')
  }
  
  // Çıkış yap
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }
  
  // Dosya adını kısaltma
  const shortenFileName = (filename: string, maxLength: number = 25) => {
    if (filename.length <= maxLength) return filename
    
    const extension = filename.split('.').pop()
    const name = filename.substring(0, filename.lastIndexOf('.'))
    
    const shortName = name.substring(0, maxLength - extension!.length - 3) + '...'
    return `${shortName}.${extension}`
  }
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Ayarlar
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="settings tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PersonIcon />} label="Profil" id="settings-tab-0" />
          <Tab icon={<SecurityIcon />} label="Kullanıcılar ve Güvenlik" id="settings-tab-1" />
          <Tab icon={<NotificationsIcon />} label="Bildirimler" id="settings-tab-2" />
          <Tab icon={<DataUsageIcon />} label="Veri İşleme" id="settings-tab-3" />
          <Tab icon={<LanguageIcon />} label="Dil ve Bölge" id="settings-tab-4" />
        </Tabs>
      </Paper>
      
      {/* Profil Sekmesi */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: 'primary.main' }}>
                  {userProfile.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {userProfile.full_name || 'Kullanıcı'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {userProfile.email}
                </Typography>
                {userProfile.position && (
                  <Typography variant="body2" color="text.secondary">
                    {userProfile.position}
                  </Typography>
                )}
                {userProfile.company && (
                  <Chip label={userProfile.company} color="primary" sx={{ mt: 1 }} />
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Profil Bilgileri
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="E-posta"
                    value={userProfile.email}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ad Soyad"
                    value={userProfile.full_name}
                    onChange={(e) => setUserProfile({ ...userProfile, full_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Telefon"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Şirket"
                    value={userProfile.company}
                    onChange={(e) => setUserProfile({ ...userProfile, company: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Pozisyon"
                    value={userProfile.position}
                    onChange={(e) => setUserProfile({ ...userProfile, position: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="language-select-label">Dil</InputLabel>
                    <Select
                      labelId="language-select-label"
                      id="language-select"
                      value={userProfile.language}
                      label="Dil"
                      onChange={(e: SelectChangeEvent) => 
                        setUserProfile({ ...userProfile, language: e.target.value })}
                    >
                      <MenuItem value="tr">Türkçe</MenuItem>
                      <MenuItem value="en">English</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleUpdateProfile}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Profili Güncelle'}
                </Button>
              </Box>
            </Paper>
            
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Şifre Değiştir
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Mevcut Şifre"
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Yeni Şifre"
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Yeni Şifre (Tekrar)"
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    error={passwordData.new_password !== passwordData.confirm_password}
                    helperText={
                      passwordData.new_password !== passwordData.confirm_password
                        ? 'Şifreler eşleşmiyor'
                        : ''
                    }
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleChangePassword}
                  disabled={
                    loading || 
                    !passwordData.current_password || 
                    !passwordData.new_password || 
                    passwordData.new_password !== passwordData.confirm_password
                  }
                >
                  Şifreyi Değiştir
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Kullanıcılar ve Güvenlik Sekmesi */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Kullanıcı Yönetimi
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={openAddUserDialog}
            >
              Kullanıcı Ekle
            </Button>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Kullanıcı</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Oluşturulma Tarihi</TableCell>
                  <TableCell>Son Giriş</TableCell>
                  <TableCell align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2">
                          {user.full_name || 'İsimsiz Kullanıcı'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                        color={user.role === 'admin' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.created_at ? format(new Date(user.created_at), 'dd.MM.yyyy', { locale: tr }) : '-'}
                    </TableCell>
                    <TableCell>
                      {user.last_sign_in_at 
                        ? format(new Date(user.last_sign_in_at), 'dd.MM.yyyy HH:mm', { locale: tr }) 
                        : 'Henüz giriş yapılmadı'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <IconButton size="small" color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Henüz kullanıcı bulunmuyor
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Güvenlik Ayarları
          </Typography>
          
          <Divider sx={{ mb: 2 }} />
          
          <List>
            <ListItem>
              <ListItemText 
                primary="İki Faktörlü Kimlik Doğrulama" 
                secondary="Hesabınıza giriş yaparken ek güvenlik katmanı ekler"
              />
              <ListItemSecondaryAction>
                <Switch edge="end" />
              </ListItemSecondaryAction>
            </ListItem>
            
            <ListItem>
              <ListItemText 
                primary="Oturum Süresi" 
                secondary="Oturumun ne kadar süreceğini belirler"
              />
              <ListItemSecondaryAction>
                <FormControl sx={{ minWidth: 120 }}>
                  <Select
                    value="8"
                    size="small"
                  >
                    <MenuItem value="1">1 saat</MenuItem>
                    <MenuItem value="8">8 saat</MenuItem>
                    <MenuItem value="24">24 saat</MenuItem>
                    <MenuItem value="168">7 gün</MenuItem>
                  </Select>
                </FormControl>
              </ListItemSecondaryAction>
            </ListItem>
            
            <ListItem>
              <ListItemText 
                primary="IP Kısıtlaması" 
                secondary="Belirli IP adreslerinden erişimi kısıtla"
              />
              <ListItemSecondaryAction>
                <Switch edge="end" />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleSignOut}
            >
              Çıkış Yap
            </Button>
          </Box>
        </Paper>
      </TabPanel>
      
      {/* Bildirimler Sekmesi */}
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Bildirim Ayarları
          </Typography>
          
          <Divider sx={{ mb: 2 }} />
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Günlük Özet E-postası" 
                secondary="Her gün satış ve performans özeti al"
              />
              <ListItemSecondaryAction>
                <Switch 
                  edge="end" 
                  checked={notifications.email_daily}
                  onChange={() => setNotifications({
                    ...notifications,
                    email_daily: !notifications.email_daily
                  })} 
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <ListItem>
              <ListItemText 
                primary="Haftalık Rapor" 
                secondary="Her hafta detaylı analiz raporu al"
              />
              <ListItemSecondaryAction>
                <Switch 
                  edge="end" 
                  checked={notifications.email_weekly}
                  onChange={() => setNotifications({
                    ...notifications,
                    email_weekly: !notifications.email_weekly
                  })} 
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <ListItem>
              <ListItemText 
                primary="Aylık Özet" 
                secondary="Her ay sonunda aylık performans özeti al"
              />
              <ListItemSecondaryAction>
                <Switch 
                  edge="end" 
                  checked={notifications.email_monthly}
                  onChange={() => setNotifications({
                    ...notifications,
                    email_monthly: !notifications.email_monthly
                  })} 
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider sx={{ my: 2 }} />
            
            <ListItem>
              <ListItemText 
                primary="Anlık Bildirimler" 
                secondary="Kritik olaylar için anlık bildirimler al"
              />
              <ListItemSecondaryAction>
                <Switch 
                  edge="end" 
                  checked={notifications.push_alerts}
                  onChange={() => setNotifications({
                    ...notifications,
                    push_alerts: !notifications.push_alerts
                  })} 
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <ListItem>
              <ListItemText 
                primary="Risk Uyarıları" 
                secondary="Kayıp müşteri risklerinde bildirim al"
              />
              <ListItemSecondaryAction>
                <Switch 
                  edge="end" 
                  checked={notifications.risk_alerts}
                  onChange={() => setNotifications({
                    ...notifications,
                    risk_alerts: !notifications.risk_alerts
                  })} 
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <ListItem>
              <ListItemText 
                primary="Sistem Güncellemeleri" 
                secondary="Sistem güncellemeleri ve bakım bildirimleri"
              />
              <ListItemSecondaryAction>
                <Switch 
                  edge="end" 
                  checked={notifications.system_updates}
                  onChange={() => setNotifications({
                    ...notifications,
                    system_updates: !notifications.system_updates
                  })} 
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveNotifications}
            >
              Ayarları Kaydet
            </Button>
          </Box>
        </Paper>
      </TabPanel>
      
      {/* Veri İşleme Sekmesi */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Veri İşleme Ayarları
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Otomatik Hesaplama" 
                    secondary="Excel yüklendikten sonra metrikleri otomatik hesapla"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      edge="end" 
                      checked={dataSettings.auto_calculate}
                      onChange={() => setDataSettings({
                        ...dataSettings,
                        auto_calculate: !dataSettings.auto_calculate
                      })} 
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Veri Saklama Süresi" 
                    secondary="Verilerin ne kadar süre saklanacağını belirle"
                  />
                  <ListItemSecondaryAction>
                    <FormControl sx={{ minWidth: 120 }}>
                      <Select
                        value={dataSettings.retention_period}
                        size="small"
                        onChange={(e) => setDataSettings({
                          ...dataSettings,
                          retention_period: e.target.value as string
                        })}
                      >
                        <MenuItem value="6">6 ay</MenuItem>
                        <MenuItem value="12">12 ay</MenuItem>
                        <MenuItem value="24">24 ay</MenuItem>
                        <MenuItem value="60">5 yıl</MenuItem>
                      </Select>
                    </FormControl>
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Para Birimi" 
                    secondary="Tüm finansal değerler için varsayılan para birimi"
                  />
                  <ListItemSecondaryAction>
                    <FormControl sx={{ minWidth: 120 }}>
                      <Select
                        value={dataSettings.currency}
                        size="small"
                        onChange={(e) => setDataSettings({
                          ...dataSettings,
                          currency: e.target.value as string
                        })}
                      >
                        <MenuItem value="TRY">Türk Lirası (₺)</MenuItem>
                        <MenuItem value="USD">Dolar ($)</MenuItem>
                        <MenuItem value="EUR">Euro (€)</MenuItem>
                        <MenuItem value="GBP">Sterlin (£)</MenuItem>
                      </Select>
                    </FormControl>
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Varsayılan Görünüm" 
                    secondary="Grafik ve raporlar için varsayılan zaman aralığı"
                  />
                  <ListItemSecondaryAction>
                    <FormControl sx={{ minWidth: 120 }}>
                      <Select
                        value={dataSettings.default_view}
                        size="small"
                        onChange={(e) => setDataSettings({
                          ...dataSettings,
                          default_view: e.target.value as string
                        })}
                      >
                        <MenuItem value="daily">Günlük</MenuItem>
                        <MenuItem value="weekly">Haftalık</MenuItem>
                        <MenuItem value="monthly">Aylık</MenuItem>
                        <MenuItem value="quarterly">Üç Aylık</MenuItem>
                        <MenuItem value="yearly">Yıllık</MenuItem>
                      </Select>
                    </FormControl>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveDataSettings}
                >
                  Ayarları Kaydet
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                İçe Aktarma Geçmişi
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              <List>
                {importHistory.map((item) => (
                  <ListItem key={item.id} divider>
                    <ListItemText
                      primary={shortenFileName(item.filename)}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {item.row_count} satır
                          </Typography>
                          {' - '}
                          {format(new Date(item.import_date), 'dd MMM yyyy HH:mm', { locale: tr })}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={item.successful ? 'Başarılı' : 'Hata'}
                        color={item.successful ? 'success' : 'error'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                
                {importHistory.length === 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="İçe aktarma geçmişi bulunamadı"
                      secondary="Henüz Excel yüklemesi yapılmamış" 
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Dil ve Bölge Sekmesi */}
      <TabPanel value={tabValue} index={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Dil ve Bölge Ayarları
          </Typography>
          
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="language-label">Arayüz Dili</InputLabel>
                <Select
                  labelId="language-label"
                  value={userProfile.language}
                  label="Arayüz Dili"
                  onChange={(e: SelectChangeEvent) => 
                    setUserProfile({ ...userProfile, language: e.target.value })}
                >
                  <MenuItem value="tr">Türkçe</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="date-format-label">Tarih Formatı</InputLabel>
                <Select
                  labelId="date-format-label"
                  value="dd.MM.yyyy"
                  label="Tarih Formatı"
                >
                  <MenuItem value="dd.MM.yyyy">31.12.2023</MenuItem>
                  <MenuItem value="MM/dd/yyyy">12/31/2023</MenuItem>
                  <MenuItem value="yyyy-MM-dd">2023-12-31</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="currency-format-label">Para Birimi Formatı</InputLabel>
                <Select
                  labelId="currency-format-label"
                  value="tr-TR"
                  label="Para Birimi Formatı"
                >
                  <MenuItem value="tr-TR">Türkçe (1.234,56 ₺)</MenuItem>
                  <MenuItem value="en-US">İngilizce ($1,234.56)</MenuItem>
                  <MenuItem value="de-DE">Almanca (1.234,56 €)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="timezone-label">Saat Dilimi</InputLabel>
                <Select
                  labelId="timezone-label"
                  value="Europe/Istanbul"
                  label="Saat Dilimi"
                >
                  <MenuItem value="Europe/Istanbul">Türkiye (GMT+3)</MenuItem>
                  <MenuItem value="Europe/London">Londra (GMT+0)</MenuItem>
                  <MenuItem value="America/New_York">New York (GMT-5)</MenuItem>
                  <MenuItem value="Asia/Tokyo">Tokyo (GMT+9)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="first-day-label">Haftanın İlk Günü</InputLabel>
                <Select
                  labelId="first-day-label"
                  value="1"
                  label="Haftanın İlk Günü"
                >
                  <MenuItem value="1">Pazartesi</MenuItem>
                  <MenuItem value="0">Pazar</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="number-format-label">Sayı Formatı</InputLabel>
                <Select
                  labelId="number-format-label"
                  value="tr-TR"
                  label="Sayı Formatı"
                >
                  <MenuItem value="tr-TR">1.234,56</MenuItem>
                  <MenuItem value="en-US">1,234.56</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleUpdateProfile}
            >
              Ayarları Kaydet
            </Button>
          </Box>
        </Paper>
      </TabPanel>
      
      {/* Kullanıcı Ekleme Dialogu */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)}>
        <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="E-posta Adresi"
              type="email"
              fullWidth
              variant="outlined"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth>
              <InputLabel id="user-role-label">Kullanıcı Rolü</InputLabel>
              <Select
                labelId="user-role-label"
                value={newUser.role}
                label="Kullanıcı Rolü"
                onChange={(e: SelectChangeEvent) => 
                  setNewUser({ ...newUser, role: e.target.value })}
              >
                <MenuItem value="admin">Yönetici</MenuItem>
                <MenuItem value="user">Kullanıcı</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>İptal</Button>
          <Button 
            onClick={handleAddUser} 
            variant="contained" 
            disabled={!newUser.email}
          >
            Kullanıcı Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}