import { Suspense } from "react";
import Link from "next/link";
import MapaClient from "@/components/MapaClient";
import Filtros from "@/components/Filtros";
import TarjetaCentro from "@/components/TarjetaCentro";
import { listarCentros, listarCiudades } from "@/lib/consultas";
import { categoria as buscarCategoria } from "@/lib/categorias";

export const dynamic = "force-dynamic";

// Centro geográfico del eje cafetero, que es donde está el grueso del daño.
const CENTRO_POR_DEFECTO: [number, number] = [4.85, -75.7];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ciudad?: string; categoria?: string }>;
}) {
  const { ciudad, categoria } = await searchParams;

  const [ciudades, centros] = await Promise.all([
    listarCiudades(),
    listarCentros({ ciudad, categoria }),
  ]);

  const ciudadSel = ciudades.find((c) => c.slug === ciudad);
  const centroMapa: [number, number] = ciudadSel
    ? [ciudadSel.lat, ciudadSel.lng]
    : CENTRO_POR_DEFECTO;

  const urgentes = centros.filter((c) =>
    c.necesidades.some((n) => n.nivel === "urgente")
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          ¿Dónde hace falta lo que podés donar?
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Centros de acopio activos tras el sismo del 10 de agosto de 2026, con
          lo que cada uno necesita <em>hoy</em>. Elegí qué querés donar y el
          mapa te muestra quién lo está pidiendo.
        </p>
      </section>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
        <Suspense fallback={<div className="h-20" />}>
          <Filtros ciudades={ciudades} />
        </Suspense>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
          <span>
            <strong className="text-slate-900">{centros.length}</strong> acopios
            {categoria
              ? ` piden ${buscarCategoria(categoria)?.label?.toLowerCase() ?? categoria}`
              : " activos"}
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-full bg-red-600" />
            {urgentes} con algo urgente
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-full bg-amber-500" />
            necesita
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-full bg-cyan-600" />
            abastecido / le sobra
          </span>
        </div>
      </section>

      <section className="mb-6">
        <MapaClient
          centros={centros}
          centro={centroMapa}
          zoom={ciudadSel ? 13 : 8}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Listado {ciudadSel ? `en ${ciudadSel.nombre}` : ""}
        </h2>

        {centros.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-slate-600">
              Todavía no hay acopios registrados con ese filtro.
            </p>
            <Link
              href="/registrar"
              className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Registrar el primero
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {centros.map((c) => (
              <TarjetaCentro key={c.id} centro={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
