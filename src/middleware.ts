import { NextResponse, type NextRequest } from "next/server";

/**
 * Manda los enlaces viejos al dominio propio, cuando exista.
 *
 * Railway no redirige: su proxy mapea hostname → servicio, y si se quita ese
 * mapeo el hostname simplemente deja de responder. Peor: el subdominio
 * liberado vuelve al pozo común y otra persona podría reclamarlo y servir
 * cualquier cosa en una dirección que nuestra gente ya compartió por WhatsApp.
 *
 * Por eso el dominio de Railway NUNCA se borra. Se deja vivo y se redirige
 * desde acá, que es el único sitio donde sí se puede.
 *
 * Está dormido mientras no exista NEXT_PUBLIC_SITE_URL: hoy no hace nada.
 */
export function middleware(req: NextRequest) {
  const destino = process.env.NEXT_PUBLIC_SITE_URL;
  if (!destino) return NextResponse.next();

  let canonico: URL;
  try {
    canonico = new URL(
      destino.startsWith("http") ? destino : `https://${destino}`
    );
  } catch {
    // Una variable mal escrita no puede tumbar el sitio entero.
    return NextResponse.next();
  }

  const host = req.headers.get("host");
  if (!host || host === canonico.host) return NextResponse.next();

  // Nunca redirigir en local: rompería el desarrollo apuntando a producción.
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.protocol = canonico.protocol;
  url.host = canonico.host;
  url.port = "";

  // 308 y no 301: preserva el método y el cuerpo. Un 301 convierte un POST en
  // GET, y un formulario enviado contra el dominio viejo se perdería en
  // silencio.
  return NextResponse.redirect(url, 308);
}

export const config = {
  /**
   * Todo MENOS las rutas de API y los archivos estáticos.
   *
   * Excluir /api no es cosmético: el healthcheck de Railway consulta
   * /api/salud, y si le devolvemos una redirección en vez de un 200 el
   * despliegue queda marcado como no saludable y se cae solo. Un detalle que
   * convierte una mejora en una caída.
   */
  matcher: [
    "/((?!api/|_next/static|_next/image|icon.svg|apple-icon|opengraph-image|favicon.ico|robots.txt).*)",
  ],
};
