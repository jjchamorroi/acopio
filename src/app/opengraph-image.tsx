import { ImageResponse } from "next/og";
import { listarCentros } from "@/lib/consultas";

export const runtime = "nodejs";

/**
 * Se regenera cada 5 minutos, no en cada petición.
 *
 * Es el endpoint más caro que tenemos —dibuja un PNG de 1200x630— y el más
 * pedido por robots: WhatsApp descarga esta imagen cada vez que alguien pega
 * el enlace en un chat. Medido sin caché aguantaba ~25 req/s con p95 de 11
 * segundos, o sea que un link circulando lo volvía el primer cuello de
 * botella. Que las cifras tengan cinco minutos de antigüedad no le importa a
 * nadie; que la tarjeta no cargue, sí.
 */
export const revalidate = 300;
export const alt = "Red de Acopio — sismo Colombia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagen de previsualización para WhatsApp.
 *
 * Lleva números reales y no un logo: quien recibe el enlace en un grupo tiene
 * que entender en dos segundos que hay algo vivo del otro lado. "38 lugares
 * necesitan algo urgente" mueve a alguien; un logotipo bonito, no.
 */
export default async function Image() {
  let total = 0;
  let urgentes = 0;
  let albergues = 0;

  try {
    const centros = await listarCentros({});
    total = centros.length;
    urgentes = centros.filter((c) =>
      c.necesidades.some((n) => n.nivel === "urgente")
    ).length;
    albergues = centros.filter((c) => c.tipo === "albergue").length;
  } catch {
    // Si la base no responde, la tarjeta sale sin cifras antes que sin imagen.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f172a",
          padding: 70,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "#94a3b8", marginBottom: 18 }}>
            Sismo en Colombia · 10 de agosto de 2026
          </div>
          <div
            style={{
              fontSize: 74,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
              maxWidth: 1000,
            }}
          >
            ¿Dónde hace falta lo que podés donar?
          </div>
        </div>

        <div style={{ display: "flex", gap: 60 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 68, fontWeight: 700, color: "#ffffff" }}>
              {total}
            </span>
            <span style={{ fontSize: 28, color: "#94a3b8" }}>
              lugares activos
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 68, fontWeight: 700, color: "#f87171" }}>
              {urgentes}
            </span>
            <span style={{ fontSize: 28, color: "#94a3b8" }}>
              con algo urgente
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 68, fontWeight: 700, color: "#34d399" }}>
              {albergues}
            </span>
            <span style={{ fontSize: 28, color: "#94a3b8" }}>albergues</span>
          </div>
        </div>

        <div style={{ fontSize: 28, color: "#64748b" }}>
          Red de Acopio · mapa colaborativo
        </div>
      </div>
    ),
    {
      ...size,
      // Para que los intermedios (CDN, proxy de Railway, cachés de WhatsApp)
      // también la reutilicen y ni siquiera nos lleguen a pedir.
      headers: {
        "cache-control":
          "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
