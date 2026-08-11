import { randomInt } from "node:crypto";
import { RADIO_DIFUSO_M } from "./constantes";

// Este módulo es solo de servidor: importa node:crypto. Los componentes de
// cliente que necesiten el radio deben tomarlo de "./constantes".

/**
 * Devuelve un punto al azar dentro de un círculo de ~300 m alrededor del
 * original. Es lo que se publica en el mapa en lugar de la casa de la persona.
 *
 * La raíz cuadrada en el radio no es adorno: sin ella los puntos se apelotonan
 * cerca del centro, y un atacante que junte varias donaciones de la misma zona
 * podría estimar dónde está el centro real. Con ella quedan repartidos parejo
 * por toda el área.
 *
 * Se calcula UNA vez, al insertar, y se guarda. Recalcularlo en cada consulta
 * dejaría triangular la posición real pidiendo la misma donación varias veces.
 */
export function difuminarUbicacion(
  lat: number,
  lng: number,
  radioMetros = RADIO_DIFUSO_M
): { lat: number; lng: number } {
  // randomInt usa el generador criptográfico: para una decisión de privacidad
  // no conviene un PRNG predecible.
  const angulo = (randomInt(0, 360_000) / 360_000) * 2 * Math.PI;
  const distancia = radioMetros * Math.sqrt(randomInt(0, 1_000_000) / 1_000_000);

  const metrosPorGradoLat = 111_320;
  const metrosPorGradoLng = 111_320 * Math.cos((lat * Math.PI) / 180);

  const deltaLat = (distancia * Math.cos(angulo)) / metrosPorGradoLat;
  const deltaLng =
    metrosPorGradoLng === 0
      ? 0
      : (distancia * Math.sin(angulo)) / metrosPorGradoLng;

  return {
    lat: Number((lat + deltaLat).toFixed(6)),
    lng: Number((lng + deltaLng).toFixed(6)),
  };
}
