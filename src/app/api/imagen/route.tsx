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
 * Caja del mapa, en píxeles.
 *
 * Cuadrada y a media anchura porque los datos también lo son: la zona
 * afectada abarca ~2,4° de latitud y ~2,6° de longitud. El espacio que libera
 * lo usan las cifras, que van al lado.
 */
const MAPA_ANCHO = 340;
const MAPA_ALTO = 340;

const TESELA = 256;

/** Proyección Web Mercator: de grados a píxeles absolutos en un zoom dado. */
function aPixeles(lat: number, lng: number, z: number) {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n * TESELA;
  const rad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    n *
    TESELA;
  return { x, y };
}

/**
 * Calcula el encuadre del mapa.
 *
 * SE INTENTÓ dibujar el mapa real con las teselas de OpenStreetMap y su
 * servidor lo rechaza: devuelve "Access blocked — App is not following the
 * tile usage policy". Su política prohíbe la descarga automatizada desde un
 * servidor, y con razón: son máquinas mantenidas por voluntarios. Buscarle la
 * vuelta —cambiando la cabecera, repartiendo entre réplicas— sería abusar de
 * un bien común, así que el mapa se dibuja con los puntos propios.
 *
 * Para un mapa de verdad haría falta un proveedor con clave (MapTiler,
 * Stadia, Mapbox), que tienen capa gratuita. Es media hora de trabajo y una
 * cuenta más que mantener.
 *
 * La proyección sigue siendo Web Mercator y no una regla de tres: es la que
 * usa el mapa del sitio, así que la nube de puntos tiene la misma forma que
 * la que la persona acaba de ver en pantalla.
 */
function encuadrar(
  puntos: { lat: number; lng: number }[],
  ancho: number,
  alto: number
) {
  const lats = puntos.map((p) => p.lat);
  const lngs = puntos.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Margen del 12 % para que ningún punto quede pegado al borde.
  const margen = 0.12;

  let z = 13;
  for (; z >= 4; z--) {
    const a = aPixeles(maxLat, minLng, z);
    const b = aPixeles(minLat, maxLng, z);
    if (
      Math.abs(b.x - a.x) <= ancho * (1 - margen * 2) &&
      Math.abs(b.y - a.y) <= alto * (1 - margen * 2)
    ) {
      break;
    }
  }
  // Un solo punto no tiene extensión: se le da un zoom de barrio.
  if (puntos.length === 1) z = 13;

  const centro = aPixeles((minLat + maxLat) / 2, (minLng + maxLng) / 2, z);
  // Píxel absoluto de la esquina superior izquierda de la caja.
  const origenX = centro.x - ancho / 2;
  const origenY = centro.y - alto / 2;

  return { z, origenX, origenY };
}

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
  const depto = searchParams.get("departamento") ?? "";
  const variante = searchParams.get("v") ?? "falta";
  /**
   * El dominio, escrito para que alguien lo pueda TECLEAR desde Instagram.
   *
   * `new URL(req.url).host` devolvía "[::]:3000" dentro del contenedor, que es
   * la dirección IPv6 de escucha. Se prefiere el dominio configurado; si no,
   * la cabecera del proxy; y se limpian corchetes y "www.".
   */
  const host = (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ||
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    new URL(req.url).host
  )
    .replace(/^\[|\]$/g, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");

  let titulo = "";
  let subtitulo = "";
  let falta: string[] = [];
  let sobra: string[] = [];
  let cifra = "";
  let cifraPie = "";

  /** Puntos del mapa, ya normalizados a 0–1 dentro de su propio encuadre. */
  let puntos: { x: number; y: number; urgente: boolean }[] = [];
  let totalLugares = 0;
  let totalAlbergues = 0;

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
      const centros = await listarCentros({
        ...(ciudadSlug ? { ciudad: ciudadSlug } : {}),
        ...(depto ? { departamento: depto } : {}),
      });
      const lugar = centros[0];
      titulo = ciudadSlug
        ? (lugar?.ciudad_nombre ?? "Colombia")
        : depto || "Colombia";
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
      // "Otros" queda fuera: en un cartel que le dice a alguien qué meter en
      // el carro, "otros" no le dice nada.
      const top = (m: Map<string, number>, n: number) =>
        [...m.entries()]
          .filter(([cat]) => cat !== "otros")
          .sort((a, b) => b[1] - a[1])
          .slice(0, n)
          .map(([cat]) => buscarCategoria(cat)?.label ?? cat);

      // Cuatro y no cinco: con cinco, el cartel se desbordaba por abajo y las
      // cifras se montaban sobre el pie.
      falta = top(urgentes, 4);

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

      totalLugares = centros.length;
      totalAlbergues = centros.filter((c) => c.tipo === "albergue").length;

      // Mapa dibujado con los puntos reales, sin pedirle tiles a nadie.
      //
      // No hay servicio de mapas estáticos en OpenStreetMap y los que existen
      // piden clave; además, una imagen que se genera cada vez que alguien la
      // comparte no debería depender de un tercero que puede bloquearnos. Con
      // 282 puntos, la nube dibuja sola el occidente colombiano.
      if (centros.length > 0) {
        const enc = encuadrar(centros, MAPA_ANCHO, MAPA_ALTO);

        puntos = centros
          .map((c) => {
            const px = aPixeles(c.lat, c.lng, enc.z);
            return {
              x: px.x - enc.origenX,
              y: px.y - enc.origenY,
              urgente: c.necesidades.some((n) => n.nivel === "urgente"),
            };
          })
          // Fuera lo que caiga fuera de la caja. Un punto medio recortado en
          // el borde se lee como un fallo de dibujo, no como un lugar.
          .filter(
            (p) =>
              p.x >= 8 &&
              p.x <= MAPA_ANCHO - 8 &&
              p.y >= 8 &&
              p.y <= MAPA_ALTO - 8
          );
      }
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
                  {/* Nada de lo que alguien lleva de buena fe "estorba". Lo
                      que se dice es que de eso ya hay, y que lo de arriba
                      hace más falta — que es la misma información sin
                      reprocharle nada a quien iba a ayudar. */}
                  <div style={{ display: "flex", fontSize: 32, color: "#6b7280", marginTop: 14 }}>
                    Ya tienen suficiente. Lo de arriba hace más falta.
                  </div>
                </div>
              )}

              {/* El mapa con los puntos reales del filtro. Es lo que hace que
                  el cartel se reconozca como "de este sitio" y de un vistazo
                  dice cuánta cobertura hay. */}
              {/* Mapa y cifras en la misma fila: el mapa cuadrado deja libre
                  media anchura, y las cifras la ocupan sin alargar el cartel. */}
              <div style={{ display: "flex", alignItems: "center", marginTop: 28 }}>
                <div
                  style={{
                    display: "flex",
                    position: "relative",
                    width: MAPA_ANCHO,
                    height: MAPA_ALTO,
                    borderRadius: 28,
                    // Claro y no oscuro: un rectángulo negro en medio del
                    // cartel se lee como un hueco, no como un mapa.
                    background: HUESO,
                    border: "2px solid #2b3442",
                    // Recorta lo que se salga: sin esto, un punto cerca del
                    // borde se dibujaba medio fuera de la caja.
                    overflow: "hidden",
                  }}
                >
                  {/* Retícula tenue. No son meridianos de verdad; están para
                      que el recuadro se lea como un mapa y no como un cuadro
                      de color con manchas encima. */}
                  {[1, 2, 3].map((i) => (
                    <div
                      key={`v${i}`}
                      style={{
                        display: "flex",
                        position: "absolute",
                        left: (MAPA_ANCHO / 4) * i,
                        top: 0,
                        width: 1,
                        height: MAPA_ALTO,
                        background: "#d8d5cd",
                      }}
                    />
                  ))}
                  {[1, 2, 3].map((i) => (
                    <div
                      key={`h${i}`}
                      style={{
                        display: "flex",
                        position: "absolute",
                        left: 0,
                        top: (MAPA_ALTO / 4) * i,
                        width: MAPA_ANCHO,
                        height: 1,
                        background: "#d8d5cd",
                      }}
                    />
                  ))}
                  {puntos.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        position: "absolute",
                        left: p.x - (p.urgente ? 11 : 8),
                        top: p.y - (p.urgente ? 11 : 8),
                        width: p.urgente ? 22 : 16,
                        height: p.urgente ? 22 : 16,
                        borderRadius: 999,
                        background: p.urgente ? ROJO : VERDE,
                        // Aro blanco: sobre las calles claras del mapa, un
                        // punto sin borde se confunde con un edificio.
                        border: "3px solid #ffffff",
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", marginLeft: 56 }}>
                  <div style={{ display: "flex", flexDirection: "column", marginBottom: 26 }}>
                    <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>
                      {totalLugares}
                    </div>
                    <div style={{ display: "flex", fontSize: 32, color: "#8f98a8" }}>
                      lugares
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", marginBottom: 26 }}>
                    <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: ROJO, lineHeight: 1 }}>
                      {cifra}
                    </div>
                    <div style={{ display: "flex", fontSize: 32, color: "#8f98a8" }}>
                      con algo urgente
                    </div>
                  </div>
                  {totalAlbergues > 0 && (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: VERDE, lineHeight: 1 }}>
                        {totalAlbergues}
                      </div>
                      <div style={{ display: "flex", fontSize: 32, color: "#8f98a8" }}>
                        albergues
                      </div>
                    </div>
                  )}
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
