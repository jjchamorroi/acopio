import { z } from "zod";
import { CATEGORIA_IDS, NIVEL_IDS } from "./categorias";
import { TIPO_LUGAR_IDS } from "./tipos-lugar";
import { PROFESION_IDS, MODALIDAD_IDS } from "./profesiones";

export type Ciudad = {
  slug: string;
  nombre: string;
  departamento: string;
  lat: number;
  lng: number;
  prioridad: number;
};

export type NecesidadPublica = {
  categoria: string;
  nivel: "urgente" | "necesita" | "sobra";
  detalle: string | null;
};

export type CentroPublico = {
  id: string;
  nombre: string;
  direccion: string;
  ciudad_slug: string;
  ciudad_nombre: string;
  departamento: string;
  lat: number;
  lng: number;
  tipo:
    | "acopio"
    | "recoleccion"
    | "albergue"
    | "animales"
    | "institucion"
    | "sangre"
    | "comedor";
  /** Tipos de sangre que piden: "O−, O+" o "todos los tipos". */
  tipos_sangre: string | null;
  /** A quién atiende: "80 adultos mayores", "12 familias". */
  atiende: string | null;
  recibe_donaciones: boolean;
  entrega_ayuda: boolean;
  /** null = el lugar no informó si acepta animales. */
  acepta_mascotas: boolean | null;
  responsable: string | null;
  telefono: string | null;
  horario: string | null;
  notas: string | null;
  /** Aviso corto que cambia si vale la pena ir: "no llevar alimentos por ahora". */
  alerta: string | null;
  /** Qué NO recibe, separado por " · ". Evita el viaje perdido. */
  no_recibe: string | null;
  /** El punto es el del municipio, no el de la puerta. */
  ubicacion_aproximada: boolean;
  /**
   * No es un lugar sino una AUSENCIA: "el epicentro no tiene albergue".
   * Se publica por las necesidades que arrastra, nunca como sitio al que ir.
   */
  es_alerta: boolean;
  /**
   * De cuándo es la INFORMACIÓN. Distinto de `actualizado_en`, que se mueve
   * cada vez que corre el importador aunque el dato siga siendo del martes.
   */
  dato_de: string;
  /** Cupo del albergue, en texto libre: "Copada", "amplían a 2.500". */
  capacidad: string | null;
  /** Cuánta gente hay dentro, con su fecha: "249 personas al 13 de agosto". */
  ocupacion: string | null;
  /** Qué ofrece, separado por " · ": alimentación, salud, apoyo psicosocial. */
  servicios: string | null;
  /** Si exigen censo previo para entrar. La pregunta que evita un viaje en vano. */
  requisitos_ingreso: string | null;
  /** De dónde salió el dato cuando no lo publicó quien administra el lugar. */
  fuente_nombre: string | null;
  fuente_url: string | null;
  fuente_fecha: string | null;
  estado: "postulado" | "pendiente" | "verificado" | "rechazado" | "cerrado";
  /** Por qué se rechazó. Solo se muestra a quien postuló, en su enlace privado. */
  motivo_rechazo: string | null;
  es_demo: boolean;
  actualizado_en: string;
  necesidades: NecesidadPublica[];
};

const textoCorto = z.string().trim().min(1).max(120);

export const esquemaNecesidad = z.object({
  categoria: z.enum(CATEGORIA_IDS as [string, ...string[]]),
  nivel: z.enum(NIVEL_IDS as [string, ...string[]]),
  detalle: z.string().trim().max(200).optional().nullable(),
});

export const esquemaCentroNuevo = z.object({
  nombre: textoCorto,
  direccion: z.string().trim().min(5).max(200),
  ciudad_slug: z.string().trim().min(1).max(60),
  tipo: z.enum(TIPO_LUGAR_IDS as [string, ...string[]]).default("acopio"),
  recibe_donaciones: z.boolean().optional(),
  entrega_ayuda: z.boolean().optional(),
  acepta_mascotas: z.boolean().nullable().optional(),
  atiende: z.string().trim().max(120).optional().nullable(),
  tipos_sangre: z.string().trim().max(120).optional().nullable(),
  lat: z.number().gte(-4.3).lte(13.5), // caja aproximada de Colombia
  lng: z.number().gte(-82).lte(-66.8),
  responsable: z.string().trim().max(120).optional().nullable(),
  telefono: z
    .string()
    .trim()
    .max(40)
    .regex(/^[0-9+()\s-]*$/, "Teléfono inválido")
    .optional()
    .nullable(),
  horario: z.string().trim().max(120).optional().nullable(),
  notas: z.string().trim().max(500).optional().nullable(),
  necesidades: z.array(esquemaNecesidad).max(20).default([]),
});

/**
 * Donación tal como se publica. Ojo con lo que NO está: `lat`/`lng` exactas.
 * Este tipo es el contrato de lo que puede salir a internet.
 */
export type DonacionPublica = {
  id: string;
  categoria: string;
  descripcion: string;
  cantidad: string | null;
  ciudad_slug: string;
  ciudad_nombre: string;
  departamento: string;
  /** Desplazada ~300 m. La real no sale de la base. */
  lat_aprox: number;
  lng_aprox: number;
  contacto: string | null;
  telefono: string;
  notas: string | null;
  estado: "disponible" | "comprometida" | "entregada" | "cancelada";
  es_demo: boolean;
  creado_en: string;
  vence_en: string;
};

export const esquemaDonacionNueva = z.object({
  categoria: z.enum(CATEGORIA_IDS as [string, ...string[]]),
  descripcion: z.string().trim().min(3).max(300),
  cantidad: z.string().trim().max(80).optional().nullable(),
  ciudad_slug: z.string().trim().min(1).max(60),
  lat: z.number().gte(-4.3).lte(13.5),
  lng: z.number().gte(-82).lte(-66.8),
  contacto: z.string().trim().max(120).optional().nullable(),
  telefono: z
    .string()
    .trim()
    .min(7)
    .max(40)
    .regex(/^[0-9+()\s-]+$/, "Teléfono inválido"),
  notas: z.string().trim().max(300).optional().nullable(),
});

export const esquemaDonacionActualizacion = z.object({
  estado: z
    .enum(["disponible", "comprometida", "entregada", "cancelada"])
    .optional(),
  descripcion: z.string().trim().min(3).max(300).optional(),
  cantidad: z.string().trim().max(80).optional().nullable(),
  telefono: z
    .string()
    .trim()
    .min(7)
    .max(40)
    .regex(/^[0-9+()\s-]+$/, "Teléfono inválido")
    .optional(),
  notas: z.string().trim().max(300).optional().nullable(),
});

export const esquemaActualizacion = z.object({
  tipo: z.enum(TIPO_LUGAR_IDS as [string, ...string[]]).optional(),
  telefono: z
    .string()
    .trim()
    .max(40)
    .regex(/^[0-9+()\s-]*$/, "Teléfono inválido")
    .optional()
    .nullable(),
  horario: z.string().trim().max(120).optional().nullable(),
  notas: z.string().trim().max(500).optional().nullable(),
  estado: z.enum(["postulado", "pendiente", "verificado", "rechazado", "cerrado"]).optional(),
  motivo_rechazo: z.string().trim().max(300).optional().nullable(),
  recibe_donaciones: z.boolean().optional(),
  entrega_ayuda: z.boolean().optional(),
  acepta_mascotas: z.boolean().nullable().optional(),
  atiende: z.string().trim().max(120).optional().nullable(),
  tipos_sangre: z.string().trim().max(120).optional().nullable(),
  necesidades: z.array(esquemaNecesidad).max(20).optional(),
});

/**
 * Convocatoria tal como se publica.
 *
 * `inscritos` es un CONTADOR, no una lista: los datos de quien se ofrece a
 * ayudar son privados y solo los ve quien convoca. Publicar los teléfonos de
 * los voluntarios convertiría un acto de solidaridad en una base de contactos
 * abierta a cualquiera.
 */
export type ConvocatoriaPublica = {
  id: string;
  centro_id: string | null;
  centro_nombre: string | null;
  titulo: string;
  descripcion: string;
  ciudad_slug: string;
  ciudad_nombre: string;
  departamento: string;
  lugar_encuentro: string;
  lat: number;
  lng: number;
  inicia: string;
  termina: string;
  /** null = sin tope de personas. */
  cupo: number | null;
  inscritos: number;
  que_llevar: string | null;
  requisitos: string | null;
  con_riesgo: boolean;
  contacto: string | null;
  telefono: string | null;
  estado: "abierta" | "cancelada";
  es_demo: boolean;
  creado_en: string;
};

const fechaIso = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida");

export const esquemaConvocatoriaNueva = z
  .object({
    centro_id: z.string().uuid().optional().nullable(),
    titulo: z.string().trim().min(5).max(120),
    descripcion: z.string().trim().min(10).max(600),
    ciudad_slug: z.string().trim().min(1).max(60),
    lugar_encuentro: z.string().trim().min(5).max(200),
    lat: z.number().gte(-4.3).lte(13.5),
    lng: z.number().gte(-82).lte(-66.8),
    inicia: fechaIso,
    termina: fechaIso,
    cupo: z.number().int().positive().max(5000).optional().nullable(),
    que_llevar: z.string().trim().max(300).optional().nullable(),
    requisitos: z.string().trim().max(300).optional().nullable(),
    con_riesgo: z.boolean().optional(),
    contacto: z.string().trim().max(120).optional().nullable(),
    telefono: z
      .string()
      .trim()
      .max(40)
      .regex(/^[0-9+()\s-]*$/, "Teléfono inválido")
      .optional()
      .nullable(),
  })
  .refine((d) => Date.parse(d.termina) > Date.parse(d.inicia), {
    message: "La convocatoria no puede terminar antes de empezar",
    path: ["termina"],
  });

export const esquemaConvocatoriaActualizacion = z.object({
  titulo: z.string().trim().min(5).max(120).optional(),
  descripcion: z.string().trim().min(10).max(600).optional(),
  lugar_encuentro: z.string().trim().min(5).max(200).optional(),
  inicia: fechaIso.optional(),
  termina: fechaIso.optional(),
  cupo: z.number().int().positive().max(5000).optional().nullable(),
  que_llevar: z.string().trim().max(300).optional().nullable(),
  requisitos: z.string().trim().max(300).optional().nullable(),
  con_riesgo: z.boolean().optional(),
  telefono: z
    .string()
    .trim()
    .max(40)
    .regex(/^[0-9+()\s-]*$/, "Teléfono inválido")
    .optional()
    .nullable(),
  estado: z.enum(["abierta", "cancelada"]).optional(),
})
  // Al editar, las fechas pueden venir sueltas: solo se comparan si llegan
  // las dos. Si viene una sola, el CHECK de la base es el que queda como
  // última defensa — y su error se traduce abajo, en la ruta.
  .refine(
    (d) =>
      !d.inicia ||
      !d.termina ||
      Date.parse(d.termina) > Date.parse(d.inicia),
    {
      message: "La convocatoria no puede terminar antes de empezar",
      path: ["termina"],
    }
  );

export const esquemaInscripcion = z.object({
  nombre: z.string().trim().min(2).max(120),
  telefono: z
    .string()
    .trim()
    .min(7)
    .max(40)
    .regex(/^[0-9+()\s-]+$/, "Teléfono inválido"),
  nota: z.string().trim().max(200).optional().nullable(),
});

/**
 * Profesional tal como se publica.
 *
 * `telefono` viene en null cuando la persona eligió no publicarlo; en ese caso
 * `contacto_por_equipo` es true y la interfaz explica que el contacto se
 * coordina a través del equipo. El número existe en la base, pero no sale.
 */
export type ProfesionalPublico = {
  id: string;
  nombre: string;
  profesion: string;
  registro: string | null;
  descripcion: string;
  modalidad: "presencial" | "remoto" | "ambas";
  ciudad_slug: string | null;
  ciudad_nombre: string | null;
  departamento: string | null;
  disponibilidad: string | null;
  telefono: string | null;
  contacto_por_equipo: boolean;
  email: string | null;
  estado: "pendiente" | "verificado" | "cerrado";
  es_demo: boolean;
  creado_en: string;
};

export const esquemaProfesionalNuevo = z.object({
  nombre: z.string().trim().min(3).max(120),
  profesion: z.enum(PROFESION_IDS as [string, ...string[]]),
  registro: z.string().trim().max(60).optional().nullable(),
  descripcion: z.string().trim().min(10).max(600),
  modalidad: z.enum(MODALIDAD_IDS as [string, ...string[]]).default("ambas"),
  ciudad_slug: z.string().trim().max(60).optional().nullable(),
  disponibilidad: z.string().trim().max(200).optional().nullable(),
  telefono: z
    .string()
    .trim()
    .min(7)
    .max(40)
    .regex(/^[0-9+()\s-]+$/, "Teléfono inválido"),
  telefono_publico: z.boolean().default(false),
  email: z.string().trim().email("Correo inválido").max(120).optional().nullable(),
});

export const esquemaProfesionalActualizacion = z.object({
  descripcion: z.string().trim().min(10).max(600).optional(),
  modalidad: z.enum(MODALIDAD_IDS as [string, ...string[]]).optional(),
  disponibilidad: z.string().trim().max(200).optional().nullable(),
  telefono: z
    .string()
    .trim()
    .min(7)
    .max(40)
    .regex(/^[0-9+()\s-]+$/, "Teléfono inválido")
    .optional(),
  telefono_publico: z.boolean().optional(),
  email: z.string().trim().email("Correo inválido").max(120).optional().nullable(),
  registro: z.string().trim().max(60).optional().nullable(),
  estado: z.enum(["pendiente", "verificado", "cerrado"]).optional(),
});

/**
 * Aviso de la portada. Sin la columna `imagen`: el binario nunca viaja en el
 * JSON, se pide por su propia ruta. `tiene_imagen` es lo único que hace falta
 * saber para decidir si se pinta.
 */
export type NoticiaPublica = {
  id: string;
  titulo: string;
  cuerpo: string | null;
  enlace: string | null;
  enlace_texto: string | null;
  urgente: boolean;
  activa: boolean;
  vence_en: string | null;
  orden: number;
  creado_en: string;
  /**
   * Versiona la URL de la imagen. La imagen se cachea un año como inmutable,
   * pero SÍ puede cambiar: el editor permite reemplazarla. Sin versión, quien
   * ya vio la URL se queda con la foto vieja —o con el hueco de cuando no
   * había— durante un año.
   */
  actualizado_en: string;
  tiene_imagen: boolean;
};

/**
 * URL de la imagen de un aviso, versionada para que la caché no la congele.
 *
 * Con `ancho` devuelve la miniatura, que es lo que se pinta en un aviso
 * plegado: el afiche entero son ~130 KB y la miniatura unos 4 KB. Los anchos
 * admitidos son los de `ANCHOS` en la ruta; cualquier otro se ignora y se
 * sirve la imagen original.
 */
export function urlImagenNoticia(
  n: { id: string; actualizado_en: string },
  ancho?: 96 | 160 | 320
): string {
  return (
    `/api/noticias/${n.id}/imagen?v=${Date.parse(n.actualizado_en)}` +
    (ancho ? `&ancho=${ancho}` : "")
  );
}
