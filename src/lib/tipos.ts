import { z } from "zod";
import { CATEGORIA_IDS, NIVEL_IDS } from "./categorias";
import { TIPO_LUGAR_IDS } from "./tipos-lugar";

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
  tipo: "acopio" | "recoleccion" | "albergue" | "animales" | "institucion";
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
  estado: "pendiente" | "verificado" | "cerrado";
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
  estado: z.enum(["pendiente", "verificado", "cerrado"]).optional(),
  recibe_donaciones: z.boolean().optional(),
  entrega_ayuda: z.boolean().optional(),
  acepta_mascotas: z.boolean().nullable().optional(),
  atiende: z.string().trim().max(120).optional().nullable(),
  necesidades: z.array(esquemaNecesidad).max(20).optional(),
});
