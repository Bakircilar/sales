// src/app/page.tsx - Ana sayfa için otomatik dashboard'a yönlendirme
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
  return null
}