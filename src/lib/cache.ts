/**
 * Caché en memoria con vencimiento, para las consultas de lectura.
 *
 * Por qué existe: cada visitante disparaba una consulta a Postgres y un render
 * completo. Con un enlace circulando por WhatsApp eso convierte la portada en
 * el cuello de botella (~50 req/s medidos) mucho antes que cualquier otra
 * cosa. Sirviendo el mismo resultado durante unos segundos, la misma máquina
 * atiende un orden de magnitud más de gente.
 *
 * En memoria y no en Redis a propósito: son unos pocos kilobytes y una sola
 * instancia. Si algún día hay varias réplicas, cada una tendrá su copia — lo
 * cual sigue siendo correcto, porque el dato solo puede estar desactualizado
 * los segundos del TTL.
 *
 * Cuánto desfase se tolera: un lugar registrado hace veinte segundos que
 * todavía no aparece en el mapa no le hace daño a nadie. Un mapa que no carga
 * porque el servidor está saturado, sí.
 */

type Entrada = { valor: unknown; vence: number };

const cache = new Map<string, Entrada>();

/** Tope de entradas: evita que combinaciones raras de filtros hagan crecer el mapa sin fin. */
const MAX_ENTRADAS = 500;

export function invalidarCache() {
  cache.clear();
}

export async function conCache<T>(
  clave: string,
  ttlSegundos: number,
  fn: () => Promise<T>
): Promise<T> {
  const ahora = Date.now();
  const guardado = cache.get(clave);

  if (guardado && guardado.vence > ahora) {
    return guardado.valor as T;
  }

  const valor = await fn();

  if (cache.size >= MAX_ENTRADAS) {
    // Descarta la más vieja por orden de inserción. Con este volumen no
    // justifica un LRU de verdad.
    const primera = cache.keys().next().value;
    if (primera !== undefined) cache.delete(primera);
  }

  cache.set(clave, { valor, vence: ahora + ttlSegundos * 1000 });
  return valor;
}
