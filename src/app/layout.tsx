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
            {/* En pantallas anchas van todos los enlaces a la vista. */}
            <nav className="ml-auto hidden items-center gap-2 text-sm sm:flex">
              <Link
                href="/"
                className="rounded px-3 py-1.5 transition hover:bg-white/10"
              >
                Mapa
              </Link>
              <Link
                href="/voluntarios"
                className="rounded px-3 py-1.5 transition hover:bg-white/10"
              >
                Voluntarios
              </Link>
              <Link
                href="/donaciones"
                className="rounded px-3 py-1.5 transition hover:bg-white/10"
              >
                Donaciones
              </Link>
              <Link
                href="/registrar"
                className="rounded px-3 py-1.5 transition hover:bg-white/10"
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

            {/*
              En celular la acción principal va FUERA del menú desplegable.
              Estaba escondida adentro, y quien entraba veía un mapa sin
              ninguna pista de que también podía ofrecer lo que tiene.
            */}
            <Link
              href="/donar"
              className="ml-auto rounded bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200 sm:hidden"
            >
              Donar
            </Link>

            {/*
              El resto en un <details> nativo en vez de un menú con estado de
              React: funciona sin JavaScript, no agrega peso al paquete y el
              navegador ya se encarga del teclado y del lector de pantalla.
            */}
            <details className="group relative sm:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded bg-white/10 px-3 py-2 text-sm font-medium marker:content-none">
                Menú
                <svg
                  viewBox="0 0 20 20"
                  className="size-4 fill-current transition group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path d="M5.5 7.5 10 12l4.5-4.5z" />
                </svg>
              </summary>
              <nav className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-lg bg-white text-slate-900 shadow-lg ring-1 ring-black/10">
                <Link href="/" className="block px-4 py-3 hover:bg-slate-100">
                  Mapa de lugares
                </Link>
                <Link
                  href="/donar"
                  className="block border-t border-slate-100 px-4 py-3 font-medium hover:bg-slate-100"
                >
                  Tengo algo para donar
                </Link>
                <Link
                  href="/voluntarios"
                  className="block border-t border-slate-100 px-4 py-3 hover:bg-slate-100"
                >
                  Se necesitan voluntarios
                </Link>
                <Link
                  href="/donaciones"
                  className="block border-t border-slate-100 px-4 py-3 hover:bg-slate-100"
                >
                  Donaciones ofrecidas
                </Link>
                <Link
                  href="/registrar"
                  className="block border-t border-slate-100 px-4 py-3 hover:bg-slate-100"
                >
                  Registrar un lugar
                </Link>
              </nav>
            </details>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-slate-500">
            <p>
              <strong className="text-slate-700">
                Iniciativa ciudadana, voluntaria y sin ánimo de lucro.
              </strong>{" "}
              No pertenece ni representa a ninguna entidad pública, medio,
              organismo de socorro ni empresa. La información la aportan las
              personas que usan el sitio, se ofrece{" "}
              <strong className="text-slate-700">tal como está</strong> y{" "}
              <strong className="text-slate-700">
                puede estar desactualizada o ser incorrecta
              </strong>
              : llamá antes de desplazarte. Quien decide moverse, entregar o
              recibir algo lo hace bajo su propio criterio y riesgo.
            </p>
            <p className="mt-2">
              En emergencia, la línea oficial es el{" "}
              <strong className="text-slate-700">123</strong>. Este sitio no
              reemplaza a la UNGRD, la Cruz Roja, la Defensa Civil ni a las
              alcaldías: ante cualquier contradicción, hacé caso a ellos.
            </p>
            <p className="mt-3">
              <Link
                href="/aviso"
                className="font-medium text-slate-600 underline hover:text-slate-900"
              >
                Aviso legal y tratamiento de datos
              </Link>
              <span className="mx-2">·</span>
              <span>
                ¿Aparece algo tuyo que no debería? Lo retiramos sin
                explicaciones.
              </span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
