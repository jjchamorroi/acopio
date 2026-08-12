import { query } from "./db";
import { hashToken, tokensCoinciden, esAdmin } from "./tokens";

export type Autorizacion =
  | { ok: true; admin: boolean }
  | { ok: false; error: string; status: number };

/**
 * Comprueba que quien llama puede tocar este lugar: o es el equipo con la
 * clave de administración, o trae el enlace privado del propio lugar.
 */
export async function autorizarLugar(
  req: Request,
  id: string
): Promise<Autorizacion> {
  if (esAdmin(req)) return { ok: true, admin: true };

  const tokenRecibido = req.headers.get("x-acopio-token") ?? "";
  if (!tokenRecibido) {
    return { ok: false, error: "Falta el token", status: 401 };
  }

  const filas = await query<{ admin_token_hash: string }>(
    "SELECT admin_token_hash FROM centro_acopio WHERE id = $1",
    [id]
  );
  if (filas.length === 0) {
    return { ok: false, error: "No encontrado", status: 404 };
  }
  if (!tokensCoinciden(hashToken(tokenRecibido), filas[0].admin_token_hash)) {
    return { ok: false, error: "Token inválido", status: 403 };
  }

  return { ok: true, admin: false };
}

/**
 * Igual que autorizarLugar pero para convocatorias. Se repite en vez de
 * generalizar con un nombre de tabla interpolado: meter identificadores de
 * tabla por concatenación es la puerta de atrás por la que entra una
 * inyección SQL, y son doce líneas.
 */
export async function autorizarConvocatoria(
  req: Request,
  id: string
): Promise<boolean> {
  if (esAdmin(req)) return true;

  const recibido = req.headers.get("x-acopio-token") ?? "";
  if (!recibido) return false;

  const filas = await query<{ admin_token_hash: string }>(
    "SELECT admin_token_hash FROM convocatoria WHERE id = $1",
    [id]
  );
  if (filas.length === 0) return false;
  return tokensCoinciden(hashToken(recibido), filas[0].admin_token_hash);
}
