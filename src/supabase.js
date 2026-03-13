import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zjcbsamqjuuhijqpugna.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqY2JzYW1xanV1aGlqcXB1Z25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTM0NDIsImV4cCI6MjA4ODk4OTQ0Mn0.ZkEh58mu6E_T6jwa0CciOzFkurhN1fY0F4rD7_LJozc"

export const supabase = createClient(supabaseUrl, supabaseKey)