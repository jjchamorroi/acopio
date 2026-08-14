import { query } from "@/lib/db";

/**
 * Sirve la imagen de un aviso desde la base de datos.
 *
 * Va en su propia ruta y no incrustada en el JSON del listado por dos razones:
 * el JSON viaja en cada carga de la portada y no debe llevar megabytes dentro,
 * y así el navegador puede cachear la imagen de verdad.
 *
 * `immutable` con un año es seguro porque el contenido de una imagen nunca
 * cambia bajo el mismo id: si el aviso cambia de foto, se crea otro registro o
 * se le cambia el id de consulta. Nunca se reescribe la misma URL con otra
 * imagen.
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
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(fila.imagen.length),
    },
  });
}
