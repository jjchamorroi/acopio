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
  // De cuándo es el dato, no cuándo se tocó la fila: el importador movía
  // `actualizado_en` en cada corrida y la ficha decía "confirmado hace 2
  // horas" justo al lado de "según La Patria, 11 ago".
  const fresco = frescura(centro.dato_de);

  // Nota 05: la distancia y el estado son lo que decide si alguien se mueve.
  const distancia =
    distanciaM === undefined
      ? null
      : distanciaM < 1000
        ? `${Math.round(distanciaM / 10) * 10} m`
        : `${(distanciaM / 1000).toFixed(1).replace(".", ",")} km`;

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border p-4 ${
        // Una ficha de ausencia no puede parecerse a un lugar al que ir.
        centro.es_alerta
          ? "border-[1.5px] border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)]"
          : "border-[var(--color-borde)] bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-md px-2 py-1 text-xs font-bold text-white"
              style={{
                backgroundColor: centro.es_alerta
                  ? "var(--color-urgente-texto)"
                  : (tipo?.color ?? "#3c434f"),
              }}
            >
              {centro.es_alerta
                ? "⚠️ AQUÍ NO HAY"
                : `${tipo?.emoji} ${tipo?.corto ?? centro.tipo}`}
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

          {!centro.es_alerta && (
            <p className="text-[13.5px] text-[var(--color-apagado)]">
              {centro.direccion}
              {centro.atiende ? ` · Atiende a ${centro.atiende}` : ""}
            </p>
          )}

          {/* Muchas alcaldías anunciaron albergues sin publicar la dirección
              exacta. El punto es el del municipio, y quien va a salir de la
              casa tiene que saberlo antes, no al llegar. */}
          {centro.ubicacion_aproximada && !centro.es_alerta && (
            <p className="text-[12.5px] font-semibold text-[var(--color-etiqueta)]">
              📍 Ubicación aproximada — confirma la dirección antes de ir
            </p>
          )}
        </div>

        {/* Un horario o una distancia en una ficha de ausencia sugerirían que
            hay algo abierto a donde llegar. */}
        {!centro.es_alerta && (
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
        )}
      </div>

      {centro.es_demo && (
        <p className="rounded-md bg-[var(--color-hueso)] px-2 py-1 text-xs text-[var(--color-tenue)]">
          Dato de prueba — este lugar no existe.
        </p>
      )}

      {/* Por encima de todo lo demás: "la Alcaldía pidió NO llevar alimentos
          por ahora" cambia por completo si vale la pena ir, y enterrarlo entre
          las notas equivale a no publicarlo. */}
      {centro.alerta && (
        <p className="rounded-lg border border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)] px-3 py-2 text-[13px] font-semibold text-[#8f2418]">
          ⚠️ {centro.alerta}
        </p>
      )}

      {centro.tipo === "albergue" && !centro.es_alerta && (
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

      {/* Las tres preguntas que hay que hacer ANTES de trasladarse con una
          familia a cuestas: ¿hay cupo?, ¿exigen censo previo?, ¿qué ofrecen?
          Casi ninguna alcaldía las publica, y justo por eso valen cuando sí. */}
      {(centro.ocupacion || centro.capacidad || centro.requisitos_ingreso) && (
        <dl className="flex flex-col gap-1 rounded-lg bg-[var(--color-hueso)] px-3 py-2 text-[12.5px]">
          {(centro.ocupacion || centro.capacidad) && (
            <div>
              <dt className="inline font-bold">Ocupación: </dt>
              <dd className="inline text-[var(--color-apagado)]">
                {centro.ocupacion ?? centro.capacidad}
              </dd>
            </div>
          )}
          {centro.requisitos_ingreso && (
            <div>
              <dt className="inline font-bold">Para entrar: </dt>
              <dd className="inline text-[var(--color-apagado)]">
                {centro.requisitos_ingreso}
              </dd>
            </div>
          )}
        </dl>
      )}

      {centro.servicios && (
        <p className="text-[12.5px] text-[var(--color-apagado)]">
          <span className="font-bold text-[var(--color-tinta)]">Ofrece:</span>{" "}
          {centro.servicios}
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

      {/* Distinto de "ya no reciben": eso es una categoría que se llenó, esto
          es lo que el lugar nunca acepta. Casi todos rechazan medicamentos,
          perecederos y ropa usada, y quien llega con eso se devuelve cargado. */}
      {modo === "donar" && centro.no_recibe && (
        <p className="text-[13px] text-[var(--color-etiqueta)]">
          No reciben: {centro.no_recibe}
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
        {/* Sin "cómo llegar" en una ficha de ausencia: es lo único que de
            verdad no se puede ofrecer, porque no hay a dónde llegar. */}
        {!centro.es_alerta && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${centro.lat},${centro.lng}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border-[1.5px] border-[var(--color-borde-fuerte)] bg-white px-4 py-2.5 text-sm font-bold transition hover:bg-[var(--color-hueso)]"
          >
            {/* Con ubicación aproximada, "Cómo llegar" mentiría: la ruta lleva
                al centro del municipio, no a la puerta. */}
            {centro.ubicacion_aproximada ? "Ver la zona" : "Cómo llegar"}
          </a>
        )}
      </div>

      {/* Nota 06: la frescura vale más que el sello. "Verificado" dice que
          alguien llamó alguna vez; "hace 20 min" dice si el dato sirve hoy. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--color-borde-suave)] pt-2.5 text-xs text-[var(--color-tenue)]">
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
        <span className={fresco.clase}>Dato de {fresco.texto}</span>

        {/* Decir de dónde salió el dato es lo que separa "no lo hemos
            comprobado" de "nos lo inventamos". Quien duda va y comprueba. */}
        {centro.fuente_nombre && (
          <>
            <span aria-hidden>·</span>
            {centro.fuente_url ? (
              <a
                href={centro.fuente_url}
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-dotted hover:text-[var(--color-tinta)]"
              >
                según {centro.fuente_nombre} ↗
              </a>
            ) : (
              <span>según {centro.fuente_nombre}</span>
            )}
          </>
        )}
      </div>
    </article>
  );
}
