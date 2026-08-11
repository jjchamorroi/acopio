import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Red de Acopio · Sismo Colombia 2026",
  description:
    "Mapa colaborativo de centros de acopio y de lo que cada uno necesita, tras el sismo del 10 de agosto de 2026.",
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
            <nav className="ml-auto flex items-center gap-2 text-sm">
              <Link
                href="/"
                className="rounded px-3 py-1.5 hover:bg-white/10 transition"
              >
                Mapa
              </Link>
              <Link
                href="/registrar"
                className="rounded bg-white px-3 py-1.5 font-medium text-slate-900 hover:bg-slate-200 transition"
              >
                Registrar acopio
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
