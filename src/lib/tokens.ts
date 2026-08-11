import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Token que se le entrega al responsable del acopio. Se muestra una sola vez. */
export function generarToken() {
  return randomBytes(18).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Comparación en tiempo constante: evita que se pueda adivinar un token
 * midiendo cuánto tarda en fallar la comparación carácter por carácter.
 */
export function tokensCoinciden(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** true si el header Authorization trae el ADMIN_TOKEN correcto. */
export function esAdmin(req: Request) {
  const esperado = process.env.ADMIN_TOKEN;
  if (!esperado) return false;
  const recibido =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!recibido) return false;
  return tokensCoinciden(recibido, esperado);
}
