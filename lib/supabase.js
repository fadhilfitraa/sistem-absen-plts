import { createClient } from '@supabase/supabase-js';

// Menggunakan URL cadangan murni untuk mengecoh Next.js agar tidak panik saat proses build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jaringpengaman.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'kunci-pengaman-sementara';

export const supabase = createClient(supabaseUrl, supabaseKey);