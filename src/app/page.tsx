import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import MapaClient from "@/components/MapaClient";
import BotonCompartir from "@/components/BotonCompartir";
import AccionesRapidas from "@/components/AccionesRapidas";
import UrgentesDestacados from "@/components/UrgentesDestacados";
import Filtros from "@/components/Filtros";
import EnlaceMascotas from "@/components/EnlaceMascotas";
import AvisoRecopilacion from "@/components/AvisoRecopilacion";
import TarjetaCentro from "@/components/TarjetaCentro";
import TarjetaConvocatoria from "@/components/TarjetaConvocatoria";
import {
  listarCentros,
  listarCiudadesConLugares,
  listarConvocatorias,
  centrosCercanos,
} from "@/lib/consultas";
import { estaAbierto } from "@/lib/frescura";
import { MODOS, esModo, type ModoId } from "@/lib/tipos-lugar";

export const dynamic = "force-dynamic";

// Centro geográfico del eje cafetero, que es donde está el grueso del daño.
const CENTRO_POR_DEFECTO: [number, number] = [4.85, -75.7];

export async function generateMetadata(): Promise<Metadata> {
  try {
    const centros = await listarCentros({});
    const urgentes = centros.filter((c) =>
      c.necesidades.some((n) => n.nivel === "urgente")
    ).length;
    // Igual que en la página: sin filtro de modo, o diría "2 albergues"
    // habiendo diecisiete, y eso acabaría en la vista previa de WhatsApp.
    const albergues = (await listarCentros({ tipo: "albergue" })).length;

    const partes = [
      `${centros.length} ${centros.length === 1 ? "lugar activo" : "lugares activos"}`,
    ];
    if (urgentes > 0) partes.push(`${urgentes} con algo urgente`);
    if (albergues > 0) {
      partes.push(`${albergues} ${albergues === 1 ? "albergue" : "albergues"}`);
    }

    const descripcion = `${partes.join(" · ")}. Mira qué necesita cada uno antes de salir de la casa.`;
    return {
      description: descripcion,
      openGraph: { description: descripcion },
      twitter: { card: "summary_large_image", description: descripcion },
    };
  } catch {
    return {};
  }
}

function Cifra({
  valor,
  etiqueta,
  urgente = false,
  href,
}: {
  valor: number;
  etiqueta: string;
  urgente?: boolean;
  /** Si se pasa, la cifra lleva a la vista donde se ven esos lugares. */
  href?: string;
}) {
  const clases = `flex min-w-[124px] shrink-0 flex-col gap-1 rounded-2xl border p-4 sm:basis-[132px] ${
    href ? "transition hover:border-[var(--color-borde-fuerte)]" : ""
  } ${
    urgente
      ? "border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)]"
      : "border-[var(--color-borde)] bg-[var(--color-hueso)]"
  }`;

  const contenido = (
    <>
      <span
        className={`text-[34px] font-extrabold leading-none tracking-tight ${
          urgente ? "text-[var(--color-urgente-texto)]" : ""
        }`}
      >
        {valor}
      </span>
      <span
        className={`text-[13px] font-semibold leading-tight ${
          urgente ? "text-[#8f2418]" : "text-[var(--color-apagado)]"
        }`}
      >
        {etiqueta}
      </span>
    </>
  );

  return href ? (
    <Link href={href} className={clases}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
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
    abierto?: string;
    lat?: string;
    lng?: string;
  }>;
}) {
  const p = await searchParams;
  const modo: ModoId = esModo(p.modo) ? p.modo : "donar";
  const copia = MODOS[modo];

  const lat = Number(p.lat);
  const lng = Number(p.lng);
  const ubicado = Number.isFinite(lat) && Number.isFinite(lng);

  const esVoluntarios = modo === "voluntarios";
  const modoLugares = esVoluntarios ? undefined : modo;

  const convocatorias = esVoluntarios
    ? await listarConvocatorias({ ciudad: p.ciudad })
    : [];

  const [ciudades, todosLosAlbergues, centrosCrudos] = await Promise.all([
    listarCiudadesConLugares(),
    // Sin filtro de modo, a propósito: ver el comentario de `albergues`.
    listarCentros({ ciudad: p.ciudad, tipo: "albergue" }),
    esVoluntarios
      ? Promise.resolve([])
      : ubicado
        ? centrosCercanos(
            lat,
            lng,
            50,
            modo === "donar" ? p.categoria : undefined,
            { modo: modoLugares, tipo: p.tipo }
          )
        : listarCentros({
            ciudad: p.ciudad,
            categoria: modo === "donar" ? p.categoria : undefined,
            modo: modoLugares,
            tipo: p.tipo,
            soloAceptaMascotas: modo === "ayuda" && p.mascotas === "1",
          }),
  ]);

  // "Abierto ahora" se filtra acá y no en SQL porque el horario es texto libre
  // que escribe cada lugar a mano. Interpretarlo en la base exigiría parsearlo
  // en SQL; en JS se hace una vez y se puede ser honesto con lo ambiguo.
  const centros =
    p.abierto === "1"
      ? centrosCrudos.filter((c) => estaAbierto(c.horario) === true)
      : centrosCrudos;

  const distancias = ubicado
    ? new Map(
        centros
          .filter((c): c is (typeof centros)[number] & { distancia_m: number } =>
            "distancia_m" in c
          )
          .map((c) => [c.id, c.distancia_m])
      )
    : undefined;

  const ciudadSel = ciudades.find((c) => c.slug === p.ciudad);
  const centroMapa: [number, number] = ubicado
    ? [lat, lng]
    : ciudadSel
      ? [ciudadSel.lat, ciudadSel.lng]
      : CENTRO_POR_DEFECTO;

  const urgentes = centros.filter((c) =>
    c.necesidades.some((n) => n.nivel === "urgente")
  ).length;

  // Los albergues NO se cuentan sobre la lista filtrada.
  //
  // El modo "donar" solo muestra lugares que reciben donaciones, y la mayoría
  // de los albergues no reciben: alojan gente. Contarlos ahí decía "2
  // albergues abiertos" habiendo diecisiete, y quien lo leía entendía que en
  // todo el país hay dos. La cifra responde "¿cuántos albergues hay?", que no
  // depende de si vine a donar o a pedir ayuda.
  const albergues = todosLosAlbergues.length;
  const plazas = convocatorias.reduce(
    (n, c) => n + (c.cupo === null ? 0 : Math.max(0, c.cupo - c.inscritos)),
    0
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <section className="flex flex-col gap-6 border-b border-[var(--color-borde)] py-7 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <div className="flex max-w-2xl flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-[38px]">
              {copia.titulo}
            </h1>
            <p className="text-[17px] leading-snug text-[var(--color-apagado)]">
              {copia.bajada}
            </p>
          </div>
          <AccionesRapidas modo={modo} />
        </div>

        {/* Se arrastran de lado en móvil en vez de comprimirse: con tres
            tarjetas a 101 px, "albergues abiertos" se partía en tres líneas. */}
        <div className="chips-scroll -mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {esVoluntarios ? (
            <>
              <Cifra valor={convocatorias.length} etiqueta="convocatorias" />
              <Cifra
                valor={plazas}
                etiqueta="personas faltan"
                urgente={plazas > 0}
              />
            </>
          ) : (
            <>
              <Cifra valor={centros.length} etiqueta="lugares activos" />
              <Cifra
                valor={urgentes}
                etiqueta="con algo urgente"
                urgente={urgentes > 0}
              />
              {albergues > 0 && (
                <Cifra
                  valor={albergues}
                  etiqueta={
                    albergues === 1 ? "albergue abierto" : "albergues abiertos"
                  }
                  // La mayoría no recibe donaciones, así que en este modo no
                  // están en la lista de abajo. El enlace lleva a donde sí.
                  href={
                    p.ciudad
                      ? `/?modo=ayuda&tipo=albergue&ciudad=${p.ciudad}`
                      : "/?modo=ayuda&tipo=albergue"
                  }
                />
              )}
            </>
          )}
        </div>
      </section>

      <div className="sticky top-[60px] z-20 -mx-4 border-b border-[var(--color-borde)] bg-[var(--color-lienzo)]/95 px-4 py-3 backdrop-blur sm:top-16">
        <Suspense fallback={<div className="h-24" />}>
          <Filtros ciudades={ciudades} modo={modo} ubicado={ubicado} />
        </Suspense>
      </div>

      {/* Antes del listado, no al pie: un aviso que se lee después de haber
          salido de la casa llega tarde. */}
      <AvisoRecopilacion className="mt-5" compacto />

      {!esVoluntarios && (
        <div className="pt-6">
          <UrgentesDestacados centros={centros} distancias={distancias} />
        </div>
      )}

      {/* En pantalla ancha, listado y mapa conviven: se compara sin perder de
          vista dónde queda cada cosa. En móvil van apilados, con el mapa
          primero para orientarse. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="order-2 lg:order-1">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-extrabold tracking-tight">
              {esVoluntarios
                ? "Convocatorias abiertas"
                : ubicado
                  ? "Lo más cerca de ti"
                  : ciudadSel
                    ? `${centros.length} en ${ciudadSel.nombre}`
                    : `${centros.length} ${centros.length === 1 ? "lugar" : "lugares"}`}
            </h2>
            {!esVoluntarios && urgentes > 0 && (
              <span className="text-[13px] text-[var(--color-tenue)]">
                Los urgentes primero
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {esVoluntarios ? (
              convocatorias.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-borde-fuerte)] bg-white p-8 text-center">
                  <p className="text-[var(--color-apagado)]">{copia.vacio}</p>
                  <Link
                    href="/convocar"
                    className="mt-3 inline-block rounded-lg bg-[var(--color-tinta)] px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Convocar voluntarios
                  </Link>
                </div>
              ) : (
                convocatorias.map((c) => (
                  <TarjetaConvocatoria key={c.id} convocatoria={c} />
                ))
              )
            ) : centros.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-borde-fuerte)] bg-white p-8 text-center">
                <p className="text-[var(--color-apagado)]">
                  {p.abierto === "1"
                    ? "Ningún lugar aparece abierto en este momento. Quita el filtro para verlos todos."
                    : copia.vacio}
                </p>
                <Link
                  href="/registrar"
                  className="mt-3 inline-block rounded-lg bg-[var(--color-tinta)] px-4 py-2.5 text-sm font-bold text-white"
                >
                  Registrar un lugar
                </Link>
              </div>
            ) : (
              centros.map((c) => (
                <TarjetaCentro
                  key={c.id}
                  centro={c}
                  modo={modo}
                  distanciaM={distancias?.get(c.id)}
                />
              ))
            )}
          </div>
        </section>

        <section className="order-1 lg:sticky lg:top-[188px] lg:order-2">
          <MapaClient
            centros={centros}
            convocatorias={convocatorias}
            centro={centroMapa}
            zoom={ubicado || ciudadSel ? 13 : 8}
            miUbicacion={ubicado ? [lat, lng] : undefined}
          />
          <BotonCompartir
            className="mt-3"
            texto={
              urgentes > 0
                ? `Mapa de acopios y albergues por el sismo: ${centros.length} lugares, ${urgentes} necesitan algo urgente. Mira qué falta antes de salir de la casa:`
                : "Mapa de acopios y albergues por el sismo. Mira qué necesita cada uno antes de salir de la casa:"
            }
          />
        </section>
      </div>

      {/* La tarjeta completa solo donde viene al caso: quien busca ayuda o
          quien está filtrando lugares para animales. En los demás modos basta
          con el botón chico de arriba. */}
      {(modo === "ayuda" || p.tipo === "animales") && (
        <div className="mt-6">
          <EnlaceMascotas />
        </div>
      )}
    </div>
  );
}
