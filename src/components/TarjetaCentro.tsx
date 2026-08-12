import Link from "next/link";
import { categoria as buscarCategoria, NIVELES } from "@/lib/categorias";
import { tipoLugar, type ModoId } from "@/lib/tipos-lugar";
import type { CentroPublico } from "@/lib/tipos";

function Etiqueta({
  nivel,
  categoriaId,
  detalle,
}: {
  nivel: keyof typeof NIVELES;
  categoriaId: string;
  detalle: string | null;
}) {
  const cat = buscarCategoria(categoriaId);
  const clases = {
    urgente: "bg-red-50 text-red-800 ring-red-200",
    necesita: "bg-amber-50 text-amber-800 ring-amber-200",
    sobra: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  }[nivel];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset ${clases}`}
      title={detalle ?? undefined}
    >
      <span aria-hidden>{cat?.emoji}</span>
      {cat?.label ?? categoriaId}
    </span>
  );
}

/**
 * El dato de mascotas se muestra en los tres estados. "No informado" no es lo
 * mismo que "no aceptan": quien viaja con un animal necesita saber que tiene
 * que llamar a preguntar, no descartar el lugar.
 */
function Mascotas({ acepta }: { acepta: boolean | null }) {
  if (acepta === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
        <span aria-hidden>🐾</span> Acepta mascotas
      </span>
    );
  }
  if (acepta === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
        <span aria-hidden>🚫</span> No recibe mascotas
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
      <span aria-hidden>🐾</span> Mascotas: preguntá al llamar
    </span>
  );
}

export default function TarjetaCentro({
  centro,
  modo = "donar",
  distanciaM,
}: {
  centro: CentroPublico;
  modo?: ModoId;
  /** Presente solo cuando la lista viene ordenada por cercanía. */
  distanciaM?: number;
}) {
  // Bajo un kilómetro se dice en metros: "a 400 m" se entiende como caminable,
  // "a 0,4 km" obliga a hacer la cuenta.
  const distancia =
    distanciaM === undefined
      ? null
      : distanciaM < 1000
        ? `a ${Math.round(distanciaM / 10) * 10} m`
        : `a ${(distanciaM / 1000).toFixed(1)} km`;
  const tipo = tipoLugar(centro.tipo);
  const urgentes = centro.necesidades.filter((n) => n.nivel === "urgente");
  const necesita = centro.necesidades.filter((n) => n.nivel === "necesita");
  const sobra = centro.necesidades.filter((n) => n.nivel === "sobra");
  const esAlojamiento = centro.tipo === "albergue";

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span
            className="mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: tipo?.color ?? "#475569" }}
          >
            <span aria-hidden>{tipo?.emoji}</span> {tipo?.corto ?? centro.tipo}
          </span>
          <h3 className="font-semibold text-slate-900">
            <Link href={`/acopio/${centro.id}`} className="hover:underline">
              {centro.nombre}
            </Link>
          </h3>
          <p className="text-sm text-slate-600">{centro.direccion}</p>
          <p className="text-xs text-slate-500">
            {centro.ciudad_nombre}, {centro.departamento}
            {centro.horario ? ` · ${centro.horario}` : ""}
          </p>
          {centro.atiende && (
            <p className="mt-1 text-sm font-medium text-slate-700">
              Atiende a {centro.atiende}
            </p>
          )}
        </div>

        {distancia && (
          <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
            {distancia}
          </span>
        )}

        {centro.estado === "verificado" ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
            ✓ Verificado
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
            Sin verificar
          </span>
        )}
      </div>

      {centro.es_demo && (
        <p className="mt-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
          Dato de prueba — este lugar no existe.
        </p>
      )}

      {centro.tipo === "sangre" && centro.tipos_sangre && (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900 ring-1 ring-inset ring-rose-200">
          <span aria-hidden>🩸</span> Piden: {centro.tipos_sangre}
        </p>
      )}

      {/* En los albergues, lo de mascotas va primero: es lo que decide si
          alguien evacúa o se queda en una casa que se puede caer. */}
      {esAlojamiento && (
        <div className="mt-3">
          <Mascotas acepta={centro.acepta_mascotas} />
        </div>
      )}

      {modo === "donar" && (urgentes.length > 0 || necesita.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {urgentes.map((n) => (
            <Etiqueta
              key={n.categoria}
              nivel="urgente"
              categoriaId={n.categoria}
              detalle={n.detalle}
            />
          ))}
          {necesita.map((n) => (
            <Etiqueta
              key={n.categoria}
              nivel="necesita"
              categoriaId={n.categoria}
              detalle={n.detalle}
            />
          ))}
        </div>
      )}

      {modo === "donar" && sobra.length > 0 && (
        <p className="mt-2 text-xs text-cyan-800">
          Le sobra:{" "}
          {sobra
            .map((n) => buscarCategoria(n.categoria)?.label ?? n.categoria)
            .join(", ")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {centro.telefono && (
          <a
            href={`tel:${centro.telefono.replace(/\s/g, "")}`}
            className="font-medium text-blue-700 hover:underline"
          >
            Llamar {centro.telefono}
          </a>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${centro.lat},${centro.lng}`}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-blue-700 hover:underline"
        >
          Cómo llegar
        </a>
      </div>
    </article>
  );
}
