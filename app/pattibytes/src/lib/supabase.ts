import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

// During static/SSR rendering (Node.js), window is not defined.
// Only attach AsyncStorage when we're in a real browser or native runtime.
const isSSR = Platform.OS === 'web' && typeof window === 'undefined'

const getAuthStorage = () => {
  if (isSSR) return undefined  // no-op during static render
   
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage').default
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage:           getAuthStorage(),
      autoRefreshToken:  !isSSR,
      persistSession:    !isSSR,
      detectSessionInUrl: false,
    },
  }
)
