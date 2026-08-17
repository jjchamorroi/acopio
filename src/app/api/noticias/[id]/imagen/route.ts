import sharp from "sharp";
import { query } from "@/lib/db";

export const runtime = "nodejs";

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
 *
 * Con `?ancho=` devuelve una miniatura. Existe para que la portada pueda
 * enseñar una miniatura de cada aviso PLEGADO sin descargar el afiche entero:
 * son ~130 KB por aviso frente a unos 4 KB, y buena parte de quien entra está
 * con datos móviles en zona afectada.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Anchos permitidos.
 *
 * Cerrado a una lista y no a un número libre: si no, cualquiera puede pedir
 * mil tamaños distintos y poner al servidor a redimensionar imágenes sin parar
 * mientras la gente intenta consultar el mapa.
 */
const ANCHOS = new Set([96, 160, 320]);

export async function GET(
  req: Request,
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

  let cuerpo: Buffer = fila.imagen;
  let tipo = fila.imagen_tipo ?? "application/octet-stream";

  const pedido = Number(new URL(req.url).searchParams.get("ancho"));
  if (ANCHOS.has(pedido)) {
    try {
      cuerpo = await sharp(fila.imagen)
        // `rotate()` sin argumentos aplica la orientación del EXIF. Sin esto,
        // una foto hecha con el teléfono de lado sale girada en la miniatura
        // aunque se vea derecha en grande.
        .rotate()
        .resize({ width: pedido, withoutEnlargement: true })
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer();
      tipo = "image/jpeg";
    } catch {
      // Si falla el redimensionado se manda la original. Pesa más, pero un
      // aviso con la foto grande es mucho mejor que un aviso con un hueco.
    }
  }

  return new Response(new Uint8Array(cuerpo), {
    headers: {
      "content-type": tipo,
      "cache-control": "public, max-age=31536000, immutable",
      // Sin `content-length` a mano. Lo calcula el runtime, y ponerlo aquí es
      // un clásico: si el proxy de delante comprime la respuesta, el número
      // deja de coincidir con lo que viaja y el navegador descarta la imagen.
      // En local no se nota porque no hay proxy.
    },
  });
}
