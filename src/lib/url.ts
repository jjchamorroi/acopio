/**
 * URL pública del sitio.
 *
 * Las previsualizaciones de WhatsApp y Twitter necesitan URLs ABSOLUTAS: una
 * ruta relativa a la imagen hace que la tarjeta salga sin foto. Por eso hace
 * falta saber el dominio desde el servidor.
 *
 * Railway inyecta RAILWAY_PUBLIC_DOMAIN sola, así que en producción esto
 * funciona sin configurar nada. NEXT_PUBLIC_SITE_URL queda como escape para
 * cuando haya dominio propio.
 */
export function urlBase(): URL {
  const explicita = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicita) {
    return new URL(explicita.startsWith("http") ? explicita : `https://${explicita}`);
  }

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railway) return new URL(`https://${railway}`);

  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}
