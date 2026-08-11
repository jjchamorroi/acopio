import Link from "next/link";
import MapaDonacionesClient from "@/components/MapaDonacionesClient";
import { listarCiudadesConLugares, listarDonaciones } from "@/lib/consultas";
import { categoria as buscarCategoria } from "@/lib/categorias";
import { RADIO_DIFUSO_M } from "@/lib/constantes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Donaciones ofrecidas · Red de Acopio",
  description:
    "Qué tiene la gente para donar y en qué zona está, para que los acopios y voluntarios puedan recogerlo.",
};

const CENTRO_POR_DEFECTO: [number, number] = [4.85, -75.7];

export default async function Donaciones({
  searchParams,
}: {
  searchParams: Promise<{ ciudad?: string; categoria?: string }>;
}) {
  const { ciudad, categoria } = await searchParams;

  const [ciudades, donaciones] = await Promise.all([
    listarCiudadesConLugares(),
    listarDonaciones({ ciudad, categoria }),
  ]);

  const ciudadSel = ciudades.find((c) => c.slug === ciudad);
  const centroMapa: [number, number] = ciudadSel
    ? [ciudadSel.lat, ciudadSel.lng]
    : CENTRO_POR_DEFECTO;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Lo que la gente tiene para donar
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Para acopios y voluntarios: acá está lo que hay disponible y en qué
            zona. Cada círculo cubre unos {RADIO_DIFUSO_M} metros — la dirección
            exacta se coordina por teléfono.
          </p>
        </div>
        <Link
          href="/donar"
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Ofrecer una donación
        </Link>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        <strong className="text-slate-900">{donaciones.length}</strong>{" "}
        {donaciones.length === 1 ? "donación disponible" : "donaciones disponibles"}
        {ciudadSel ? ` en ${ciudadSel.nombre}` : ""}
      </p>

      <section className="my-5">
        <MapaDonacionesClient
          donaciones={donaciones}
          centro={centroMapa}
          zoom={ciudadSel ? 13 : 8}
        />
      </section>

      {donaciones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">
            Todavía nadie ha ofrecido donaciones acá.
          </p>
          <Link
            href="/donar"
            className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Ser el primero
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {donaciones.map((d) => {
            const cat = buscarCategoria(d.categoria);
            return (
              <article
                key={d.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-inset ring-teal-200">
                  <span aria-hidden>{cat?.emoji}</span>{" "}
                  {cat?.label ?? d.categoria}
                </span>
                <h2 className="mt-1.5 font-semibold text-slate-900">
                  {d.descripcion}
                </h2>
                {d.cantidad && (
                  <p className="text-sm text-slate-600">Cantidad: {d.cantidad}</p>
                )}
                <p className="text-xs text-slate-500">
                  Zona aproximada en {d.ciudad_nombre}, {d.departamento}
                </p>
                {d.notas && (
                  <p className="mt-2 text-sm text-slate-700">{d.notas}</p>
                )}
                {d.es_demo && (
                  <p className="mt-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    Dato de prueba.
                  </p>
                )}
                <div className="mt-3 text-sm">
                  <a
                    href={`tel:${d.telefono.replace(/\s/g, "")}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    Llamar {d.contacto ? `a ${d.contacto}` : ""} {d.telefono}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
