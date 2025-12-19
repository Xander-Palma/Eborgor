import { createClient } from "@supabase/supabase-js"
import { Platform } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  )
}

// Only use AsyncStorage on native (iOS/Android). On web/SSR let Supabase
// handle storage (localStorage when available) to avoid `window` errors.
const isNative = Platform.OS === "ios" || Platform.OS === "android"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isNative ? (AsyncStorage as any) : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      "Content-Type": "application/json",
    },
  },
  db: {
    schema: "public",
  },
})
