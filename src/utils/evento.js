import { supabase } from "../supabase"

export async function obtenerEventoActual(torneo_id){

  const hoy = new Date().toLocaleDateString("en-CA")

  // buscar evento del día
  const { data } = await supabase
    .from("eventos")
    .select("*")
    .eq("torneo_id", torneo_id)
    .eq("fecha", hoy)
    .maybeSingle()

  if(data) return data

  // crear si no existe
  const { data: nuevo } = await supabase
    .from("eventos")
    .insert({
      torneo_id,
      fecha: hoy
    })
    .select()
    .single()

  return nuevo
}