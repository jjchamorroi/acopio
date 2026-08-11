import { z } from "zod";
import { CATEGORIA_IDS, NIVEL_IDS } from "./categorias";

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

export const esquemaActualizacion = z.object({
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
  necesidades: z.array(esquemaNecesidad).max(20).optional(),
});
