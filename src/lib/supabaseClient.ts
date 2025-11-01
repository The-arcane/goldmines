
import { createBrowserClient } from '@supabase/ssr'

// This function creates a Supabase client that can be used in client components.
// It is designed to work with Next.js App Router by managing auth state in cookies.
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and anonymous key are required.')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Export a singleton instance for convenience, which is safe for client-side code.
export const supabase = createClient();
