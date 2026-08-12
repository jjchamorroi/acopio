import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Apuntarse from "@/components/Apuntarse";
import PanelConvocatoria from "@/components/PanelConvocatoria";
import BotonCompartir from "@/components/BotonCompartir";
import MapaClient from "@/components/MapaClient";
import { formatearFranja } from "@/components/TarjetaConvocatoria";
import { obtenerConvocatoria } from "@/lib/consultas";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return {};
  const c = await obtenerConvocatoria(id);
  if (!c) return {};

  const faltan = c.cupo === null ? null : Math.max(0, c.cupo - c.inscritos);
  const partes = [formatearFranja(c.inicia, c.termina), c.lugar_encuentro];
  if (faltan !== null && faltan > 0) partes.unshift(`Faltan ${faltan} personas`);

  return {
    title: c.titulo,
    description: partes.join(" · "),
    openGraph: { title: c.titulo, description: partes.join(" · ") },
    twitter: {
      card: "summary_large_image",
      title: c.titulo,
      description: partes.join(" · "),
    },
    robots: { index: false, follow: false },
  };
}

export default async function DetalleConvocatoria({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; admin?: string }>;
}) {
  const { id } = await params;
  const { t, admin } = await searchParams;
  const modoAdmin = admin === "1";
  if (!UUID.test(id)) notFound();

  const c = await obtenerConvocatoria(id);
  if (!c) notFound();

  const faltan = c.cupo === null ? null : Math.max(0, c.cupo - c.inscritos);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/voluntarios" className="text-sm text-blue-700 hover:underline">
        ← Todas las convocatorias
      </Link>

      <header className="mt-3">
        <p className="text-sm font-medium text-emerald-700">
          {formatearFranja(c.inicia, c.termina)}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {c.titulo}
        </h1>
        <p className="mt-1 text-slate-600">{c.lugar_encuentro}</p>
        <p className="text-sm text-slate-500">
          {c.ciudad_nombre}, {c.departamento}
          {c.centro_nombre ? ` · ${c.centro_nombre}` : ""}
        </p>
      </header>

      {c.con_riesgo && (
        <p className="mt-4 rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>⚠ Trabajo con riesgo.</strong> Este tipo de labor debe estar
          coordinada por un organismo de socorro. No entres a estructuras
          dañadas por tu cuenta: el voluntariado espontáneo en edificios
          colapsados lesiona gente y estorba a los rescatistas profesionales.
        </p>
      )}

      {c.es_demo && (
        <p className="mt-4 rounded-md border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Dato de prueba. Esta convocatoria no existe.
        </p>
      )}

      <p className="mt-4 whitespace-pre-line text-slate-800">{c.descripcion}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {c.que_llevar && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h2 className="text-sm font-semibold text-blue-900">Qué llevar</h2>
            <p className="mt-1 text-sm text-blue-900">{c.que_llevar}</p>
            <p className="mt-2 text-xs text-blue-800">
              Llegar sin agua ni comida convierte al voluntario en alguien más a
              quien cuidar.
            </p>
          </div>
        )}
        {c.requisitos && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">Requisitos</h2>
            <p className="mt-1 text-sm text-slate-700">{c.requisitos}</p>
          </div>
        )}
      </div>

      <div className="mt-5">
        <Apuntarse inicial={c} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {c.telefono && (
          <a
            href={`tel:${c.telefono.replace(/\s/g, "")}`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Llamar {c.contacto ? `a ${c.contacto}` : ""} {c.telefono}
          </a>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Cómo llegar
        </a>
      </div>

      <BotonCompartir
        className="mt-4"
        texto={
          faltan !== null && faltan > 0
            ? `Faltan ${faltan} personas para "${c.titulo}" en ${c.ciudad_nombre}, ${formatearFranja(c.inicia, c.termina).toLowerCase()}. ¿Te apuntas?`
            : `"${c.titulo}" en ${c.ciudad_nombre}, ${formatearFranja(c.inicia, c.termina).toLowerCase()}.`
        }
      />

      <section className="mt-6">
        {/* La convocatoria va en `convocatorias`, no solo en `centro`: esa prop
            centra la vista, pero el marcador lo dibuja la lista. Sin ella el
            mapa quedaba apuntando al sitio correcto y completamente vacío. */}
        <MapaClient
          centros={[]}
          convocatorias={[c]}
          centro={[c.lat, c.lng]}
          zoom={16}
        />
        <p className="mt-1 text-xs text-slate-500">
          Punto de encuentro. Es una ubicación pública, no la casa de nadie.
        </p>
      </section>

      {(t || modoAdmin) && (
        <div className="mt-6">
          <PanelConvocatoria
            convocatoria={c}
            token={t ?? null}
            modoAdmin={modoAdmin}
          />
        </div>
      )}
    </div>
  );
}
