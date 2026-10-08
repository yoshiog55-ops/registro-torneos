import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Falta configurar VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en las variables de entorno.")
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (input, init = {}) => {
      const headers = new Headers(init.headers)
      headers.set("apikey", supabaseKey)
      return fetch(input, { ...init, headers })
    }
  }
})