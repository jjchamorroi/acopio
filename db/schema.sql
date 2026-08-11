-- Esquema de la Red de Acopio.
-- Idempotente: se puede correr varias veces sin romper nada (npm run db:setup).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Ciudades afectadas. Sirven para el selector y para centrar el mapa.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciudad (
  slug         text PRIMARY KEY,
  nombre       text NOT NULL,
  departamento text NOT NULL,
  lat          double precision NOT NULL,
  lng          double precision NOT NULL,
  -- Prioridad de despliegue en la lista: 1 = más afectada.
  prioridad    int NOT NULL DEFAULT 5
);

-- ---------------------------------------------------------------------------
-- Centros de acopio.
--
-- estado:
--   pendiente  -> lo registró alguien, todavía nadie lo confirmó. Se muestra
--                 en el mapa pero marcado como SIN VERIFICAR.
--   verificado -> alguien llamó y confirmó que existe y está recibiendo.
--   cerrado    -> ya no recibe. Se oculta del mapa por defecto.
--
-- admin_token_hash: sha256 del token que se le entrega al responsable del
-- acopio para que actualice sus necesidades sin necesidad de crear cuenta.
-- Guardamos solo el hash: si se filtra la base, los tokens no sirven.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS centro_acopio (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           text NOT NULL,
  direccion        text NOT NULL,
  ciudad_slug      text NOT NULL REFERENCES ciudad(slug),
  lat              double precision NOT NULL,
  lng              double precision NOT NULL,
  geom             geography(Point, 4326)
                     GENERATED ALWAYS AS
                     (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED,
  responsable      text,
  telefono         text,
  horario          text,
  notas            text,
  estado           text NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'verificado', 'cerrado')),
  es_demo          boolean NOT NULL DEFAULT false,
  admin_token_hash text NOT NULL,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now()
);

-- Índice geoespacial: hace que "acopios a menos de N km de aquí" sea instantáneo
-- incluso con decenas de miles de registros.
CREATE INDEX IF NOT EXISTS centro_acopio_geom_idx ON centro_acopio USING GIST (geom);
CREATE INDEX IF NOT EXISTS centro_acopio_ciudad_idx ON centro_acopio (ciudad_slug);
CREATE INDEX IF NOT EXISTS centro_acopio_estado_idx ON centro_acopio (estado);

-- ---------------------------------------------------------------------------
-- Ampliación: la tabla dejó de ser "solo centros de acopio".
--
-- Se agrega como ALTER y no dentro del CREATE TABLE de arriba para que este
-- archivo siga sirviendo tanto en una base nueva como en una que ya está en
-- producción con datos. `ADD COLUMN IF NOT EXISTS` lo hace repetible.
--
-- tipo:
--   acopio      -> recibe y almacena donaciones
--   recoleccion -> recibe poco y lo traslada a un acopio
--   albergue    -> aloja damnificados (y también recibe donaciones)
--   animales    -> atención veterinaria y acopio para mascotas
--
-- recibe_donaciones / entrega_ayuda son los dos ejes con los que se filtra el
-- mapa ("quiero donar" contra "necesito ayuda"). Son campos propios y no algo
-- deducido del tipo porque hay excepciones reales: un albergue normalmente
-- hace las dos cosas, pero uno desbordado puede dejar de recibir donaciones
-- sin dejar de alojar gente.
-- ---------------------------------------------------------------------------
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'acopio';
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS recibe_donaciones boolean NOT NULL DEFAULT true;
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS entrega_ayuda boolean NOT NULL DEFAULT false;

-- Tres estados a propósito: true, false y NULL = "no lo informaron".
-- Mucha gente no evacúa por no abandonar a su animal, así que decir "no
-- sabemos" es información distinta —y más honesta— que decir "no reciben".
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS acepta_mascotas boolean;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'centro_acopio_tipo_check'
  ) THEN
    ALTER TABLE centro_acopio ADD CONSTRAINT centro_acopio_tipo_check
      CHECK (tipo IN ('acopio', 'recoleccion', 'albergue', 'animales'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS centro_acopio_tipo_idx ON centro_acopio (tipo);
CREATE INDEX IF NOT EXISTS centro_acopio_recibe_idx
  ON centro_acopio (recibe_donaciones) WHERE recibe_donaciones;
CREATE INDEX IF NOT EXISTS centro_acopio_entrega_idx
  ON centro_acopio (entrega_ayuda) WHERE entrega_ayuda;

-- ---------------------------------------------------------------------------
-- Qué necesita (o le sobra) cada acopio. Esto es el corazón del match:
-- permite responder "¿quién necesita agua cerca de mí?" y, más adelante,
-- "¿a qué acopio le llevo lo que acabo de recoger?".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS necesidad (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id      uuid NOT NULL REFERENCES centro_acopio(id) ON DELETE CASCADE,
  categoria      text NOT NULL,
  nivel          text NOT NULL CHECK (nivel IN ('urgente', 'necesita', 'sobra')),
  detalle        text,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  -- Un acopio no puede declarar dos veces la misma categoría.
  UNIQUE (centro_id, categoria)
);

CREATE INDEX IF NOT EXISTS necesidad_categoria_idx ON necesidad (categoria, nivel);

-- ---------------------------------------------------------------------------
-- Control de abuso: cuántas peticiones lleva cada quien en la ventana actual.
--
-- Vive en Postgres y no en memoria porque el contador tiene que sobrevivir a
-- los reinicios y a los despliegues: si se borra en cada deploy, basta con
-- esperar un redeploy para volver a tener cupo. Tampoco usamos Redis: una
-- pieza más de infraestructura para llevar tres columnas no se justifica.
--
-- `clave` NO guarda la IP sino su hash. El objetivo es contar peticiones, no
-- saber quién es la gente, y en una aplicación de emergencia conviene no
-- acumular datos que nadie necesita (Ley 1581 de 2012, habeas data).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS limite_peticion (
  clave          text PRIMARY KEY,
  ventana_inicio timestamptz NOT NULL DEFAULT now(),
  conteo         int NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS limite_peticion_ventana_idx
  ON limite_peticion (ventana_inicio);

-- ---------------------------------------------------------------------------
-- Ciudades afectadas por el sismo del 10/08/2026 (coordenadas de cabecera).
-- ---------------------------------------------------------------------------
INSERT INTO ciudad (slug, nombre, departamento, lat, lng, prioridad) VALUES
  ('pereira',      'Pereira',      'Risaralda',       4.8133,  -75.6961, 1),
  ('manizales',    'Manizales',    'Caldas',          5.0703,  -75.5138, 1),
  ('armenia',      'Armenia',      'Quindío',         4.5339,  -75.6811, 1),
  ('quibdo',       'Quibdó',       'Chocó',           5.6947,  -76.6611, 1),
  ('buenaventura', 'Buenaventura', 'Valle del Cauca', 3.8801,  -77.0312, 1),
  ('cali',         'Cali',         'Valle del Cauca', 3.4516,  -76.5320, 2),
  ('medellin',     'Medellín',     'Antioquia',       6.2442,  -75.5812, 2),
  ('dosquebradas', 'Dosquebradas', 'Risaralda',       4.8340,  -75.6740, 2),
  ('cartago',      'Cartago',      'Valle del Cauca', 4.7464,  -75.9117, 3),
  ('istmina',      'Istmina',      'Chocó',           5.1594,  -76.6844, 3)
ON CONFLICT (slug) DO NOTHING;
