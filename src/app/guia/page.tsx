import Link from "next/link";
import type { Metadata } from "next";
import ContactosUtiles from "@/components/ContactosUtiles";
import AvisoRecopilacion from "@/components/AvisoRecopilacion";

/**
 * Guía práctica para quien perdió la vivienda.
 *
 * El mapa responde "dónde", pero la pregunta que llega después —"me dejan
 * entrar sin estar censado", "me cobran por inscribirme", "mi casa quedó en
 * pie pero rajada, ¿cuento?"— no la responde ningún punto en un mapa. Esto sí.
 *
 * Dos criterios de redacción, y son los que hacen la página útil:
 *
 *  - Cuando un dato NO está publicado, se dice. El monto del subsidio de
 *    arriendo no se conoce; escribir una cifra plausible sería peor que el
 *    vacío, porque alguien organizaría su mes alrededor de ella.
 *  - Las reglas cambian de un municipio a otro y se indica cuál aplica dónde.
 *    "Le pueden exigir censo previo" es cierto en Dosquebradas y falso en
 *    Manizales, y trasladarse con una familia a cuestas por la regla
 *    equivocada cuesta una noche a la intemperie.
 */

const FECHA = "13 de agosto de 2026";

export const metadata: Metadata = {
  title: "Si perdiste tu vivienda: albergue, censo y ayudas",
  description:
    "Cómo entrar a un albergue, cómo inscribirse al censo (RUD), qué ayudas hay confirmadas y cuáles no, y cómo reconocer una estafa.",
  openGraph: {
    title: "Si perdiste tu vivienda: albergue, censo y ayudas",
    description:
      "No le pueden exigir estar censado para dejarlo entrar a un albergue. El trámite es gratuito. Guía práctica tras el sismo.",
  },
};

function Seccion({
  n,
  titulo,
  children,
}: {
  n: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 scroll-mt-24" id={`s${n}`}>
      <h2 className="text-[22px] font-extrabold leading-tight tracking-tight">
        {titulo}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[var(--color-apagado)]">
        {children}
      </div>
    </section>
  );
}

function Dato({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-hueso)] px-4 py-3 text-[14px]">
      {children}
    </p>
  );
}

function Ojo({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)] px-4 py-3 text-[14.5px] text-[#8f2418]">
      {children}
    </p>
  );
}

const INDICE = [
  [1, "Tres ayudas distintas que la gente confunde"],
  [2, "Cómo se entra a un albergue"],
  [3, "El censo (RUD): la puerta a las ayudas"],
  [4, "Si la casa quedó en pie pero es inhabitable"],
  [5, "Subsidio de arriendo"],
  [6, "Otras ayudas ya confirmadas"],
  [7, "Cuidado con las estafas"],
  [8, "Tus derechos NO están suspendidos"],
  [9, "Dónde NO hay albergue"],
  [10, "Riesgos dentro de los albergues"],
  [11, "Lo que el Estado todavía no publica"],
] as const;

export default function Guia() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-[var(--color-etiqueta)]">
        Guía práctica · corte {FECHA}
      </p>
      <h1 className="mt-2 text-[32px] font-extrabold leading-[1.1] tracking-tight sm:text-[38px]">
        Si perdiste tu vivienda: albergue, censo y ayudas
      </h1>

      <p className="mt-4 text-[17px] leading-snug text-[var(--color-apagado)]">
        El mapa te dice <strong>dónde</strong>. Esta página responde lo que
        viene después: si te dejan entrar sin estar censado, cómo inscribirte,
        qué ayudas están confirmadas y cuáles todavía no, y cómo saber si te
        están estafando.
      </p>

      <Ojo>
        <strong>Lo más importante, y en una línea:</strong> no le pueden exigir
        estar censado para dejarlo entrar a un albergue, y{" "}
        <strong>ningún trámite se paga</strong>. Quien le cobre por inscribirlo
        o por “acelerar” la ayuda lo está estafando.
      </Ojo>

      <AvisoRecopilacion className="mt-4" />

      <nav className="mt-6 rounded-2xl border border-[var(--color-borde)] bg-white p-4">
        <p className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-etiqueta)]">
          En esta página
        </p>
        <ol className="mt-2 grid gap-1 sm:grid-cols-2">
          {INDICE.map(([n, t]) => (
            <li key={n}>
              <a
                href={`#s${n}`}
                className="text-[14px] text-[var(--color-marino)] hover:underline"
              >
                {n}. {t}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Seccion n={1} titulo="1. Tres ayudas distintas que la gente confunde">
        <p>
          Son tres cosas separadas, con requisitos separados.{" "}
          <strong className="text-[var(--color-tinta)]">
            Pedir una no te excluye de las otras.
          </strong>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-[var(--color-borde-fuerte)] text-left">
                <th className="py-2 pr-3 font-bold">Qué es</th>
                <th className="py-2 pr-3 font-bold">¿Exige censo?</th>
                <th className="py-2 font-bold">¿Exige peritaje?</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-[var(--color-borde-suave)]">
                <td className="py-2.5 pr-3">
                  <strong className="text-[var(--color-tinta)]">
                    Ayuda humanitaria
                  </strong>
                  <br />
                  Alimentos, agua, kits de aseo, colchonetas, frazadas
                </td>
                <td className="py-2.5 pr-3 font-semibold text-[var(--color-abierto)]">
                  No
                </td>
                <td className="py-2.5 font-semibold text-[var(--color-abierto)]">
                  No
                </td>
              </tr>
              <tr className="border-b border-[var(--color-borde-suave)]">
                <td className="py-2.5 pr-3">
                  <strong className="text-[var(--color-tinta)]">
                    Alojamiento temporal
                  </strong>
                  <br />
                  Un lugar donde dormir: coliseos, estadios, carpas
                </td>
                <td className="py-2.5 pr-3 font-semibold">
                  Depende del municipio
                </td>
                <td className="py-2.5 font-semibold text-[var(--color-abierto)]">
                  No
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3">
                  <strong className="text-[var(--color-tinta)]">
                    Subsidio de arriendo
                  </strong>
                  <br />
                  Plata para pagar un arriendo particular
                </td>
                <td className="py-2.5 pr-3 font-semibold text-[var(--color-urgente-texto)]">
                  Sí
                </td>
                <td className="py-2.5 font-semibold text-[var(--color-urgente-texto)]">
                  Sí
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          La idea es que el albergue sea la solución inmediata y el subsidio de
          arriendo la salida del albergue. No son sustitutos.
        </p>
      </Seccion>

      <Seccion n={2} titulo="2. Cómo se entra a un albergue">
        <p>
          <strong className="text-[var(--color-tinta)]">
            La regla general: no le pueden exigir estar censado para dejarlo
            entrar.
          </strong>{" "}
          El censo se levanta dentro del albergue o después, y sirve para las
          ayudas económicas posteriores, no como llave de entrada.
        </p>
        <p>
          Los albergues los administran <strong>las alcaldías</strong>, no la
          UNGRD. En Pereira, funcionarios municipales recogieron directamente a
          familias que dormían en parques y las llevaron al Estadio Alberto Mora
          Mora.
        </p>
        <p className="!mt-5 font-bold text-[var(--color-tinta)]">
          Pero en la práctica hay tres modelos, y conviene saber cuál aplica
          antes de trasladarse:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--color-borde)] bg-white p-3.5">
            <p className="text-[13px] font-extrabold text-[var(--color-abierto)]">
              ENTRADA ABIERTA
            </p>
            <p className="mt-1 text-[13.5px] font-bold text-[var(--color-tinta)]">
              Manizales
            </p>
            <p className="mt-1 text-[13px]">
              Coliseo Mayor Jorge Arango Uribe. Recibe a cualquiera que necesite
              alojamiento, incluso a quien no perdió la vivienda pero la
              considera insegura. El censo se levanta adentro.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-borde)] bg-white p-3.5">
            <p className="text-[13px] font-extrabold text-[var(--color-urgente-texto)]">
              ENTRADA RESTRINGIDA
            </p>
            <p className="mt-1 text-[13.5px] font-bold text-[var(--color-tinta)]">
              Dosquebradas
            </p>
            <p className="mt-1 text-[13px]">
              Las Violetas y Polideportivo Campestre B. Solo familias{" "}
              <strong>ya caracterizadas</strong> por la Alcaldía. Sin registro
              previo no hay ingreso. Prioriza familias con menores.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-borde)] bg-white p-3.5">
            <p className="text-[13px] font-extrabold text-[var(--color-etiqueta)]">
              CON VERIFICACIÓN
            </p>
            <p className="mt-1 text-[13.5px] font-bold text-[var(--color-tinta)]">
              Cali
            </p>
            <p className="mt-1 text-[13px]">
              Bienestar Social registra, verifica el daño y pregunta si tienes
              red de apoyo familiar. <strong>Solo si no la hay</strong> se
              activa el traslado al albergue.
            </p>
          </div>
        </div>
        <p>
          En <strong>Chocó</strong> no hay censo consolidado, así que el ingreso
          no está condicionado a registro previo.
        </p>

        <p className="!mt-5 font-bold text-[var(--color-tinta)]">
          Pregunta estas tres cosas antes de trasladarte
        </p>
        <ol className="ml-5 list-decimal space-y-1.5">
          <li>
            <strong className="text-[var(--color-tinta)]">¿Hay cupo?</strong> El
            Coliseo Mayor de Pereira copó su capacidad en cuestión de horas.
          </li>
          <li>
            <strong className="text-[var(--color-tinta)]">
              ¿Admiten mascotas?
            </strong>{" "}
            Solo dos albergues lo confirman en todo el país: el Coliseo Mayor de
            Manizales —con espacio destinado y atención veterinaria— y el
            Estadio Alberto Mora Mora de Pereira. En el resto el dato no está
            publicado. <strong>No lo des por hecho.</strong>
          </li>
          <li>
            <strong className="text-[var(--color-tinta)]">
              ¿Exigen censo previo?
            </strong>{" "}
            Según el municipio, ver arriba.
          </li>
        </ol>
        <Dato>
          <strong>No hay ningún teléfono directo de albergue publicado</strong>{" "}
          en todo el país. El único contacto operativo hallado es la línea{" "}
          <a href="tel:119" className="font-bold underline">
            119
          </a>{" "}
          de Bomberos de Manizales. Para lo demás, la alcaldía o el{" "}
          <a href="tel:123" className="font-bold underline">
            123
          </a>
          .
        </Dato>
        <p>
          <Link
            href="/?modo=ayuda&tipo=albergue"
            className="font-bold text-[var(--color-marino)] underline"
          >
            Ver los albergues en el mapa →
          </Link>
        </p>
      </Seccion>

      <Seccion n={3} titulo="3. El censo (RUD): la puerta a las ayudas">
        <p>
          El <strong>Registro Único de Damnificados</strong> es lo que habilita
          las ayudas económicas. Sin estar en él no hay subsidio de arriendo.
        </p>
        <p>
          Lo administra la UNGRD, pero{" "}
          <strong className="text-[var(--color-tinta)]">
            quien lo diligencia en terreno es la alcaldía
          </strong>{" "}
          de cada municipio, a través del Consejo Territorial de Gestión del
          Riesgo.
        </p>
        <ol className="ml-5 list-decimal space-y-1.5">
          <li>
            <strong className="text-[var(--color-tinta)]">
              Reporta el daño
            </strong>{" "}
            a la autoridad de gestión del riesgo del municipio: alcaldía, DIGER
            en Pereira, UGR en Manizales, o el 320 240 0704 en Ibagué.
          </li>
          <li>
            <strong className="text-[var(--color-tinta)]">
              Pide evaluación técnica
            </strong>{" "}
            de la vivienda a Bomberos o la Cruz Roja.{" "}
            <em>Este paso es el que después habilita el subsidio</em>, y es el
            que no se puede saltar.
          </li>
          <li>Ve al módulo de registro habilitado en la alcaldía.</li>
          <li>Diligencia el formato oficial del RUD documentando las pérdidas.</li>
          <li>
            Está pendiente de las notificaciones de desembolso por SMS o en los
            listados locales.
          </li>
        </ol>
        <p>
          <strong className="text-[var(--color-tinta)]">Qué piden:</strong>{" "}
          cédula, información del núcleo familiar y el formato RUD. Guarda{" "}
          <strong>fotos, videos y todo lo que pruebe el daño</strong>: hacen
          falta después.
        </p>
        <Ojo>
          <strong>Advertencia oficial, textual:</strong> «El registro no
          garantiza ayuda automática». El apoyo depende de la evaluación de
          daños y de las medidas que activen las autoridades.
        </Ojo>
        <Dato>
          <strong>No está confirmado</strong> si se abrirá una plataforma RUD
          dedicada al Sismo 2026. Los canales vigentes son los de la UNGRD:{" "}
          <a href="tel:018000113200" className="font-bold underline">
            01 8000 113200
          </a>{" "}
          o{" "}
          <a href="tel:6015529696" className="font-bold underline">
            601 552 9696
          </a>
          , de 8:00 a. m. a 5:00 p. m.
        </Dato>
      </Seccion>

      <Seccion n={4} titulo="4. Si la casa quedó en pie pero es inhabitable">
        <p>
          <strong className="text-[var(--color-tinta)]">
            Quedas cubierto igual.
          </strong>{" "}
          El criterio publicado incluye a los hogares cuyas viviendas sufrieron
          «colapsos estructurales, pérdida total{" "}
          <strong>o daños que impidan su habitabilidad inmediata</strong>».
        </p>
        <p>
          La condición es que un inspector técnico o un organismo de socorro
          evalúe el deterioro. Sin esa evaluación no hay subsidio — por eso el
          paso 2 del censo es el importante.
        </p>
        <p>
          En el directorio del sitio hay{" "}
          <Link
            href="/profesionales?profesion=ingenieria"
            className="font-bold text-[var(--color-marino)] underline"
          >
            ingenieros y arquitectos que revisan viviendas gratis
          </Link>
          .
        </p>
      </Seccion>

      <Seccion n={5} titulo="5. Subsidio de arriendo">
        <p>
          Anunciado desde Quibdó el 10 de agosto y ampliado a Pereira,
          Manizales, Cali, Quindío y Chocó.
        </p>
        <Ojo>
          <strong>Lo que NO se ha publicado, a {FECHA}:</strong> el monto, la
          duración, el mecanismo de pago ni los requisitos detallados. Los
          mecanismos «todavía se encuentran en proceso de definición».{" "}
          <strong>
            Desconfía de cualquiera que te dé una cifra concreta.
          </strong>
        </Ojo>
        <p>
          Única cifra de beneficiarios publicada: cerca de{" "}
          <strong className="text-[var(--color-tinta)]">
            1.150 familias de Manizales
          </strong>{" "}
          que perdieron su vivienda.
        </p>
        <p>
          <strong>Dónde se solicita:</strong> en la alcaldía municipal o la
          oficina de Gestión del Riesgo. Es gratuito.
        </p>
      </Seccion>

      <Seccion n={6} titulo="6. Otras ayudas ya confirmadas">
        <ul className="ml-5 list-disc space-y-2.5">
          <li>
            <strong className="text-[var(--color-tinta)]">
              Servicios públicos gratis por 3 meses.
            </strong>{" "}
            El Gobierno asume el pago de los servicios públicos de los afectados
            durante tres meses.
          </li>
          <li>
            <strong className="text-[var(--color-tinta)]">
              Declaración de renta aplazada
            </strong>{" "}
            hasta el <strong>27 de octubre de 2026</strong>, para quien tuviera
            domicilio fiscal en el RUT al 10 de agosto en Valle del Cauca,
            Cauca, Risaralda, Quindío, Caldas o Chocó. Aplica{" "}
            <em>sin importar si hubo daño material</em>.
          </li>
          <li>
            <strong className="text-[var(--color-tinta)]">
              Fondo Nacional del Ahorro: cobertura del 100 %.
            </strong>{" "}
            Si tu vivienda fue financiada con el FNA, el seguro cubre la
            totalidad de los daños por terremoto, incluida la caída de
            escombros, muros o rocas.
            <br />
            <span className="text-[13.5px]">
              Correo <code>reclamacionseguros@fna.gov.co</code> · Línea{" "}
              <a href="tel:018000527070" className="font-bold underline">
                01 8000 52 7070
              </a>{" "}
              o <strong>#224</strong> desde celular. Piden formulario, cédula,
              cotizaciones de reparación, fotos del daño y reporte oficial.{" "}
              <strong>Plazo: dos años</strong> desde el 10 de agosto de 2026.
            </span>
          </li>
        </ul>
      </Seccion>

      <Seccion n={7} titulo="7. Cuidado con las estafas">
        <blockquote className="border-l-[3px] border-[var(--color-urgente-borde)] pl-4 italic">
          «Es infortunado que en el país, en esta situación, estén pidiendo
          dinero a nombre del ICBF. Quiero decirles que eso no es cierto.{" "}
          <strong className="not-italic text-[var(--color-tinta)]">
            El ICBF no pide dinero.
          </strong>
          »
          <footer className="mt-1 text-[13px] not-italic text-[var(--color-tenue)]">
            María Carolina Restrepo, directora del ICBF · 13 de agosto
          </footer>
        </blockquote>
        <p className="font-bold text-[var(--color-tinta)]">Señales de alarma</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Que te cobren por inscribirte en el censo.</li>
          <li>Que te prometan acelerar la ayuda a cambio de plata.</li>
          <li>Que te pidan datos bancarios.</li>
          <li>Colectas a nombre de entidades públicas.</li>
        </ul>
        <Dato>
          <strong>Canal oficial de donaciones en dinero:</strong> campaña
          «Colombia, un solo corazón» de la Cruz Roja Colombiana — cuenta
          Davivienda <strong>0560455069996490</strong> y Daviplata.
          <br />
          <strong>Para denunciar:</strong> CAI Virtual de la Policía o línea{" "}
          <a href="tel:112" className="font-bold underline">
            112
          </a>
          . No existe una línea específica para estafas del terremoto.
        </Dato>
      </Seccion>

      <Seccion n={8} titulo="8. Tus derechos NO están suspendidos">
        <p>
          Salió en la prensa que «se suspendieron los términos judiciales» en
          los siete departamentos afectados, y mucha gente entendió que hasta
          septiembre no puede reclamar nada. <strong>Es al revés.</strong>
        </p>
        <p>
          Es cierto que la suspensión se prorrogó{" "}
          <strong className="text-[var(--color-tinta)]">
            hasta el 11 de septiembre de 2026
          </strong>{" "}
          para los procesos ordinarios en los distritos judiciales de Armenia,
          Buga, Cali, Ibagué, Manizales, Pereira, Popayán y Quibdó. Pero el
          mismo Acuerdo dice, con todas las letras, que eso
        </p>
        <blockquote className="border-l-[3px] border-[var(--color-borde-fuerte)] pl-4 italic">
          «no suspende, limita ni afecta el derecho a formular acciones de
          tutela, hábeas corpus, solicitudes de audiencias de control de
          garantías con personas privadas de la libertad o de actos urgentes,
          ni los términos constitucionales o legales establecidos para su
          trámite y decisión.»
        </blockquote>
        <p>
          Lo que hicieron fue{" "}
          <strong className="text-[var(--color-tinta)]">
            trasladar esos casos a juzgados de otras ciudades
          </strong>{" "}
          —«despachos itinerantes»— para que sigan resolviéndose mientras las
          sedes afectadas se revisan. Y el Acuerdo es explícito en que el
          trámite se hace <em>«sin trasladar al usuario cargas derivadas de la
          contingencia»</em>: el problema de infraestructura es de ellos, no
          tuyo.
        </p>
        <Ojo>
          <strong>Qué significa esto en la práctica.</strong> Si no te dejan
          entrar a un albergue, si te niegan la ayuda a la que tienes derecho o
          si te exigen requisitos que nadie publicó,{" "}
          <strong>puedes poner una tutela hoy mismo</strong>. No tienes que
          esperar a septiembre. La tutela es gratuita, no necesita abogado y se
          puede presentar por los canales digitales de la Rama Judicial.
        </Ojo>
        <p>
          Para <strong>hábeas corpus</strong> —si alguien está privado de la
          libertad de forma irregular— hay turnos las 24 horas:{" "}
          <em>«todos los días y horas son hábiles para su recepción y
          trámite»</em>, incluidos festivos y vacancia judicial.
        </p>
        <p>
          En el directorio hay{" "}
          <Link
            href="/profesionales?profesion=juridica"
            className="font-bold text-[var(--color-marino)] underline"
          >
            abogados que asesoran gratis
          </Link>{" "}
          si no sabes por dónde empezar.
        </p>
        <Dato>
          Fuente: <strong>Acuerdo PCSJA26-12567 de 2026</strong> del Consejo
          Superior de la Judicatura, que prorroga el PCSJA26-12564.{" "}
          <a
            href="/documentos/acuerdo-PCSJA26-12567.pdf"
            target="_blank"
            rel="noreferrer"
            className="font-bold underline"
          >
            Leer el Acuerdo completo (PDF, 13 páginas) ↗
          </a>
        </Dato>
      </Seccion>

      <Seccion n={9} titulo="9. Dónde NO hay albergue">
        <p>Tres vacíos confirmados que conviene tener presentes:</p>
        <ul className="ml-5 list-disc space-y-2.5">
          <li>
            <strong className="text-[var(--color-urgente-texto)]">
              San José del Palmar (Chocó), el epicentro.
            </strong>{" "}
            Cero albergues habilitados. La gente duerme fuera de sus casas por
            daños y por miedo a las réplicas. El alcalde pidió carpas «para
            albergar a algunas personas»: eran una necesidad pendiente, no una
            solución instalada.
          </li>
          <li>
            <strong className="text-[var(--color-urgente-texto)]">
              Comunidades indígenas Embera y Wounaan.
            </strong>{" "}
            Ningún alojamiento habilitado. Familias a la intemperie, vías a los
            resguardos colapsadas, 26 territorios étnicos afectados. La
            Defensoría reportó 32 asentamientos sin información suficiente.
          </li>
          <li>
            <strong className="text-[var(--color-urgente-texto)]">
              Tolima.
            </strong>{" "}
            Ni un albergue en todo el departamento. 48 familias evacuadas del
            residencial Alta Vista en Ibagué sin destino publicado. Para
            reportar vivienda afectada:{" "}
            <a href="tel:3202400704" className="font-bold underline">
              320 240 0704
            </a>
            .
          </li>
        </ul>
      </Seccion>

      <Seccion n={10} titulo="10. Riesgos dentro de los albergues">
        <p className="font-bold text-[var(--color-tinta)]">
          Riesgo para mujeres y niñas
        </p>
        <blockquote className="border-l-[3px] border-[var(--color-borde-fuerte)] pl-4 italic">
          «La poca iluminación, cuando los servicios públicos están afectados, y
          la falta de privacidad en espacios donde muchas personas tienen que
          dormir, comer y usar los baños pueden aumentar los riesgos de
          violencia.»
          <footer className="mt-1 text-[13px] not-italic text-[var(--color-tenue)]">
            UNFPA y Centro de Derechos Reproductivos · 12 de agosto
          </footer>
        </blockquote>
        <p>
          Si estás en esa situación:{" "}
          <a href="tel:155" className="font-bold underline">
            155
          </a>{" "}
          (orientación a mujeres),{" "}
          <a href="tel:141" className="font-bold underline">
            141
          </a>{" "}
          (ICBF, niñez) y{" "}
          <a href="tel:123" className="font-bold underline">
            123
          </a>{" "}
          en emergencia.
        </p>
        <p className="!mt-5 font-bold text-[var(--color-tinta)]">
          Albergues en edificios dañados
        </p>
        <p>
          En <strong>Istmina (Chocó)</strong> se habilitaron escuelas como
          albergue aunque las propias escuelas tienen fallas estructurales.
          UNICEF alertó que <strong>796 escuelas</strong> en Chocó y
          Buenaventura quedaron en riesgo.
        </p>
        <p>
          Ninguna entidad ha publicado datos de baños por persona ni litros de
          agua disponibles dentro de los albergues. La{" "}
          <strong>Defensoría del Pueblo</strong> verifica esas condiciones:{" "}
          <a href="tel:018000914814" className="font-bold underline">
            01 8000 914 814
          </a>
          .
        </p>
      </Seccion>

      <Seccion n={11} titulo="11. Lo que el Estado todavía no publica">
        <p>
          Vale la pena decirlo con todas las letras, porque explica por qué es
          tan difícil orientar a alguien —y por qué existe este sitio:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Cuántos alojamientos temporales hay abiertos en el país.</li>
          <li>Cuánta gente está dentro de ellos.</li>
          <li>Cuántas familias damnificadas hay.</li>
          <li>
            Cuántas viviendas se destruyeron: las fuentes oficiales van de{" "}
            <strong className="text-[var(--color-tinta)]">
              1.136 a 11.347
            </strong>{" "}
            según cuál se consulte. Esa brecha es la mejor medida del vacío.
          </li>
        </ul>
        <blockquote className="border-l-[3px] border-[var(--color-borde-fuerte)] pl-4 italic">
          «Es urgente tomar los censos porque no hay realmente una estimación de
          cuántas son las personas afectadas.»
          <footer className="mt-1 text-[13px] not-italic text-[var(--color-tenue)]">
            Iris Marín, defensora del Pueblo · 13 de agosto
          </footer>
        </blockquote>
        <p>
          <strong className="text-[var(--color-tinta)]">
            Marco legal, en corto.
          </strong>{" "}
          El <strong>Decreto 1171 de 2026</strong> declaró desastre nacional el
          11 de agosto para Antioquia, Caldas, Cauca, Chocó, Quindío,
          Cundinamarca, Risaralda, Huila, Valle del Cauca, Tolima, Putumayo y
          Norte de Santander. Vigencia de 12 meses prorrogables. Crea la
          subcuenta «Sismo 2026» y habilita contratación directa.
        </p>
      </Seccion>

      <div className="mt-10">
        <ContactosUtiles titulo="Líneas oficiales" />
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--color-borde)] bg-white p-5 text-[14px] text-[var(--color-apagado)]">
        <p>
          <strong className="text-[var(--color-tinta)]">
            Buscar familiares desaparecidos.
          </strong>{" "}
          Cruz Roja Colombiana, Restablecimiento del Contacto Familiar: WhatsApp{" "}
          <strong>321 213 9525</strong>, correo{" "}
          <code>rcf@cruzrojacolombiana.org</code>. Da nombre completo, edad,
          última ubicación conocida, teléfono y características físicas.
        </p>
        <p className="mt-2 font-semibold text-[#8f2418]">
          No publiques cédulas, direcciones exactas ni datos bancarios en
          plataformas abiertas.
        </p>
      </div>

      <p className="mt-8 border-t border-[var(--color-borde)] pt-5 text-[13px] leading-relaxed text-[var(--color-tenue)]">
        Esta guía se armó con lo que la UNGRD, las alcaldías, la Defensoría del
        Pueblo y la prensa publicaron entre el 10 y el {FECHA}.{" "}
        <strong>
          No hay un protocolo nacional único publicado para esta emergencia
        </strong>
        : varias reglas cambian de un municipio a otro y se indica caso por
        caso. Donde un dato no está publicado, se dice — no se rellena.{" "}
        <Link href="/aviso" className="underline">
          Aviso legal
        </Link>
        .
      </p>

      <Link
        href="/"
        className="mt-6 inline-block text-sm font-bold text-[var(--color-marino)] hover:underline"
      >
        ← Volver al mapa
      </Link>
    </div>
  );
}
