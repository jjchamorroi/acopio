/**
 * Los cuatro tipos de lugar que aparecen en el mapa.
 *
 * `recibe` y `entrega` son solo los valores POR DEFECTO al registrar: en la
 * base son campos propios y editables, porque hay excepciones reales (un
 * albergue desbordado deja de recibir donaciones sin dejar de alojar gente).
 */
export const TIPOS_LUGAR = [
  {
    id: "acopio",
    label: "Centro de acopio",
    corto: "Acopio",
    emoji: "📦",
    ayuda: "Recibe donaciones y las almacena",
    recibe: true,
    entrega: false,
    color: "#2563eb",
  },
  {
    id: "recoleccion",
    label: "Punto de recolección",
    corto: "Recolección",
    emoji: "🛒",
    ayuda: "Recibe donaciones y las traslada a un acopio",
    recibe: true,
    entrega: false,
    color: "#7c3aed",
  },
  {
    id: "albergue",
    label: "Albergue temporal",
    corto: "Albergue",
    emoji: "🏠",
    ayuda: "Aloja a personas damnificadas",
    recibe: true,
    entrega: true,
    color: "#059669",
  },
  {
    id: "animales",
    label: "Punto de atención animal",
    corto: "Animales",
    emoji: "🐾",
    ayuda: "Atención veterinaria y acopio para mascotas",
    recibe: true,
    entrega: true,
    color: "#ea580c",
  },
] as const;

export type TipoLugarId = (typeof TIPOS_LUGAR)[number]["id"];

export const TIPO_LUGAR_IDS = TIPOS_LUGAR.map((t) => t.id) as string[];

export function tipoLugar(id: string) {
  return TIPOS_LUGAR.find((t) => t.id === id);
}

/**
 * Los dos públicos de la aplicación. El mapa es uno solo y este selector
 * decide a quién le está hablando.
 */
export const MODOS = {
  donar: {
    label: "Quiero donar",
    titulo: "¿Dónde hace falta lo que podés donar?",
    bajada:
      "Elegí qué querés donar y el mapa te muestra quién lo está pidiendo hoy.",
    vacio: "Todavía no hay lugares registrados que reciban donaciones acá.",
  },
  ayuda: {
    label: "Necesito ayuda",
    titulo: "¿Dónde puedo recibir ayuda?",
    bajada:
      "Albergues y puntos de atención abiertos ahora. Llamá antes de ir: la información la aporta la comunidad.",
    vacio: "Todavía no hay lugares registrados que entreguen ayuda acá.",
  },
} as const;

export type ModoId = keyof typeof MODOS;

export function esModo(valor: string | undefined): valor is ModoId {
  return valor === "donar" || valor === "ayuda";
}
