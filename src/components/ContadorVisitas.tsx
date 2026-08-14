"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Avisa al servidor de cada página vista.
 *
 * Depende de `usePathname` y no de un efecto al montar porque el sitio navega
 * sin recargar: sin esto, alguien que entra al mapa y luego abre la guía
 * contaría como una sola visita.
 *
 * `keepalive` para que la petición sobreviva si la persona cierra la pestaña
 * justo después de abrir: es exactamente el caso de quien mira algo rápido y
 * se va, que es el que más cuenta en una emergencia.
 */
export default function ContadorVisitas() {
  const ruta = usePathname();

  useEffect(() => {
    if (!ruta) return;
    // El admin no se cuenta: son nuestras propias visitas y ensuciarían la
    // cifra justo en las páginas que más miramos nosotros.
    if (ruta.startsWith("/admin")) return;

    const t = setTimeout(() => {
      void fetch("/api/visita", {
        method: "POST",
        headers: { "content-type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          ruta,
          referido: document.referrer || null,
        }),
      }).catch(() => {
        // Que no se cuente una visita no le puede estropear la página a nadie.
      });
    }, 400); // margen para no contar un rebote instantáneo

    return () => clearTimeout(t);
  }, [ruta]);

  return null;
}
