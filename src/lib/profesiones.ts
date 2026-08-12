/**
 * Profesiones que pueden ofrecerse. Lista cerrada por la misma razón que las
 * categorías de donación: para poder filtrar. Alguien buscando "psicólogo" no
 * puede depender de que la otra persona haya escrito "psicologa" o "salud
 * mental".
 *
 * `registroObligatorio` marca las que ejercen sobre la salud de alguien. En
 * esas, publicar el número de tarjeta no es burocracia: es lo único que
 * permite a un tercero comprobar que quien se ofrece es quien dice ser.
 */
export const PROFESIONES = [
  {
    id: "psicologia",
    label: "Psicología",
    emoji: "🧠",
    registroObligatorio: true,
    registroNombre: "Tarjeta profesional (Ley 1090)",
  },
  {
    id: "medicina",
    label: "Medicina general",
    emoji: "🩺",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "medicina_especializada",
    label: "Medicina especializada",
    emoji: "🏥",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "psiquiatria",
    label: "Psiquiatría",
    emoji: "💊",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "enfermeria",
    label: "Enfermería",
    emoji: "💉",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "fisioterapia",
    label: "Fisioterapia",
    emoji: "🦵",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "odontologia",
    label: "Odontología",
    emoji: "🦷",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "nutricion",
    label: "Nutrición",
    emoji: "🥗",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "veterinaria",
    label: "Veterinaria",
    emoji: "🐾",
    registroObligatorio: true,
    registroNombre: "Tarjeta profesional",
  },
  {
    id: "trabajo_social",
    label: "Trabajo social",
    emoji: "🤝",
    registroObligatorio: false,
    registroNombre: "Tarjeta profesional",
  },
  {
    id: "juridica",
    label: "Asesoría jurídica",
    emoji: "⚖️",
    registroObligatorio: false,
    registroNombre: "Tarjeta profesional",
  },
  {
    id: "ingenieria",
    label: "Ingeniería o arquitectura",
    emoji: "🏗️",
    registroObligatorio: false,
    registroNombre: "Matrícula profesional",
  },
  {
    id: "otra",
    label: "Otra",
    emoji: "🧰",
    registroObligatorio: false,
    registroNombre: "Registro o matrícula",
  },
] as const;

export type ProfesionId = (typeof PROFESIONES)[number]["id"];
export const PROFESION_IDS = PROFESIONES.map((p) => p.id) as string[];

export function profesion(id: string) {
  return PROFESIONES.find((p) => p.id === id);
}

export const MODALIDADES = {
  presencial: { label: "Presencial", ayuda: "Atiende en persona" },
  remoto: { label: "Remoto", ayuda: "Por teléfono o videollamada" },
  ambas: { label: "Presencial y remoto", ayuda: "Las dos formas" },
} as const;

export type ModalidadId = keyof typeof MODALIDADES;
export const MODALIDAD_IDS = Object.keys(MODALIDADES) as ModalidadId[];
