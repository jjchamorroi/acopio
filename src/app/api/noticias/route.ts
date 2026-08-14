import { NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";
import { invalidarCache } from "@/lib/cache";
import { esAdmin } from "@/lib/tokens";
import type { NoticiaPublica } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/**
 * Tope de la imagen. 2 MB es de sobra para un aviso —una foto de teléfono
 * comprimida pesa menos— y evita que una imagen sin recortar de 12 MB acabe
 * viajando en cada carga de la portada, que es justo donde está la gente con
 * datos móviles en zona afectada.
 */
const MAX_IMAGEN = 2 * 1024 * 1024;

const TIPOS_IMAGEN = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * GET /api/noticias        -> las visibles (público)
 * GET /api/noticias?todas=1 -> todas, incluidas apagadas y vencidas (admin)
 *
 * Nunca devuelve la columna `imagen`: son megabytes de binario que no pintan
 * nada en un JSON. La imagen se pide aparte, por su propia ruta, que además
 * se puede cachear de verdad.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const todas = searchParams.get("todas") === "1" && esAdmin(req);

  const noticias = await query<NoticiaPublica>(
    `SELECT id, titulo, cuerpo, enlace, enlace_texto, urgente, activa,
            vence_en, orden, creado_en,
            (imagen IS NOT NULL) AS tiene_imagen
       FROM noticia
      ${todas ? "" : "WHERE activa AND (vence_en IS NULL OR vence_en > now())"}
      ORDER BY orden DESC, creado_en DESC`
  );

  return NextResponse.json({ noticias });
}

export async function POST(req: Request) {
  if (!esAdmin(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let datos: FormData;
  try {
    datos = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const titulo = String(datos.get("titulo") ?? "").trim();
  if (!titulo || titulo.length > 160) {
    return NextResponse.json(
      { error: "El título es obligatorio y máximo 160 caracteres" },
      { status: 400 }
    );
  }

  const archivo = datos.get("imagen");
  let imagen: Buffer | null = null;
  let imagenTipo: string | null = null;

  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > MAX_IMAGEN) {
      return NextResponse.json(
        { error: `La imagen pesa ${(archivo.size / 1048576).toFixed(1)} MB. El máximo es 2 MB.` },
        { status: 400 }
      );
    }
    if (!TIPOS_IMAGEN.has(archivo.type)) {
      return NextResponse.json(
        { error: `Formato no admitido (${archivo.type || "desconocido"}). Usa JPG, PNG, WEBP o GIF.` },
        { status: 400 }
      );
    }
    imagen = Buffer.from(await archivo.arrayBuffer());
    imagenTipo = archivo.type;
  }

  const texto = (k: string, max: number) => {
    const v = String(datos.get(k) ?? "").trim();
    return v ? v.slice(0, max) : null;
  };

  const { rows } = await getPool().query(
    `INSERT INTO noticia
       (titulo, cuerpo, imagen, imagen_tipo, enlace, enlace_texto, urgente,
        activa, vence_en, orden)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      titulo,
      texto("cuerpo", 1200),
      imagen,
      imagenTipo,
      texto("enlace", 500),
      texto("enlace_texto", 60),
      datos.get("urgente") === "1",
      datos.get("activa") !== "0",
      texto("vence_en", 40),
      Number(datos.get("orden") ?? 0) || 0,
    ]
  );

  invalidarCache();
  return NextResponse.json({ id: rows[0].id }, { status: 201 });
}
