import Link from "next/link";
import { notFound } from "next/navigation";
import MapaClient from "@/components/MapaClient";
import { obtenerCentro } from "@/lib/consultas";
import { categoria as buscarCategoria, NIVELES } from "@/lib/categorias";
import { tipoLugar } from "@/lib/tipos-lugar";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DetalleAcopio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const centro = await obtenerCentro(id);
  if (!centro || centro.estado === "cerrado") notFound();

  const porNivel = (nivel: keyof typeof NIVELES) =>
    centro.necesidades.filter((n) => n.nivel === nivel);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/" className="text-sm text-blue-700 hover:underline">
        ← Volver al mapa
      </Link>

      <header className="mt-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span
              className="mb-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{
                backgroundColor: tipoLugar(centro.tipo)?.color ?? "#475569",
              }}
            >
              <span aria-hidden>{tipoLugar(centro.tipo)?.emoji}</span>{" "}
              {tipoLugar(centro.tipo)?.label ?? centro.tipo}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {centro.nombre}
            </h1>
          </div>
          {centro.estado === "verificado" ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
              ✓ Verificado
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
              Sin verificar
            </span>
          )}
        </div>
        <p className="mt-1 text-slate-600">{centro.direccion}</p>
        <p className="text-sm text-slate-500">
          {centro.ciudad_nombre}, {centro.departamento}
          {centro.horario ? ` · ${centro.horario}` : ""}
        </p>
      </header>

      {centro.tipo === "albergue" && (
        <p
          className={`mt-4 rounded-md border px-4 py-3 text-sm ${
            centro.acepta_mascotas === true
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : centro.acepta_mascotas === false
                ? "border-slate-300 bg-slate-100 text-slate-700"
                : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          {centro.acepta_mascotas === true
            ? "🐾 Este albergue recibe personas con mascotas."
            : centro.acepta_mascotas === false
              ? "🚫 Este albergue no puede recibir mascotas."
              : "🐾 No informaron si reciben mascotas. Preguntá al llamar antes de ir con tu animal."}
        </p>
      )}

      {centro.estado === "pendiente" && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Este acopio lo reportó alguien de la comunidad y todavía no ha sido
          confirmado. <strong>Llamá antes de ir.</strong>
        </p>
      )}

      {centro.es_demo && (
        <p className="mt-4 rounded-md border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Dato de prueba. Este acopio no existe; sirve solo para ver cómo se
          vería la aplicación con información real.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {centro.telefono && (
          <a
            href={`tel:${centro.telefono.replace(/\s/g, "")}`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Llamar {centro.telefono}
          </a>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${centro.lat},${centro.lng}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Cómo llegar
        </a>
      </div>

      <section className="mt-6 space-y-4">
        {(["urgente", "necesita", "sobra"] as const).map((nivel) => {
          const items = porNivel(nivel);
          if (items.length === 0) return null;
          return (
            <div
              key={nivel}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <h2 className="text-sm font-semibold text-slate-900">
                {NIVELES[nivel].label}
                <span className="ml-2 font-normal text-slate-500">
                  {NIVELES[nivel].ayuda}
                </span>
              </h2>
              <ul className="mt-2 space-y-1.5">
                {items.map((n) => {
                  const cat = buscarCategoria(n.categoria);
                  return (
                    <li key={n.categoria} className="text-sm text-slate-800">
                      <span aria-hidden>{cat?.emoji}</span>{" "}
                      <strong>{cat?.label ?? n.categoria}</strong>
                      {n.detalle && (
                        <span className="text-slate-600"> — {n.detalle}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {centro.necesidades.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Este acopio todavía no ha publicado qué necesita.
          </p>
        )}
      </section>

      {centro.notas && (
        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Notas del acopio
          </h2>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
            {centro.notas}
          </p>
        </section>
      )}

      <section className="mt-6">
        <MapaClient centros={[centro]} centro={[centro.lat, centro.lng]} zoom={16} />
      </section>

      <p className="mt-4 text-xs text-slate-500">
        Última actualización:{" "}
        {new Date(centro.actualizado_en).toLocaleString("es-CO", {
          timeZone: "America/Bogota",
        })}
      </p>
    </div>
  );
}
