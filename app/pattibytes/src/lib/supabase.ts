import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

console.log('Initializing Supabase with URL:', env.SUPABASE_URL);
// Temporary debug
console.log('=== Supabase Config ===');
console.log('URL:', env.SUPABASE_URL);
console.log('Key (first 20 chars):', env.SUPABASE_ANON_KEY?.substring(0, 20));
console.log('Key starts with eyJ?', env.SUPABASE_ANON_KEY?.startsWith('eyJ'));
console.log('======================');
if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

export type UserRole = 'admin' | 'merchant' | 'delivery' | 'customer';

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  approval_status: 'pending' | 'approved' | 'rejected';
  is_superadmin?: boolean;
  created_at?: string;
};
