import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { listarCentros } from "@/lib/consultas";
import { invalidarCache } from "@/lib/cache";
import { esquemaCentroNuevo } from "@/lib/tipos";
import { generarToken, hashToken, esAdmin } from "@/lib/tokens";
import { tipoLugar } from "@/lib/tipos-lugar";
import { validarUbicacionEnCiudad } from "@/lib/validacion-ubicacion";
import {
  consumirLimite,
  limpiarLimitesVencidos,
  respuesta429,
} from "@/lib/limite";

export const dynamic = "force-dynamic";

// Cinco acopios por hora desde la misma conexión. Un caso legítimo —alguien de
// una alcaldía cargando varios puntos— cabe de sobra; un script que quiera
// llenar el mapa de basura, no. Si a alguien real se le queda corto, que nos
// escriba: es preferible eso a un mapa contaminado en plena emergencia.
const MAX_REGISTROS_POR_HORA = 5;
const VENTANA_SEGUNDOS = 3600;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const modo = searchParams.get("modo");
  const centros = await listarCentros({
    ciudad: searchParams.get("ciudad") ?? undefined,
    categoria: searchParams.get("categoria") ?? undefined,
    modo: modo === "donar" || modo === "ayuda" ? modo : undefined,
    tipo: searchParams.get("tipo") ?? undefined,
    soloAceptaMascotas: searchParams.get("mascotas") === "1",
    incluirCerrados: searchParams.get("todos") === "1" && esAdmin(req),
  });
  return NextResponse.json(
    { centros },
    {
      // Los intermedios pueden reutilizar la respuesta unos segundos. En una
      // emergencia el desfase es irrelevante y la diferencia de capacidad no.
      headers: {
        "cache-control": "public, s-maxage=20, stale-while-revalidate=60",
      },
    }
  );
}

export async function POST(req: Request) {
  // El límite se consume antes de mirar el cuerpo: si no, un atacante puede
  // hacernos parsear y validar miles de peticiones gratis.
  if (!esAdmin(req)) {
    const limite = await consumirLimite(
      req,
      "crear-acopio",
      MAX_REGISTROS_POR_HORA,
      VENTANA_SEGUNDOS
    );
    if (!limite.permitido) {
      return respuesta429(
        limite,
        "Demasiados acopios registrados desde esta conexión"
      );
    }
  }

  // Limpieza oportunista de contadores vencidos, sin bloquear la respuesta.
  if (Math.random() < 0.02) void limpiarLimitesVencidos();

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = esquemaCentroNuevo.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // El texto de la dirección y el punto del mapa son datos independientes:
  // si no se comparan, alguien puede escribir una ciudad y marcar otra.
  const incoherencia = await validarUbicacionEnCiudad(d.ciudad_slug, d.lat, d.lng);
  if (incoherencia) {
    return NextResponse.json({ error: incoherencia }, { status: 400 });
  }

  const token = generarToken();
  const cliente = await getPool().connect();
  try {
    await cliente.query("BEGIN");

    // Si quien registra no dice explícitamente si recibe o entrega, se toman
    // los valores habituales del tipo de lugar. Siguen siendo editables
    // después: un albergue desbordado puede dejar de recibir donaciones sin
    // dejar de alojar gente.
    const porDefecto = tipoLugar(d.tipo);

    const { rows } = await cliente.query(
      `INSERT INTO centro_acopio
         (nombre, direccion, ciudad_slug, lat, lng, responsable, telefono,
          horario, notas, admin_token_hash,
          tipo, recibe_donaciones, entrega_ayuda, acepta_mascotas, atiende,
          tipos_sangre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id`,
      [
        d.nombre,
        d.direccion,
        d.ciudad_slug,
        d.lat,
        d.lng,
        d.responsable || null,
        d.telefono || null,
        d.horario || null,
        d.notas || null,
        hashToken(token),
        d.tipo,
        d.recibe_donaciones ?? porDefecto?.recibe ?? true,
        d.entrega_ayuda ?? porDefecto?.entrega ?? false,
        d.acepta_mascotas ?? null,
        d.atiende || null,
        d.tipos_sangre || null,
      ]
    );
    const id = rows[0].id as string;

    for (const n of d.necesidades) {
      await cliente.query(
        `INSERT INTO necesidad (centro_id, categoria, nivel, detalle)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (centro_id, categoria)
         DO UPDATE SET nivel = EXCLUDED.nivel,
                       detalle = EXCLUDED.detalle,
                       actualizado_en = now()`,
        [id, n.categoria, n.nivel, n.detalle || null]
      );
    }

    await cliente.query("COMMIT");

    // Sin esto, un lugar recién registrado tardaría hasta el TTL en salir en
    // el mapa y parecería que el registro no funcionó. Vaciar todo el caché
    // en cada escritura es aceptable porque se lee muchísimo más de lo que se
    // escribe.
    invalidarCache();

    // El token viaja una sola vez, en esta respuesta. Después solo queda el hash.
    return NextResponse.json({ id, token }, { status: 201 });
  } catch (err) {
    await cliente.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : "Error desconocido";
    // Ciudad inexistente -> violación de llave foránea.
    if (msg.includes("centro_acopio_ciudad_slug_fkey")) {
      return NextResponse.json({ error: "Ciudad no válida" }, { status: 400 });
    }
    console.error("Error creando acopio:", msg);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  } finally {
    cliente.release();
  }
}
