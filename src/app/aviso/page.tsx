import Link from "next/link";

export const metadata = {
  title: "Aviso legal y tratamiento de datos",
  description:
    "Qué es este sitio, de dónde sale la información, qué no garantizamos y cómo pedir que se corrija o se retire un dato.",
};

/**
 * Correo de contacto para correcciones y retiros.
 *
 * Va por variable de entorno para no fijar en el código un dato personal, y
 * para poder cambiarlo sin desplegar. Si no está configurado, el aviso lo dice
 * en vez de mostrar un enlace roto: prometer un canal de contacto que no
 * existe es peor que no ofrecerlo.
 */
const CONTACTO = process.env.NEXT_PUBLIC_CONTACTO ?? "";

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
      <div className="mt-2 space-y-3 text-slate-700">{children}</div>
    </section>
  );
}

export default function Aviso() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Aviso legal y tratamiento de datos
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Última actualización: 12 de agosto de 2026
      </p>

      <p className="mt-6 rounded-lg border border-slate-300 bg-slate-50 p-4 text-slate-800">
        Este sitio existe para <strong>unificar información dispersa</strong> y
        que la ayuda llegue más rápido tras el sismo del 10 de agosto de 2026.
        Se ofrece de buena fe, gratis y sin ánimo de lucro. No es un servicio
        profesional ni oficial, y quienes lo mantienen no adquieren obligación
        alguna con quien lo usa.
      </p>

      <Seccion titulo="1. Qué es esto">
        <p>
          Una <strong>iniciativa ciudadana y voluntaria</strong>, sin ánimo de
          lucro. No pertenece, no representa ni está avalada por ninguna entidad
          pública, medio de comunicación, organismo de socorro, fundación ni
          empresa. Nadie cobra por operarlo y nadie recibe dinero a través de
          él: aquí no se reciben donaciones en efectivo ni se intermedian pagos.
        </p>
      </Seccion>

      <Seccion titulo="2. De dónde sale la información">
        <p>
          Casi toda la publica <strong>gente que usa el sitio</strong>: acopios,
          albergues, comedores, instituciones, donantes y voluntarios que se
          registran por su cuenta. No la generamos nosotros.
        </p>
        <p>
          La marca <strong>“Verificado”</strong> significa únicamente que
          alguien del equipo se comunicó con ese lugar en algún momento y
          confirmó que existía y estaba recibiendo. <strong>No</strong> es una
          certificación, ni una auditoría, ni una garantía de que hoy siga
          abierto, ni un aval sobre cómo administra lo que recibe. Lo que
          aparece como <strong>“Sin verificar”</strong> no ha sido comprobado
          por nadie.
        </p>
      </Seccion>

      <Seccion titulo="3. Lo que no podemos garantizar">
        <p>
          El sitio se ofrece <strong>tal como está</strong>, sin garantías de
          ningún tipo. En particular, no garantizamos que la información sea
          exacta, esté completa ni actualizada; que un lugar siga abierto,
          siga necesitando lo que publicó o reciba a quien llegue; que los
          teléfonos y direcciones sean correctos; ni que el servicio esté
          siempre disponible.
        </p>
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          <strong>Llama siempre antes de desplazarte.</strong> Un dato de hace
          unas horas puede haber cambiado, y el viaje perdido lo haces tú.
        </p>
      </Seccion>

      <Seccion titulo="4. Cada decisión es de quien la toma">
        <p>
          La información es un insumo, no una recomendación. Quien decide
          desplazarse, entregar bienes, recibir personas, acudir a una
          convocatoria o cualquier otra acción a partir de lo que ve acá lo
          hace <strong>bajo su propio criterio y riesgo</strong>.
        </p>
        <p>
          Hasta donde lo permite la ley, quienes desarrollan y mantienen este
          sitio <strong>no responden</strong> por daños, pérdidas, gastos,
          lesiones ni perjuicios de ningún tipo derivados del uso de la
          información publicada, de errores u omisiones en ella, de la conducta
          de terceros —incluidos los lugares y las personas que aquí figuran— ni
          de la interrupción del servicio.
        </p>
        <p>
          Las <strong>jornadas de voluntariado</strong> merecen un párrafo
          aparte: quien se apunta asume los riesgos de la actividad. Los
          trabajos señalados como riesgosos deben estar coordinados por un
          organismo de socorro. Este sitio solo publica la convocatoria; no la
          organiza, no la supervisa y no responde por lo que ocurra en ella.
        </p>
      </Seccion>

      <Seccion titulo="5. Esto no reemplaza a las autoridades">
        <p>
          En una emergencia, la línea oficial es el{" "}
          <strong className="text-slate-900">123</strong>. Los organismos
          competentes son la <strong>UNGRD</strong>, la{" "}
          <strong>Cruz Roja Colombiana</strong>, la{" "}
          <strong>Defensa Civil</strong>, los bomberos y las alcaldías. Ante
          cualquier contradicción entre lo que dice este sitio y lo que dicen
          ellos, <strong>hazles caso a ellos</strong>.
        </p>
      </Seccion>

      <Seccion titulo="6. Enlaces a otros sitios">
        <p>
          Enlazamos a iniciativas ciudadanas que ya cubren algo que aquí no
          hacemos, en vez de duplicarlas: si los reportes se reparten entre dos
          sitios, nadie encuentra nada. Hoy enlazamos a{" "}
          <strong>Ubica tu Peludo</strong>, para mascotas perdidas por el sismo.
        </p>
        <p>
          Esos sitios son <strong>ajenos</strong>. No los operamos, no los
          controlamos, no revisamos lo que publican y no responden ante
          nosotros ni nosotros por ellos. Su contenido, su disponibilidad y el
          tratamiento que le den a tus datos se rigen por{" "}
          <strong>sus propias condiciones</strong>, no por este aviso. Enlazar
          no es avalar.
        </p>
      </Seccion>

      <Seccion titulo="7. Datos personales">
        <p>
          Tratamos datos personales conforme a la{" "}
          <strong>Ley 1581 de 2012</strong> y el Decreto 1377 de 2013.
          Recogemos lo mínimo para que la ayuda llegue, y nada más:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>Lugares:</strong> nombre, dirección, horario y un teléfono
            de contacto. Se publican, y quien registra el lugar lo autoriza al
            hacerlo. Pedimos que el teléfono sea institucional, no personal.
          </li>
          <li>
            <strong>Donantes:</strong> teléfono y una zona aproximada. La
            ubicación exacta <strong>nunca se publica</strong>: en el mapa se
            muestra un área de unos 300 metros. El teléfono sí es público, y el
            formulario lo advierte antes de enviar.
          </li>
          <li>
            <strong>Voluntarios:</strong> nombre y teléfono.{" "}
            <strong>No se publican.</strong> Solo los ve quien organiza esa
            convocatoria, para poder llamar.
          </li>
          <li>
            <strong>Ubicación del navegador:</strong> si la compartes para ver
            lo más cercano, se usa en ese momento y{" "}
            <strong>no se guarda</strong>.
          </li>
          <li>
            <strong>Direcciones IP:</strong> no se almacenan. Para limitar
            abusos guardamos un valor cifrado irreversible derivado de ellas,
            que solo sirve para contar peticiones.
          </li>
        </ul>
        <p>
          No usamos publicidad, no hacemos perfilamiento y no compartimos ni
          vendemos estos datos a nadie.
        </p>
        <p>
          Como titular puedes conocer, actualizar, rectificar y suprimir tus
          datos, y revocar la autorización. Los lugares y las donaciones tienen
          un enlace privado para editarse o retirarse en cualquier momento; si
          lo perdiste, escríbenos.
        </p>
      </Seccion>

      <Seccion titulo="8. Corregir o retirar información">
        <p>
          Si aparece algo incorrecto, desactualizado o publicado sin tu
          consentimiento —tu lugar, tu teléfono, tu institución—{" "}
          <strong>lo retiramos o lo corregimos</strong>. No hace falta explicar
          por qué.
        </p>
        <p>
          Cada lugar, donación y convocatoria se corrige o se retira con el{" "}
          <strong>enlace privado</strong> que se entrega al publicarlo. Es el
          camino más rápido y no depende de nadie.
        </p>
        {CONTACTO ? (
          <p>
            Si perdiste ese enlace, o si el dato lo publicó otra persona,
            escríbenos a{" "}
            <a
              href={`mailto:${CONTACTO}`}
              className="font-medium text-blue-700 underline"
            >
              {CONTACTO}
            </a>{" "}
            y lo resolvemos.
          </p>
        ) : (
          <p>
            Si perdiste ese enlace, o si el dato lo publicó otra persona,
            contáctanos por el mismo medio por el que llegaste a este sitio y lo
            resolvemos.
          </p>
        )}
      </Seccion>

      <Seccion titulo="9. Cambios">
        <p>
          Este aviso puede cambiar a medida que el sitio cambie. La fecha de
          arriba indica la última actualización.
        </p>
      </Seccion>

      <p className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
        En resumen: esto es un tablero comunitario hecho para que la ayuda
        llegue antes. Úsalo con criterio, confirma por teléfono y, ante la duda,
        sigue a los organismos de socorro.
      </p>

      <Link
        href="/"
        className="mt-6 inline-block text-sm font-medium text-blue-700 hover:underline"
      >
        ← Volver al mapa
      </Link>
    </div>
  );
}
