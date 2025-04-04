// src/app/layout.tsx
'use client'

import { Inter } from 'next/font/google'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import '../styles/globals.css'
import ThemeProvider from '@/components/ui/ThemeProvider'
import MainLayout from '@/components/layout/MainLayout'
import { usePathname } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');

  return (
    <html lang="tr">
      <body className={inter.className}>
        <ThemeProvider>
          {isAuthPage ? (
            // Giriş/kayıt sayfalarında layout gösterme
            children
          ) : (
            // Diğer tüm sayfalarda MainLayout göster
            <MainLayout>
              {children}
            </MainLayout>
          )}
          <ToastContainer position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}