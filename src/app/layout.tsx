// src/app/layout.tsx (Güncelleme)
import { Inter } from 'next/font/google'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import '../styles/globals.css'
import ThemeProvider from '@/components/ui/ThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Müşteri Satış Analiz Platformu',
  description: 'Müşteri satışlarını ve kategorilere göre analiz edin',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          <ToastContainer position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}