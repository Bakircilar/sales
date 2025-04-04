// src/lib/supabase/server.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from './database.types'

// Server component'lerde kullanmak için
export const createServerClient = () => 
  createServerComponentClient<Database>({ cookies })