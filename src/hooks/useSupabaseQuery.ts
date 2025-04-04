// src/hooks/useSupabaseQuery.ts
import { useState, useEffect } from 'react';
import { PostgrestError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

/**
 * Supabase sorguları için özel hook
 * @param queryFn Supabase sorgu fonksiyonu
 * @param dependencies Bağımlılıklar
 * @returns Sorgu sonucu, yükleniyor durumu ve hata
 */
export function useSupabaseQuery<T>(
  queryFn: (supabase: ReturnType<typeof createClient>) => Promise<{
    data: T | null;
    error: PostgrestError | null;
  }>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<PostgrestError | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const supabase = createClient();
        const { data, error } = await queryFn(supabase);
        
        if (error) {
          setError(error);
        } else {
          setData(data);
        }
      } catch (e) {
        console.error('Sorgu hatası:', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  
  return { data, loading, error };
}

// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';

/**
 * Kimlik doğrulama için özel hook
 * @returns Kullanıcı, oturum ve yükleniyor durumu
 */
export function useAuth() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Mevcut oturumu al
    const getSession = async () => {
      setLoading(true);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setSession(session);
        setUser(session?.user || null);
      } catch (error) {
        console.error('Oturum alınırken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getSession();
    
    // Auth durumu değişimlerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
      }
    );
    
    // Cleanup
    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  return { user, session, loading };
}