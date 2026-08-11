import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { urlBase } from "@/lib/url";
import "./globals.css";

const DESCRIPCION =
  "Mapa colaborativo de acopios, albergues y puntos de atención animal tras el sismo del 10 de agosto de 2026, con lo que cada uno necesita hoy.";

export const metadata: Metadata = {
  // Sin metadataBase, Next genera rutas relativas para la imagen de
  // previsualización y WhatsApp muestra la tarjeta sin foto.
  metadataBase: urlBase(),
  title: {
    default: "Red de Acopio · Sismo Colombia 2026",
    template: "%s · Red de Acopio",
  },
  description: DESCRIPCION,
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Red de Acopio",
    title: "Red de Acopio · Sismo Colombia 2026",
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Red de Acopio · Sismo Colombia 2026",
    description: DESCRIPCION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CO">
      <body className="min-h-dvh flex flex-col">
        <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Red de Acopio
            </Link>
            <nav className="ml-auto flex items-center gap-1 text-sm sm:gap-2">
              <Link
                href="/"
                className="rounded px-2 py-1.5 transition hover:bg-white/10 sm:px-3"
              >
                Mapa
              </Link>
              <Link
                href="/donaciones"
                className="hidden rounded px-3 py-1.5 transition hover:bg-white/10 sm:block"
              >
                Donaciones
              </Link>
              <Link
                href="/registrar"
                className="hidden rounded px-3 py-1.5 transition hover:bg-white/10 sm:block"
              >
                Registrar lugar
              </Link>
              <Link
                href="/donar"
                className="rounded bg-white px-3 py-1.5 font-medium text-slate-900 transition hover:bg-slate-200"
              >
                Tengo algo para donar
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-slate-500">
            <p>
              Proyecto ciudadano sin ánimo de lucro. La información la aportan
              las personas que usan el sitio y{" "}
              <strong className="text-slate-700">
                puede estar desactualizada
              </strong>
              : llamá al acopio antes de desplazarte.
            </p>
            <p className="mt-2">
              En emergencia, la línea oficial es el{" "}
              <strong className="text-slate-700">123</strong>. Este sitio no
              reemplaza a los organismos de socorro.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
