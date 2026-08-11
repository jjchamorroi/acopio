import { listarCiudades } from "./consultas";
import { distanciaKm } from "./geocodificacion";

/**
 * Comprueba que el punto marcado en el mapa sea coherente con la ciudad
 * elegida en el formulario.
 *
 * El problema real: la dirección escrita y el punto del mapa son dos datos
 * independientes, y nadie los compara. Alguien puede escribir "Calle 20,
 * Pereira" y hacer clic en Manizales, y eso se publicaría sin que nadie lo
 * note hasta que un voluntario maneje una hora para nada.
 *
 * Los márgenes son generosos a propósito: los municipios colombianos incluyen
 * veredas a decenas de kilómetros del casco urbano, y un acopio rural es un
 * caso legítimo. Lo que se busca frenar es el error de ciudad equivocada, no
 * el registro rural.
 */

/** Más lejos que esto del centro urbano, seguro es un error. */
const LIMITE_ABSOLUTO_KM = 60;

/** A partir de acá, si hay otra ciudad más cerca, se asume equivocación. */
const LIMITE_CON_ALTERNATIVA_KM = 25;

export async function validarUbicacionEnCiudad(
  ciudadSlug: string,
  lat: number,
  lng: number
): Promise<string | null> {
  const ciudades = await listarCiudades();
  const elegida = ciudades.find((c) => c.slug === ciudadSlug);
  if (!elegida) return null; // La llave foránea ya se encarga de este caso.

  const distancia = distanciaKm(lat, lng, elegida.lat, elegida.lng);

  let masCercana = elegida;
  let menorDistancia = distancia;
  for (const c of ciudades) {
    const d = distanciaKm(lat, lng, c.lat, c.lng);
    if (d < menorDistancia) {
      menorDistancia = d;
      masCercana = c;
    }
  }

  if (distancia > LIMITE_ABSOLUTO_KM) {
    return (
      `El punto marcado está a ${Math.round(distancia)} km de ${elegida.nombre}. ` +
      `Revisá que hayas marcado en el mapa el lugar correcto.`
    );
  }

  if (
    distancia > LIMITE_CON_ALTERNATIVA_KM &&
    masCercana.slug !== elegida.slug
  ) {
    // Redondear a entero convertía "a 400 m" en un desconcertante "a 0 km".
    const cerca =
      menorDistancia < 1
        ? "prácticamente encima"
        : `a ${Math.round(menorDistancia)} km`;
    return (
      `Elegiste ${elegida.nombre}, pero el punto que marcaste está ` +
      `${cerca} de ${masCercana.nombre}. ` +
      `Corregí la ciudad o el punto en el mapa.`
    );
  }

  return null;
}
