/**
 * Catálogo cerrado de categorías. Cerrado a propósito: si cada acopio escribe
 * lo que necesita en texto libre, no se puede cruzar la oferta con la demanda
 * ("agua" vs "agüita" vs "botellones") y se pierde el match, que es el punto
 * de toda la aplicación.
 */
export const CATEGORIAS = [
  { id: "agua", label: "Agua potable", emoji: "💧" },
  { id: "alimentos", label: "Alimentos no perecederos", emoji: "🥫" },
  { id: "aseo", label: "Aseo personal", emoji: "🧼" },
  { id: "bebe", label: "Pañales y fórmula", emoji: "🍼" },
  { id: "medicamentos", label: "Medicamentos e insumos", emoji: "💊" },
  { id: "dormir", label: "Colchonetas y cobijas", emoji: "🛏️" },
  { id: "ropa", label: "Ropa y calzado", emoji: "👕" },
  { id: "carpas", label: "Carpas y plásticos", emoji: "⛺" },
  { id: "herramientas", label: "Herramientas y palas", emoji: "🛠️" },
  { id: "energia", label: "Linternas, pilas, plantas", emoji: "🔦" },
  { id: "mascotas", label: "Alimento para mascotas", emoji: "🐕" },
  { id: "otros", label: "Otros", emoji: "📦" },
] as const;

export type CategoriaId = (typeof CATEGORIAS)[number]["id"];

export const CATEGORIA_IDS = CATEGORIAS.map((c) => c.id) as string[];

export function categoria(id: string) {
  return CATEGORIAS.find((c) => c.id === id);
}

export const NIVELES = {
  urgente: {
    label: "Urgente",
    ayuda: "Se está agotando o ya no hay",
    color: "#dc2626",
  },
  necesita: {
    label: "Necesita",
    ayuda: "Recibe con gusto, sin ser crítico",
    color: "#f59e0b",
  },
  sobra: {
    label: "Le sobra",
    ayuda: "Tiene de más y puede ceder a otro acopio",
    color: "#0891b2",
  },
} as const;

export type NivelId = keyof typeof NIVELES;

export const NIVEL_IDS = Object.keys(NIVELES) as NivelId[];
