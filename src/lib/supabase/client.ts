// src/lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from './database.types'

// Client component'lerde kullanmak için
export const createClient = () => 
  createClientComponentClient<Database>()