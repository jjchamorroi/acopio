"use client";

import { useState } from "react";

/**
 * Compartir la imagen por el menú nativo del sistema.
 *
 * En vez de mandar a una página a descargar un archivo, se descarga la imagen
 * aquí, se convierte en File y se abre el menú de compartir del teléfono, que
 * ya ofrece Instagram —Historia y Feed—, WhatsApp y todo lo demás. Es un toque
 * en vez de cuatro pasos.
 *
 * `navigator.share` con archivos existe en Android Chrome y en Safari de iOS
 * 15+, pero no en escritorio. Por eso se comprueba con `canShare` ANTES de
 * prometer nada: si no se puede, se descarga, que es lo único que queda.
 */
export default function BotonInstagram({
  url,
  nombre = "red-de-acopio.png",
  className = "",
}: {
  /** Ruta de la imagen generada, ya con los filtros aplicados. */
  url: string;
  nombre?: string;
  className?: string;
}) {
  const [estado, setEstado] = useState<"listo" | "cargando" | "descargada">(
    "listo"
  );

  async function compartir() {
    setEstado("cargando");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("No se pudo generar la imagen");
      const blob = await res.blob();
      const archivo = new File([blob], nombre, { type: "image/png" });

      // Se pregunta por el archivo concreto: hay navegadores que tienen
      // `share` pero no aceptan archivos, y prometerlo sin comprobar acaba en
      // un error justo cuando la persona ya se decidió a compartir.
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo] });
        setEstado("listo");
        return;
      }

      // Escritorio: descargar es lo único que queda. Se publica a mano.
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(blob);
      enlace.download = nombre;
      enlace.click();
      URL.revokeObjectURL(enlace.href);
      setEstado("descargada");
      setTimeout(() => setEstado("listo"), 2500);
    } catch {
      // Si la persona cierra el menú del sistema no es un error que mostrar.
      setEstado("listo");
    }
  }

  return (
    <button
      type="button"
      onClick={compartir}
      disabled={estado === "cargando"}
      title="Compartir la imagen en Instagram y otras redes"
      aria-label="Compartir la imagen en Instagram y otras redes"
      className={`inline-flex items-center gap-2 rounded-lg border-[1.5px] border-[var(--color-borde-fuerte)] bg-white px-3.5 py-2.5 text-sm font-bold transition hover:bg-[var(--color-hueso)] disabled:opacity-60 ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-5">
        <rect
          x="2.5"
          y="2.5"
          width="19"
          height="19"
          rx="5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="12"
          cy="12"
          r="4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="17.6" cy="6.4" r="1.4" fill="currentColor" />
      </svg>
      {estado === "cargando"
        ? "Generando…"
        : estado === "descargada"
          ? "¡Descargada!"
          : "Instagram"}
    </button>
  );
}
