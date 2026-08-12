import Link from "next/link";
import { categoria as buscarCategoria } from "@/lib/categorias";
import { tipoLugar, type ModoId } from "@/lib/tipos-lugar";
import { frescura, estaAbierto } from "@/lib/frescura";
import type { CentroPublico } from "@/lib/tipos";

/** Cuántas necesidades se muestran antes de resumir el resto en "+N". */
const MAX_NECESIDADES = 3;

export default function TarjetaCentro({
  centro,
  modo = "donar",
  distanciaM,
}: {
  centro: CentroPublico;
  modo?: ModoId;
  distanciaM?: number;
}) {
  const tipo = tipoLugar(centro.tipo);
  const urgentes = centro.necesidades.filter((n) => n.nivel === "urgente");
  const necesita = centro.necesidades.filter((n) => n.nivel === "necesita");
  const sobra = centro.necesidades.filter((n) => n.nivel === "sobra");

  // Del rediseño, nota 04: trece emojis seguidos se leen como ruido y hacen
  // que todas las tarjetas parezcan iguales. Se muestran las urgentes primero
  // y el resto se resume en "+N".
  const pedidas = [...urgentes, ...necesita];
  const visibles = pedidas.slice(0, MAX_NECESIDADES);
  const restantes = pedidas.length - visibles.length;

  const abierto = estaAbierto(centro.horario);
  const fresco = frescura(centro.actualizado_en);

  // Nota 05: la distancia y el estado son lo que decide si alguien se mueve.
  const distancia =
    distanciaM === undefined
      ? null
      : distanciaM < 1000
        ? `${Math.round(distanciaM / 10) * 10} m`
        : `${(distanciaM / 1000).toFixed(1).replace(".", ",")} km`;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[var(--color-borde)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-md px-2 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: tipo?.color ?? "#3c434f" }}
            >
              {tipo?.emoji} {tipo?.corto ?? centro.tipo}
            </span>
            {urgentes.length > 0 && (
              <span className="rounded-md bg-[var(--color-urgente-fondo)] px-2 py-1 text-xs font-extrabold tracking-wide text-[var(--color-urgente-texto)]">
                URGENTE
              </span>
            )}
          </div>

          <h3 className="text-[19px] font-bold leading-tight tracking-tight">
            <Link href={`/acopio/${centro.id}`} className="hover:underline">
              {centro.nombre}
            </Link>
          </h3>

          <p className="text-[13.5px] text-[var(--color-apagado)]">
            {centro.direccion}
            {centro.atiende ? ` · Atiende a ${centro.atiende}` : ""}
          </p>
        </div>

        <div className="max-w-[38%] shrink-0 text-right">
          {distancia && (
            <div className="text-[17px] font-extrabold tracking-tight">
              {distancia}
            </div>
          )}
          <div
            className={`text-xs font-semibold leading-tight ${
              abierto === false
                ? "text-[var(--color-urgente-texto)]"
                : "text-[var(--color-abierto)]"
            }`}
          >
            {abierto === true
              ? "Abierto ahora"
              : abierto === false
                ? "Cerrado ahora"
                : (centro.horario ?? "Sin horario")}
          </div>
        </div>
      </div>

      {centro.es_demo && (
        <p className="rounded-md bg-[var(--color-hueso)] px-2 py-1 text-xs text-[var(--color-tenue)]">
          Dato de prueba — este lugar no existe.
        </p>
      )}

      {centro.tipo === "albergue" && (
        <p
          className={`rounded-lg px-3 py-2 text-[13px] font-semibold ${
            centro.acepta_mascotas === true
              ? "bg-[var(--color-abierto-fondo)] text-[var(--color-abierto)]"
              : centro.acepta_mascotas === false
                ? "bg-[var(--color-hueso)] text-[var(--color-tenue)]"
                : "bg-[var(--color-urgente-fondo)] text-[var(--color-urgente-texto)]"
          }`}
        >
          {centro.acepta_mascotas === true
            ? "🐾 Acepta mascotas"
            : centro.acepta_mascotas === false
              ? "🚫 No recibe mascotas"
              : "🐾 Mascotas: pregunta al llamar"}
        </p>
      )}

      {centro.tipo === "sangre" && centro.tipos_sangre && (
        <p className="rounded-lg bg-[var(--color-urgente-fondo)] px-3 py-2 text-[13px] font-semibold text-[var(--color-urgente-texto)]">
          🩸 Piden: {centro.tipos_sangre}
        </p>
      )}

      {modo === "donar" && visibles.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[11.5px] font-extrabold uppercase tracking-wider text-[var(--color-etiqueta)]">
            Piden
          </span>
          {visibles.map((n) => {
            const cat = buscarCategoria(n.categoria);
            const esUrgente = n.nivel === "urgente";
            return (
              <span
                key={n.categoria}
                title={n.detalle ?? undefined}
                className={`rounded-lg border px-2.5 py-1 text-[13px] font-semibold ${
                  esUrgente
                    ? "border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)] text-[var(--color-urgente-texto)]"
                    : "border-[var(--color-borde)] bg-[#f2f4ee] text-[var(--color-tinta-suave)]"
                }`}
              >
                {cat?.emoji} {cat?.label ?? n.categoria}
              </span>
            );
          })}
          {restantes > 0 && (
            <Link
              href={`/acopio/${centro.id}`}
              className="rounded-lg border border-[var(--color-borde)] bg-white px-2.5 py-1 text-[13px] font-semibold text-[var(--color-apagado)] hover:bg-[var(--color-hueso)]"
            >
              +{restantes}
            </Link>
          )}
        </div>
      )}

      {/* Lo que sobra va en gris y en texto plano, no como chip: es información
          útil pero no es una llamada a la acción, y compitiendo en el mismo
          formato diluía lo que sí hace falta. */}
      {modo === "donar" && sobra.length > 0 && (
        <p className="text-[13px] text-[var(--color-etiqueta)]">
          Ya no reciben:{" "}
          {sobra
            .map((n) => buscarCategoria(n.categoria)?.label ?? n.categoria)
            .join(", ")}
        </p>
      )}

      <div className="flex items-center gap-2">
        {centro.telefono && (
          <a
            href={`tel:${centro.telefono.replace(/\s/g, "")}`}
            className="rounded-lg bg-[var(--color-marino)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--color-marino-oscuro)]"
          >
            Llamar
          </a>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${centro.lat},${centro.lng}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border-[1.5px] border-[var(--color-borde-fuerte)] bg-white px-4 py-2.5 text-sm font-bold transition hover:bg-[var(--color-hueso)]"
        >
          Cómo llegar
        </a>
      </div>

      {/* Nota 06: la frescura vale más que el sello. "Verificado" dice que
          alguien llamó alguna vez; "hace 20 min" dice si el dato sirve hoy. */}
      <div className="flex items-center gap-2 border-t border-[var(--color-borde-suave)] pt-2.5 text-xs text-[var(--color-tenue)]">
        <span
          className={`font-bold ${
            centro.estado === "verificado"
              ? "text-[var(--color-abierto)]"
              : "text-[var(--color-etiqueta)]"
          }`}
        >
          {centro.estado === "verificado" ? "✓ Verificado" : "Sin verificar"}
        </span>
        <span aria-hidden>·</span>
        <span className={fresco.clase}>Confirmado {fresco.texto}</span>
      </div>
    </article>
  );
}
