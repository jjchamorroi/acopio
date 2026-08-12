import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import MapaClient from "@/components/MapaClient";
import BotonCompartir from "@/components/BotonCompartir";
import AccionesRapidas from "@/components/AccionesRapidas";
import Filtros from "@/components/Filtros";
import TarjetaCentro from "@/components/TarjetaCentro";
import { listarCentros, listarCiudadesConLugares } from "@/lib/consultas";
import { categoria as buscarCategoria } from "@/lib/categorias";
import { MODOS, TIPOS_LUGAR, esModo, type ModoId } from "@/lib/tipos-lugar";

export const dynamic = "force-dynamic";

// Centro geográfico del eje cafetero, que es donde está el grueso del daño.
const CENTRO_POR_DEFECTO: [number, number] = [4.85, -75.7];

/**
 * La descripción lleva cifras reales, no una frase fija. Cuando alguien pega
 * el enlace en un grupo de WhatsApp, lo que decide si los demás lo abren es
 * ver que hay algo vivo del otro lado.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const centros = await listarCentros({});
    const urgentes = centros.filter((c) =>
      c.necesidades.some((n) => n.nivel === "urgente")
    ).length;
    const albergues = centros.filter((c) => c.tipo === "albergue").length;

    const partes = [`${centros.length} lugares activos`];
    if (urgentes > 0) partes.push(`${urgentes} con algo urgente`);
    if (albergues > 0) partes.push(`${albergues} albergues`);

    const descripcion = `${partes.join(" · ")}. Mirá qué necesita cada uno antes de salir de la casa.`;
    return {
      description: descripcion,
      openGraph: { description: descripcion },
      // `card` se repite a propósito: al declarar `twitter` acá, Next reemplaza
      // el objeto del layout en vez de fusionarlo, y sin esto la tarjeta se
      // degrada a imagen pequeña.
      twitter: { card: "summary_large_image", description: descripcion },
    };
  } catch {
    return {};
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    ciudad?: string;
    categoria?: string;
    modo?: string;
    tipo?: string;
    mascotas?: string;
  }>;
}) {
  const p = await searchParams;
  const modo: ModoId = esModo(p.modo) ? p.modo : "donar";

  const [ciudades, centros] = await Promise.all([
    listarCiudadesConLugares(),
    listarCentros({
      ciudad: p.ciudad,
      categoria: modo === "donar" ? p.categoria : undefined,
      modo,
      tipo: p.tipo,
      soloAceptaMascotas: modo === "ayuda" && p.mascotas === "1",
    }),
  ]);

  const ciudadSel = ciudades.find((c) => c.slug === p.ciudad);
  const centroMapa: [number, number] = ciudadSel
    ? [ciudadSel.lat, ciudadSel.lng]
    : CENTRO_POR_DEFECTO;

  const urgentes = centros.filter((c) =>
    c.necesidades.some((n) => n.nivel === "urgente")
  ).length;
  const conMascotas = centros.filter((c) => c.acepta_mascotas === true).length;
  const copia = MODOS[modo];

  // Solo los tipos que aparecen en los resultados, para no mostrar una leyenda
  // llena de colores que no están en el mapa.
  const tiposPresentes = TIPOS_LUGAR.filter((t) =>
    centros.some((c) => c.tipo === t.id)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {copia.titulo}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">{copia.bajada}</p>
        <div className="mt-5">
          <AccionesRapidas />
        </div>

        <BotonCompartir
          className="mt-4"
          texto={
            urgentes > 0
              ? `Mapa de acopios y albergues por el sismo: ${centros.length} lugares, ${urgentes} necesitan algo urgente. Mirá qué falta antes de salir de la casa:`
              : "Mapa de acopios y albergues por el sismo. Mirá qué necesita cada uno antes de salir de la casa:"
          }
        />
      </section>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
        <Suspense fallback={<div className="h-32" />}>
          <Filtros ciudades={ciudades} modo={modo} />
        </Suspense>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <span>
            <strong className="text-slate-900">{centros.length}</strong>{" "}
            {centros.length === 1 ? "lugar" : "lugares"}
            {modo === "donar" && p.categoria
              ? ` piden ${buscarCategoria(p.categoria)?.label?.toLowerCase() ?? p.categoria}`
              : ""}
          </span>

          {modo === "donar" && urgentes > 0 && (
            <span className="text-red-700">
              <strong>{urgentes}</strong> con algo urgente
            </span>
          )}

          {modo === "ayuda" && conMascotas > 0 && (
            <span>
              <span aria-hidden>🐾</span> <strong>{conMascotas}</strong> aceptan
              mascotas
            </span>
          )}

          {tiposPresentes.map((t) => (
            <span key={t.id} className="flex items-center gap-1.5">
              <i
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              {t.corto}
            </span>
          ))}
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
            <p className="text-slate-600">{copia.vacio}</p>
            <Link
              href="/registrar"
              className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Registrar un lugar
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {centros.map((c) => (
              <TarjetaCentro key={c.id} centro={c} modo={modo} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
