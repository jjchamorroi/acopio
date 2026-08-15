import { query } from "@/lib/db";

/**
 * Sirve la imagen de un aviso desde la base de datos.
 *
 * Va en su propia ruta y no incrustada en el JSON del listado por dos razones:
 * el JSON viaja en cada carga de la portada y no debe llevar megabytes dentro,
 * y así el navegador puede cachear la imagen de verdad.
 *
 * Ojo con la caché: el mismo id SÍ puede cambiar de imagen si el admin edita el
 * aviso. Por eso quien pinta el `<img>` no usa esta ruta a pelo, sino
 * `urlImagenNoticia()`, que le cuelga `?v=<actualizado_en>`. Así la URL cambia
 * cuando cambia la foto y el `immutable` de abajo es cierto.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Id inválido", { status: 400 });

  const filas = await query<{ imagen: Buffer | null; imagen_tipo: string | null }>(
    "SELECT imagen, imagen_tipo FROM noticia WHERE id = $1 AND activa",
    [id]
  );

  const fila = filas[0];
  if (!fila?.imagen) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(fila.imagen), {
    headers: {
      "content-type": fila.imagen_tipo ?? "application/octet-stream",
      // La URL va versionada con `actualizado_en`, así que el contenido de
      // ESTA url sí es inmutable: al cambiar la imagen cambia la url.
      "cache-control": "public, max-age=31536000, immutable",
      // Sin `content-length` a mano. Lo calcula el runtime, y ponerlo aquí es
      // un clásico: si el proxy de delante comprime la respuesta, el número
      // deja de coincidir con lo que viaja y el navegador descarta la imagen.
      // En local no se nota porque no hay proxy.
    },
  });
}
