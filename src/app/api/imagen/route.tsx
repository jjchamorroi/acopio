import { ImageResponse } from "next/og";
import { listarCentros, brechaAtencion } from "@/lib/consultas";
import { categoria as buscarCategoria } from "@/lib/categorias";

export const runtime = "nodejs";

/**
 * Imagen para compartir en Instagram.
 *
 * Instagram no lee vistas previas de enlaces: ahí solo circulan imágenes. Así
 * que en vez de una tarjeta que se genera sola al pegar un link —lo que hace
 * /opengraph-image para WhatsApp— hay que producir un archivo que la persona
 * descarga y publica.
 *
 * 1080x1920 porque el formato que de verdad se comparte es la historia, donde
 * además se le puede pegar el enlace encima.
 *
 * El contenido NO es un logo con "ayuda a los damnificados". Eso ya lo publica
 * todo el mundo y no aporta nada. Lo que solo tenemos nosotros es la
 * ASIMETRÍA: qué falta y qué sobra, municipio por municipio. Un cartel que
 * dice "no lleves ropa a Manizales, llévales pañales" cambia lo que alguien
 * mete en el carro; uno que dice "ayudemos" no cambia nada.
 */
export const revalidate = 300;

const ANCHO = 1080;
const ALTO = 1920;

/**
 * Fuente en negrita de verdad.
 *
 * Sin datos de fuente, satori dibuja todo con el mismo peso y `fontWeight:800`
 * no hace nada: por eso el cartel se veía flojo pese a los tamaños enormes. En
 * una imagen que compite en un feed de Instagram, el contraste de peso es
 * medio impacto.
 *
 * Se cachea en memoria del proceso y, si la descarga falla —el build local de
 * Docker no tiene red—, se sigue sin ella: un cartel menos rotundo es mejor
 * que un 500.
 */
let fuenteNegrita: ArrayBuffer | null = null;
let intentada = false;

async function cargarFuente(): Promise<ArrayBuffer | null> {
  if (fuenteNegrita || intentada) return fuenteNegrita;
  intentada = true;
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Public+Sans:wght@800&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    ).then((r) => r.text());
    const url = css.match(/src:\s*url\((https:[^)]+\.(?:woff2|ttf))\)/)?.[1];
    if (!url) return null;
    fuenteNegrita = await fetch(url).then((r) => r.arrayBuffer());
    return fuenteNegrita;
  } catch {
    return null;
  }
}

const TINTA = "#10151c";
const ROJO = "#c02b1c";
const HUESO = "#f4f5f1";
const VERDE = "#1f7a4d";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ciudadSlug = searchParams.get("ciudad") ?? "";
  const variante = searchParams.get("v") ?? "falta";
  const host = new URL(req.url).host;

  let titulo = "";
  let subtitulo = "";
  let falta: string[] = [];
  let sobra: string[] = [];
  let cifra = "";
  let cifraPie = "";

  const negrita = await cargarFuente();

  try {
    if (variante === "brecha") {
      const b = await brechaAtencion();
      const sin = b.filter((m) => m.puntos === 0).length;
      cifra = String(sin);
      cifraPie = `de ${b.length} municipios con daño documentado no tienen\nun solo punto de acopio, albergue o atención`;
      titulo = "Nadie está llegando";
      subtitulo = "Sismo del 10 de agosto";
    } else {
      const centros = await listarCentros(
        ciudadSlug ? { ciudad: ciudadSlug } : {}
      );
      const lugar = centros[0];
      titulo = ciudadSlug
        ? (lugar?.ciudad_nombre ?? "Colombia")
        : "Colombia";
      // Corto a propósito: más largo se parte en dos líneas y el nombre de la
      // ciudad pierde el sitio de honor.
      subtitulo = "Qué llevar y qué no";

      // Se cuenta en cuántos lugares aparece cada categoría, no cuántas veces:
      // lo que importa es "esto lo piden en muchos sitios", no el total bruto.
      const urgentes = new Map<string, number>();
      const sobrantes = new Map<string, number>();
      for (const c of centros) {
        for (const n of c.necesidades) {
          const m = n.nivel === "urgente" ? urgentes : n.nivel === "sobra" ? sobrantes : null;
          if (m) m.set(n.categoria, (m.get(n.categoria) ?? 0) + 1);
        }
      }
      const top = (m: Map<string, number>, n: number) =>
        [...m.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, n)
          .map(([cat]) => buscarCategoria(cat)?.label ?? cat);

      falta = top(urgentes, 5);

      // Una categoría no puede salir en las dos listas.
      //
      // Es perfectamente posible que un acopio pida agua urgente mientras a
      // otro le sobra, y las dos cosas son ciertas. Pero en un cartel eso se
      // lee como una contradicción —"lleva alimentos / alimentos ya no"— y
      // quien lo ve no sabe qué hacer.
      //
      // Ante el empate gana "LLEVA": decirle a alguien que no lleve algo que
      // en otro sitio hace falta con urgencia cuesta comida que no llegó; al
      // revés solo cuesta un bulto de más en un lugar que ya lo tiene, y el
      // mapa le dice a cuál ir.
      const enFalta = new Set(falta);
      sobra = top(sobrantes, 4).filter((s) => !enFalta.has(s)).slice(0, 3);
      cifra = String(centros.filter((c) => c.necesidades.some((n) => n.nivel === "urgente")).length);
      cifraPie = "lugares necesitan algo URGENTE";
    }
  } catch {
    titulo = "Red de Acopio";
    subtitulo = "Sismo del 10 de agosto · Colombia";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: ANCHO,
          height: ALTO,
          display: "flex",
          flexDirection: "column",
          background: TINTA,
          fontFamily: negrita ? "PublicSans, sans-serif" : "sans-serif",
          padding: 80,
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 34, color: "#8f98a8", letterSpacing: 2 }}>
            {subtitulo.toUpperCase()}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: variante === "brecha" ? 118 : 132,
              fontWeight: 800,
              lineHeight: 1,
              marginTop: 28,
              letterSpacing: -3,
            }}
          >
            {titulo}
          </div>

          {variante === "brecha" ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 90 }}>
              <div style={{ display: "flex", fontSize: 380, fontWeight: 800, color: ROJO, lineHeight: 0.85 }}>
                {cifra}
              </div>
              <div style={{ display: "flex", fontSize: 46, color: "#d5dae2", marginTop: 40, lineHeight: 1.35, whiteSpace: "pre-line" }}>
                {cifraPie}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 70, flex: 1 }}>
              {/* Lo que falta, en rojo y grande: es la acción. */}
              <div style={{ display: "flex", flexDirection: "column", background: ROJO, borderRadius: 28, padding: 44 }}>
                <div style={{ display: "flex", fontSize: 38, fontWeight: 700, letterSpacing: 3 }}>
                  LLEVA ESTO
                </div>
                <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
                  {(falta.length ? falta : ["Consulta el mapa"]).map((f) => (
                    <div key={f} style={{ display: "flex", fontSize: 62, fontWeight: 800, lineHeight: 1.3 }}>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Y lo que NO. Esta es la parte que nadie más publica y la que
                  evita que lleguen cinco toneladas de lo que ya sobra. */}
              {sobra.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", background: HUESO, color: TINTA, borderRadius: 28, padding: 44, marginTop: 30 }}>
                  <div style={{ display: "flex", fontSize: 38, fontWeight: 700, letterSpacing: 3, color: "#6b7280" }}>
                    ESTO YA NO
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", marginTop: 16 }}>
                    {sobra.map((s) => (
                      <div key={s} style={{ display: "flex", fontSize: 54, fontWeight: 700, lineHeight: 1.35, marginRight: 24 }}>
                        {s}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", fontSize: 32, color: "#6b7280", marginTop: 14 }}>
                    Ya tienen de sobra. Llevarlo estorba.
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "baseline", marginTop: 46 }}>
                <div style={{ display: "flex", fontSize: 130, fontWeight: 800, color: VERDE, lineHeight: 1 }}>
                  {cifra}
                </div>
                <div style={{ display: "flex", fontSize: 40, color: "#d5dae2", marginLeft: 22 }}>
                  {cifraPie}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* El enlace tiene que leerse de lejos: en Instagram no se puede tocar,
            hay que poder teclearlo. */}
        <div style={{ display: "flex", flexDirection: "column", borderTop: "3px solid #2b3442", paddingTop: 40 }}>
          <div style={{ display: "flex", fontSize: 34, color: "#8f98a8" }}>
            Mira qué necesita cada lugar antes de salir de la casa
          </div>
          <div style={{ display: "flex", fontSize: 62, fontWeight: 800, marginTop: 12 }}>
            {host}
          </div>
        </div>
      </div>
    ),
    {
      width: ANCHO,
      height: ALTO,
      ...(negrita
        ? {
            fonts: [
              { name: "PublicSans", data: negrita, weight: 800 as const, style: "normal" as const },
            ],
          }
        : {}),
      headers: {
        "cache-control": "public, max-age=300",
        "content-disposition": `inline; filename="red-de-acopio-${variante}.png"`,
      },
    }
  );
}
