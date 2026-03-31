import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nytircrsjhacdmepvadr.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55dGlyY3JzamhhY2RtZXB2YWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5OTAzNzYsImV4cCI6MjA5MDU2NjM3Nn0.v7GCjeqBaRYWJ7t0CuRhozLBsFjTupWZ7gfN-P_rh_I'

// createClient instance highly optimized for the frontend environment
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
