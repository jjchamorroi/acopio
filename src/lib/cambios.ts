import { categoria as buscarCategoria, NIVELES } from "./categorias";
import { tipoLugar } from "./tipos-lugar";
import type { CentroPublico } from "./tipos";

/**
 * Estado editable de un lugar. Es lo que se guarda en el historial y lo que se
 * reescribe al revertir.
 */
export type Instantanea = {
  tipo: string;
  telefono: string | null;
  horario: string | null;
  notas: string | null;
  estado: string;
  recibe_donaciones: boolean;
  entrega_ayuda: boolean;
  acepta_mascotas: boolean | null;
  atiende: string | null;
  tipos_sangre: string | null;
  necesidades: { categoria: string; nivel: string; detalle: string | null }[];
};

export type CambioRegistrado = {
  id: string;
  autor: "acopio" | "admin";
  resumen: string;
  anterior: Instantanea;
  creado_en: string;
};

export function instantanea(centro: CentroPublico): Instantanea {
  return {
    tipo: centro.tipo,
    telefono: centro.telefono,
    horario: centro.horario,
    notas: centro.notas,
    estado: centro.estado,
    recibe_donaciones: centro.recibe_donaciones,
    entrega_ayuda: centro.entrega_ayuda,
    acepta_mascotas: centro.acepta_mascotas,
    atiende: centro.atiende,
    tipos_sangre: centro.tipos_sangre,
    necesidades: centro.necesidades
      .map((n) => ({
        categoria: n.categoria,
        nivel: n.nivel as string,
        detalle: n.detalle,
      }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria)),
  };
}

function textoMascotas(v: boolean | null) {
  if (v === true) return "acepta mascotas";
  if (v === false) return "no acepta mascotas";
  return "mascotas sin definir";
}

/**
 * Diferencia legible entre dos estados.
 *
 * Se escribe para que alguien del equipo entienda de un vistazo qué pasó sin
 * abrir nada: "Agua: urgente → ya no la piden" dice más que "necesidades
 * modificadas".
 */
export function describirCambio(
  antes: Instantanea,
  despues: Instantanea
): string {
  const partes: string[] = [];

  if (antes.tipo !== despues.tipo) {
    partes.push(
      `tipo: ${tipoLugar(antes.tipo)?.corto ?? antes.tipo} → ${tipoLugar(despues.tipo)?.corto ?? despues.tipo}`
    );
  }
  if (antes.estado !== despues.estado) {
    partes.push(`estado: ${antes.estado} → ${despues.estado}`);
  }
  if (antes.telefono !== despues.telefono) {
    partes.push(`teléfono: ${antes.telefono ?? "sin teléfono"} → ${despues.telefono ?? "sin teléfono"}`);
  }
  if (antes.horario !== despues.horario) {
    partes.push(`horario: ${antes.horario ?? "sin horario"} → ${despues.horario ?? "sin horario"}`);
  }
  if (antes.atiende !== despues.atiende) {
    partes.push(`atiende: ${antes.atiende ?? "sin especificar"} → ${despues.atiende ?? "sin especificar"}`);
  }
  if (antes.tipos_sangre !== despues.tipos_sangre) {
    partes.push(
      `tipos de sangre: ${antes.tipos_sangre ?? "sin especificar"} → ${despues.tipos_sangre ?? "sin especificar"}`
    );
  }
  if (antes.notas !== despues.notas) {
    partes.push("notas modificadas");
  }
  if (antes.acepta_mascotas !== despues.acepta_mascotas) {
    partes.push(
      `${textoMascotas(antes.acepta_mascotas)} → ${textoMascotas(despues.acepta_mascotas)}`
    );
  }
  if (antes.recibe_donaciones !== despues.recibe_donaciones) {
    partes.push(
      despues.recibe_donaciones
        ? "vuelve a recibir donaciones"
        : "deja de recibir donaciones"
    );
  }
  if (antes.entrega_ayuda !== despues.entrega_ayuda) {
    partes.push(
      despues.entrega_ayuda ? "empieza a entregar ayuda" : "deja de entregar ayuda"
    );
  }

  const mapa = (lista: Instantanea["necesidades"]) =>
    new Map(lista.map((n) => [n.categoria, n]));
  const antesN = mapa(antes.necesidades);
  const despuesN = mapa(despues.necesidades);
  const nombre = (id: string) => buscarCategoria(id)?.label ?? id;
  const nivel = (id: string) =>
    NIVELES[id as keyof typeof NIVELES]?.label ?? id;

  for (const [cat, n] of despuesN) {
    const previo = antesN.get(cat);
    if (!previo) {
      partes.push(`${nombre(cat)}: ahora lo piden (${nivel(n.nivel)})`);
    } else if (previo.nivel !== n.nivel) {
      partes.push(`${nombre(cat)}: ${nivel(previo.nivel)} → ${nivel(n.nivel)}`);
    } else if (previo.detalle !== n.detalle) {
      partes.push(`${nombre(cat)}: detalle modificado`);
    }
  }
  for (const [cat] of antesN) {
    if (!despuesN.has(cat)) {
      partes.push(`${nombre(cat)}: ya no lo piden`);
    }
  }

  if (partes.length === 0) return "Sin cambios visibles";
  // Más de cuatro cosas en una línea no se lee; se resume el resto.
  if (partes.length > 4) {
    return `${partes.slice(0, 4).join(". ")} y ${partes.length - 4} cambio${partes.length - 4 === 1 ? "" : "s"} más`;
  }
  return partes.join(". ");
}
