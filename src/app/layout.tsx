import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import Link from "next/link";
import { urlBase } from "@/lib/url";
import { ultimaActualizacion } from "@/lib/consultas";
import { haceCuanto } from "@/lib/frescura";
import "./globals.css";

/**
 * Public Sans, del rediseño. Servida por Next desde nuestro propio dominio en
 * vez de pedirla a Google: una fuente que tarda deja el texto invisible unos
 * segundos, y con datos móviles en zona afectada esos segundos importan.
 */
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const DESCRIPCION =
  "Mapa colaborativo de acopios, albergues, comedores y puntos de atención tras el sismo del 10 de agosto de 2026, con lo que cada uno necesita hoy.";

export const metadata: Metadata = {
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
  themeColor: "#10151c",
};

const ENLACES = [
  { href: "/", texto: "Mapa de lugares" },
  { href: "/donar", texto: "Tengo algo para donar" },
  { href: "/?modo=voluntarios", texto: "Voluntarios" },
  { href: "/profesionales", texto: "Ayuda profesional" },
  { href: "/donaciones", texto: "Donaciones ofrecidas" },
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ultima = await ultimaActualizacion().catch(() => null);

  return (
    <html lang="es-CO" className={publicSans.className}>
      <body className="flex min-h-dvh flex-col bg-[var(--color-lienzo)]">
        <header className="sticky top-0 z-30 bg-[var(--color-tinta)] text-white">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:h-16 sm:py-0">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-lg bg-[var(--color-acento)] text-[15px] font-extrabold text-[var(--color-tinta)]"
              >
                R
              </span>
              <span className="text-[17px] font-bold tracking-tight">
                Red de Acopio
              </span>
            </Link>

            <nav className="ml-6 hidden items-center gap-6 text-sm font-semibold text-[#c8cdd6] lg:flex">
              {ENLACES.slice(1).map((e) => (
                <Link key={e.href} href={e.href} className="hover:text-white">
                  {e.texto}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-3">
              {/* Señal de vida. Un tablero de emergencia sin fecha visible se
                  lee como una página abandonada. */}
              {ultima && (
                <span className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d7f2e0] sm:flex">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-[#3ddc84]"
                  />
                  Actualizado {haceCuanto(ultima)}
                </span>
              )}

              <Link
                href="/registrar"
                className="hidden rounded-lg bg-[var(--color-acento)] px-4 py-2.5 text-sm font-bold text-[var(--color-tinta)] transition hover:brightness-95 sm:block"
              >
                Registrar un lugar
              </Link>

              <details className="group relative lg:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold marker:content-none">
                  Menú
                  <svg
                    viewBox="0 0 20 20"
                    className="size-4 fill-current transition group-open:rotate-180"
                    aria-hidden
                  >
                    <path d="M5.5 7.5 10 12l4.5-4.5z" />
                  </svg>
                </summary>
                <nav className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl bg-white text-[var(--color-tinta)] shadow-xl ring-1 ring-black/10">
                  {ENLACES.map((e, i) => (
                    <Link
                      key={e.href}
                      href={e.href}
                      className={`block px-4 py-3 text-sm font-medium hover:bg-[var(--color-hueso)] ${
                        i > 0 ? "border-t border-[var(--color-borde-suave)]" : ""
                      }`}
                    >
                      {e.texto}
                    </Link>
                  ))}
                  <Link
                    href="/registrar"
                    className="block border-t border-[var(--color-borde-suave)] bg-[var(--color-hueso)] px-4 py-3 text-sm font-bold"
                  >
                    Registrar un lugar
                  </Link>
                </nav>
              </details>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        {/*
          Del rediseño, nota 07: dos párrafos legales antes del pie asustan.
          Una línea con lo que salva vidas —el 123— y el resto en /aviso.
        */}
        <footer className="mt-12 bg-[var(--color-tinta)] text-[#c8cdd6]">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[12.5px] leading-relaxed">
            <p className="text-[13px] font-bold text-white">
              En emergencia, llama al 123.
            </p>
            <p>
              Iniciativa ciudadana. La información la aportan las personas que
              usan el sitio y puede estar desactualizada: llama antes de
              desplazarte.{" "}
              <Link
                href="/aviso"
                className="font-semibold text-[var(--color-acento)] hover:underline"
              >
                Aviso legal
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
