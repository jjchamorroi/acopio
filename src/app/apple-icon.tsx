import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Ícono para "añadir a pantalla de inicio" en iOS, que no admite SVG.
 *
 * Acá el corazón va macizo y no calado: sobre la pantalla del teléfono el
 * ícono se recorta con esquinas redondeadas y un hueco transparente dejaría
 * ver el fondo del usuario, que puede ser cualquier cosa.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#dc2626",
        }}
      >
        <svg width="118" height="118" viewBox="0 0 32 32">
          <path
            fill="#ffffff"
            d="M16 1.5c-6.075 0-11 4.925-11 11 0 7.7 9.35 17.15 10.35 18.14a.92.92 0 0 0 1.3 0C17.65 29.65 27 20.2 27 12.5c0-6.075-4.925-11-11-11Z"
          />
          <path
            fill="#dc2626"
            d="M16 6.9c1.02-1.06 2.2-1.62 3.42-1.62 2.36 0 4.28 1.94 4.28 4.34 0 3.2-2.62 5.9-6.6 9.5l-1.1 1-1.1-1c-3.98-3.6-6.6-6.3-6.6-9.5 0-2.4 1.92-4.34 4.28-4.34 1.22 0 2.4.56 3.42 1.62Z"
          />
        </svg>
      </div>
    ),
    size
  );
}
