import { conCache } from "./cache";

/**
 * Puente hacia Nominatim (OpenStreetMap).
 *
 * Va por el servidor y no desde el navegador por dos razones: Nominatim exige
 * identificarse en el User-Agent —cosa que el navegador no deja hacer— y pide
 * como máximo una consulta por segundo. Desde el cliente, cien personas
 * registrando a la vez nos harían bloquear.
 *
 * IMPORTANTE, y comprobado con las direcciones reales de los acopios: la
 * búsqueda directa (texto → coordenadas) es POCO FIABLE con la nomenclatura
 * colombiana. "Carrera 24 #73-38" en Bogotá devolvió un punto a 14 km del
 * lugar correcto, porque encuentra la vía e ignora el número. Por eso acá solo
 * se usa para CENTRAR el mapa, nunca para colocar el punto.
 *
 * La búsqueda inversa (coordenadas → dirección) sí es fiable: solo tiene que
 * decir qué hay cerca de un punto, y eso OpenStreetMap lo hace bien. Es la que
 * usamos para avisarle a la persona si marcó donde no era.
 */

const AGENTE = "RedDeAcopio/1.0 (proyecto ciudadano sismo Colombia 2026)";
const ESPERA_MINIMA_MS = 1100;

let ultimaLlamada = 0;

/** Serializa las llamadas para no pasarnos de una por segundo. */
async function respetarRitmo() {
  const ahora = Date.now();
  const espera = Math.max(0, ultimaLlamada + ESPERA_MINIMA_MS - ahora);
  ultimaLlamada = ahora + espera;
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
}

export type UbicacionInversa = {
  barrio: string | null;
  ciudad: string | null;
  via: string | null;
  descripcion: string;
};

export async function ubicacionDePunto(
  lat: number,
  lng: number
): Promise<UbicacionInversa | null> {
  // Se redondea a 4 decimales (~11 m) para que dos clics casi iguales
  // compartan la misma entrada de caché y no gasten dos llamadas.
  const clave = `geo:inv:${lat.toFixed(4)}:${lng.toFixed(4)}`;

  return conCache(clave, 86_400, async () => {
    await respetarRitmo();
    const url =
      "https://nominatim.openstreetmap.org/reverse?" +
      new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: "json",
        zoom: "16",
        addressdetails: "1",
        "accept-language": "es",
      });

    const res = await fetch(url, { headers: { "User-Agent": AGENTE } });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d || d.error) return null;

    const a = d.address ?? {};
    const barrio = a.neighbourhood ?? a.suburb ?? a.quarter ?? null;
    const ciudad =
      a.city ?? a.town ?? a.municipality ?? a.village ?? a.county ?? null;
    const via = a.road ?? null;

    const partes = [via, barrio, ciudad].filter(Boolean);
    return {
      barrio,
      ciudad,
      via,
      descripcion: partes.length ? partes.join(", ") : (d.display_name ?? ""),
    };
  });
}

export type Sugerencia = {
  etiqueta: string;
  lat: number;
  lng: number;
};

/**
 * Búsqueda por texto, SOLO para centrar el mapa.
 *
 * Devuelve varias opciones a propósito: que la persona elija y luego marque el
 * punto es más honesto que fingir que acertamos a la primera.
 */
export async function buscarDireccion(
  texto: string,
  ciudad?: string
): Promise<Sugerencia[]> {
  const consulta = [texto, ciudad, "Colombia"].filter(Boolean).join(", ");
  const clave = `geo:buscar:${consulta.toLowerCase()}`;

  return conCache(clave, 86_400, async () => {
    await respetarRitmo();
    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: consulta,
        format: "json",
        limit: "5",
        countrycodes: "co",
        "accept-language": "es",
      });

    const res = await fetch(url, { headers: { "User-Agent": AGENTE } });
    if (!res.ok) return [];
    const datos = await res.json();
    if (!Array.isArray(datos)) return [];

    return datos.map((r) => ({
      etiqueta: String(r.display_name ?? "").split(",").slice(0, 4).join(", "),
      lat: Number(r.lat),
      lng: Number(r.lon),
    }));
  });
}

/** Distancia en kilómetros entre dos puntos. */
export function distanciaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
