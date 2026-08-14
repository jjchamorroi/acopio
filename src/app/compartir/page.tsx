import type { Metadata } from "next";
import Link from "next/link";
import { listarCiudadesConLugares } from "@/lib/consultas";

/**
 * Imágenes para compartir en Instagram.
 *
 * Instagram no lee vistas previas de enlaces: no sirve de nada pegar la URL.
 * Lo único que circula ahí son imágenes, así que hay que darle a la gente un
 * archivo que pueda descargar y publicar, con el enlace escrito ENCIMA para
 * que se pueda teclear.
 *
 * Se elige municipio porque el cartel genérico no sirve: "lleva pañales a
 * Manizales" cambia lo que alguien mete en el carro, "ayudemos a los
 * damnificados" no cambia nada.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compartir en redes",
  description:
    "Imágenes listas para publicar en Instagram con lo que hace falta hoy en cada municipio.",
};

export default async function Compartir({
  searchParams,
}: {
  searchParams: Promise<{ ciudad?: string; departamento?: string }>;
}) {
  const { ciudad, departamento } = await searchParams;
  const ciudades = await listarCiudadesConLugares();
  const sel = ciudades.find((c) => c.slug === ciudad);

  const url = ciudad
    ? `/api/imagen?v=falta&ciudad=${ciudad}`
    : departamento
      ? `/api/imagen?v=falta&departamento=${encodeURIComponent(departamento)}`
      : "/api/imagen?v=falta";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-[30px] font-extrabold leading-tight tracking-tight sm:text-[36px]">
        Compartir en Instagram
      </h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-snug text-[var(--color-apagado)]">
        Instagram no muestra la vista previa de un enlace: ahí solo circulan
        imágenes. Estas están hechas para publicar tal cual —en historia o en
        el feed— y llevan{" "}
        <strong className="text-[var(--color-tinta)]">
          lo que de verdad hace falta hoy
        </strong>
        , no un mensaje genérico.
      </p>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-etiqueta)]">
            Municipio
          </span>
          <select
            name="ciudad"
            defaultValue={ciudad ?? ""}
            className="rounded-lg border border-[var(--color-borde-fuerte)] bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Todo el país</option>
            {ciudades.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nombre}, {c.departamento}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-tinta)] px-4 py-2.5 text-sm font-bold text-white hover:bg-black"
        >
          Ver la imagen
        </button>
      </form>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">
            {sel ? `Qué llevar a ${sel.nombre}` : "Qué llevar y qué no"}
          </h2>
          <p className="mb-3 mt-1 text-[14px] text-[var(--color-apagado)]">
            Lo urgente y —lo que nadie más publica— lo que ya sobra.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Vista previa de la imagen para compartir"
            className="w-full max-w-[300px] rounded-xl border border-[var(--color-borde)]"
          />
          <a
            href={url}
            download={`red-de-acopio-${ciudad || "colombia"}.png`}
            className="mt-3 inline-block rounded-lg bg-[var(--color-tinta)] px-4 py-2.5 text-sm font-bold text-white hover:bg-black"
          >
            ⬇ Descargar
          </a>
        </div>

        <div>
          <h2 className="text-lg font-extrabold tracking-tight">
            Quién se está quedando por fuera
          </h2>
          <p className="mb-3 mt-1 text-[14px] text-[var(--color-apagado)]">
            Los municipios con daño y sin un solo punto de ayuda.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/imagen?v=brecha"
            alt="Vista previa de la imagen de la brecha de atención"
            className="w-full max-w-[300px] rounded-xl border border-[var(--color-borde)]"
          />
          <a
            href="/api/imagen?v=brecha"
            download="red-de-acopio-brecha.png"
            className="mt-3 inline-block rounded-lg bg-[var(--color-tinta)] px-4 py-2.5 text-sm font-bold text-white hover:bg-black"
          >
            ⬇ Descargar
          </a>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--color-borde)] bg-white p-5 text-[14px] leading-relaxed text-[var(--color-apagado)]">
        <p className="font-bold text-[var(--color-tinta)]">
          Cómo publicarla para que sirva
        </p>
        <ul className="mt-2 ml-5 list-disc space-y-1">
          <li>
            En <strong>historia</strong>, ponle el{" "}
            <strong>sticker de enlace</strong> encima: es la única forma de que
            alguien llegue al mapa con un toque.
          </li>
          <li>
            En el <strong>feed</strong> no hay enlaces clicables — por eso la
            dirección va escrita grande en la imagen.
          </li>
          <li>
            Las cifras se recalculan cada vez que se genera, así que{" "}
            <strong>vuelve a descargarla</strong> si la publicas otro día: una
            imagen de hace tres días manda gente con lo que ya sobra.
          </li>
        </ul>
      </div>

      <Link
        href="/"
        className="mt-8 inline-block text-sm font-bold text-[var(--color-marino)] hover:underline"
      >
        ← Volver al mapa
      </Link>
    </div>
  );
}
