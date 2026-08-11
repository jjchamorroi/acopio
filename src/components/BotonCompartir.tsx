"use client";

import { useState } from "react";

/**
 * Compartir por WhatsApp, que es por donde esto circula de verdad en Colombia.
 *
 * En celular usa el menú nativo del sistema (navigator.share) si existe, que
 * ofrece WhatsApp junto con todo lo demás. En escritorio no existe, así que
 * cae al enlace de WhatsApp Web, y si tampoco, a copiar al portapapeles.
 */
export default function BotonCompartir({
  texto,
  url,
  className = "",
}: {
  texto: string;
  url?: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    const enlace = url ?? window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ text: texto, url: enlace });
        return;
      } catch {
        // El usuario canceló el menú: no es un error que haya que mostrar.
        return;
      }
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${texto} ${enlace}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copiar() {
    await navigator.clipboard.writeText(url ?? window.location.href);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        onClick={compartir}
        className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1da851]"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4 fill-current"
          aria-hidden="true"
        >
          <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.04 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.37 9.37 0 0 1-1.44-5A9.44 9.44 0 0 1 18.72 5.4a9.38 9.38 0 0 1 2.77 6.67c0 5.19-4.24 9.43-9.45 9.43M20.5 3.6A11.75 11.75 0 0 0 12.04.1C5.5.1.2 5.4.2 11.93c0 2.09.55 4.13 1.6 5.93L.1 24l6.3-1.65a11.85 11.85 0 0 0 5.64 1.44h.01c6.53 0 11.84-5.31 11.84-11.84 0-3.16-1.23-6.14-3.47-8.37" />
        </svg>
        Compartir
      </button>

      <button
        type="button"
        onClick={copiar}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        {copiado ? "¡Copiado!" : "Copiar enlace"}
      </button>
    </div>
  );
}
