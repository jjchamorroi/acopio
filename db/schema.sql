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

-- A quién atiende y cuánta gente: "80 adultos mayores", "12 familias",
-- "un colegio con 300 niños". En una institución que necesita ayuda para sí
-- misma esto es lo que permite priorizar, y es la diferencia entre un donante
-- que entiende a dónde va lo suyo y uno que solo ve un punto en el mapa.
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS atiende text;

-- Qué tipos de sangre piden. Texto libre y no una lista cerrada: un
-- hemocentro dice "urgente O negativo" y otro "todos los tipos", y forzarlos
-- a un catálogo haría perder ese matiz justo donde importa.
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS tipos_sangre text;

-- Un aviso corto y destacado, por encima de todo lo demás. Nace de los datos
-- oficiales de Manizales: "la Alcaldía pidió NO llevar alimentos por ahora".
-- Eso no es una nota al pie —cambia por completo si vale la pena ir— y
-- enterrarlo entre las notas equivale a no publicarlo.
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS alerta text;

-- Qué NO recibe, en texto libre separado por " · ". Evita el viaje perdido:
-- casi todos los acopios rechazan medicamentos, perecederos y ropa usada, y
-- quien llega con eso se devuelve con la carga puesta.
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS no_recibe text;

-- De dónde salió el dato cuando no lo publicó quien administra el lugar.
-- "Verificado" en este sitio significa que alguien del equipo llamó; un lugar
-- tomado de prensa no lo está, pero decir de qué medio viene y enlazar la nota
-- permite que cualquiera compruebe por su cuenta en vez de creernos.
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS fuente_nombre text,
  ADD COLUMN IF NOT EXISTS fuente_url text,
  ADD COLUMN IF NOT EXISTS fuente_fecha date;

-- El punto es el del municipio, no el de la puerta.
--
-- Muchas alcaldías anunciaron albergues sin publicar dirección exacta (los 6
-- de Pereira, con ~480 personas alojadas, entre ellos). Dejarlos fuera del
-- mapa los vuelve invisibles; ponerlos sin avisar manda gente a una esquina
-- equivocada. Se publican con el centro del municipio y este marcador, que la
-- tarjeta muestra para que nadie salga de casa creyendo que tiene la dirección.
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS ubicacion_aproximada boolean NOT NULL DEFAULT false;

-- Identificador estable del lote del que vino un lugar importado.
--
-- Sin esto, volver a correr la importación duplicaría los 76 registros, y en
-- una emergencia el lote se rehace cada día. Con él, la segunda corrida
-- ACTUALIZA lo que cambió y no toca nada más. Es NULL en todo lo que registró
-- gente por el formulario, así que el índice es parcial.
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS origen_id text;

CREATE UNIQUE INDEX IF NOT EXISTS centro_acopio_origen_id_idx
  ON centro_acopio (origen_id) WHERE origen_id IS NOT NULL;

-- "Una persona curó esta ficha; el lote la complementa pero no la pisa."
--
-- Nace de un error real: se fusionaron tres fichas del mismo acopio a mano
-- —teléfono, horario y catorce necesidades— y el siguiente lote lo borró todo,
-- porque el UPDATE del upsert sobrescribe con lo que traiga el lote, incluidos
-- los nulos. Con esta marca el importador conserva el contacto y FUSIONA las
-- necesidades en vez de reemplazarlas.
ALTER TABLE centro_acopio
  ADD COLUMN IF NOT EXISTS edicion_manual boolean NOT NULL DEFAULT false;

-- El constraint se recrea cuando aparece un tipo nuevo. Sin esto, una base ya
-- desplegada rechazaría el tipo aunque el código lo soporte. Se compara contra
-- el último añadido.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'centro_acopio_tipo_check'
       AND pg_get_constraintdef(oid) NOT LIKE '%comedor%'
  ) THEN
    ALTER TABLE centro_acopio DROP CONSTRAINT centro_acopio_tipo_check;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'centro_acopio_tipo_check'
  ) THEN
    ALTER TABLE centro_acopio ADD CONSTRAINT centro_acopio_tipo_check
      CHECK (tipo IN ('acopio', 'recoleccion', 'albergue', 'animales',
                      'institucion', 'sangre', 'comedor'));
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
-- Historial de cambios de cada lugar.
--
-- El enlace privado de un acopio se reenvía por WhatsApp con facilidad, así
-- que cualquiera que lo tenga puede editar. La respuesta no es quitarle la
-- edición al acopio —si cada cambio dependiera de un administrador, la
-- información iría siempre horas atrasada, y un dato viejo en un mapa de
-- emergencia manda gente a donde ya no hace falta— sino poder DESHACER.
--
-- Se guarda la instantánea COMPLETA anterior, no las diferencias campo por
-- campo: revertir se vuelve "escribir esto de nuevo", sin lógica que pueda
-- equivocarse al reconstruir un estado a partir de parches encadenados.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cambio (
  id         bigserial PRIMARY KEY,
  centro_id  uuid NOT NULL REFERENCES centro_acopio(id) ON DELETE CASCADE,
  -- Quién lo hizo: el propio lugar con su enlace, o el equipo desde /admin.
  autor      text NOT NULL CHECK (autor IN ('acopio', 'admin')),
  -- Descripción legible, para que el panel no tenga que interpretar el jsonb.
  resumen    text NOT NULL,
  -- Estado previo completo. Es lo que se reescribe al revertir.
  anterior   jsonb NOT NULL,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cambio_centro_idx
  ON cambio (centro_id, creado_en DESC);

-- ---------------------------------------------------------------------------
-- FASE 2 — Donaciones ofrecidas por particulares.
--
-- PRIVACIDAD, que acá es lo importante:
--
-- Guardamos la ubicación exacta (lat/lng) y una desplazada al azar unos 300 m
-- (lat_aprox/lng_aprox). Las consultas públicas seleccionan ÚNICAMENTE las
-- aproximadas, así que la dirección real no puede escaparse por un endpoint
-- mal escrito: no está en el SELECT. La dirección exacta no se publica nunca;
-- se coordina por teléfono.
--
-- Sin esto, el mapa sería un catálogo de casas con cosas de valor adentro,
-- publicado justo cuando media ciudad está vacía. El desplazamiento se calcula
-- una sola vez al insertar y se guarda: si se recalculara en cada consulta, el
-- punto bailaría y bastaría con pedir la misma donación varias veces para
-- triangular el centro real.
--
-- El teléfono SÍ es público, y el formulario lo advierte antes de enviarlo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donacion (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria        text NOT NULL,
  descripcion      text NOT NULL,
  cantidad         text,
  ciudad_slug      text NOT NULL REFERENCES ciudad(slug),

  -- Privada. Nunca se expone en un endpoint público.
  lat              double precision NOT NULL,
  lng              double precision NOT NULL,

  -- Pública: la anterior desplazada al azar.
  lat_aprox        double precision NOT NULL,
  lng_aprox        double precision NOT NULL,
  geom_aprox       geography(Point, 4326)
                     GENERATED ALWAYS AS
                     (ST_SetSRID(ST_MakePoint(lng_aprox, lat_aprox), 4326)::geography) STORED,

  contacto         text,
  telefono         text NOT NULL,
  notas            text,

  estado           text NOT NULL DEFAULT 'disponible'
                     CHECK (estado IN ('disponible', 'comprometida', 'entregada', 'cancelada')),

  -- Una donación vieja es peor que ninguna: manda a alguien a buscar algo que
  -- ya no está. A la semana deja de aparecer sola.
  vence_en         timestamptz NOT NULL DEFAULT now() + interval '7 days',

  es_demo          boolean NOT NULL DEFAULT false,
  admin_token_hash text NOT NULL,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS donacion_geom_idx ON donacion USING GIST (geom_aprox);
CREATE INDEX IF NOT EXISTS donacion_categoria_idx ON donacion (categoria, estado);
CREATE INDEX IF NOT EXISTS donacion_ciudad_idx ON donacion (ciudad_slug);
CREATE INDEX IF NOT EXISTS donacion_vigencia_idx ON donacion (vence_en) WHERE estado = 'disponible';

-- ---------------------------------------------------------------------------
-- CONVOCATORIAS DE VOLUNTARIOS
--
-- Una donación es un ESTADO ("necesito agua", indefinido); un voluntariado es
-- un EVENTO: pasa mañana de 6 a 2 y hacen falta diez personas. Modelarlo como
-- una necesidad más habría perdido lo único que moviliza a alguien —cuándo,
-- dónde y para qué—, así que va en su propia tabla.
--
-- centro_id es opcional: una convocatoria puede colgar de un lugar ya
-- registrado —y heredar su verificación— o ser suelta, en una cuadra o un
-- punto de encuentro que no es un lugar del mapa.
--
-- La ubicación va exacta y sin difuminar, al revés que en las donaciones:
-- acá el punto ES el sitio de encuentro público al que hay que llegar, no la
-- casa de nadie.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS convocatoria (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id        uuid REFERENCES centro_acopio(id) ON DELETE SET NULL,

  titulo           text NOT NULL,
  descripcion      text NOT NULL,

  ciudad_slug      text NOT NULL REFERENCES ciudad(slug),
  lugar_encuentro  text NOT NULL,
  lat              double precision NOT NULL,
  lng              double precision NOT NULL,
  geom             geography(Point, 4326)
                     GENERATED ALWAYS AS
                     (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED,

  inicia           timestamptz NOT NULL,
  termina          timestamptz NOT NULL,

  -- NULL = sin tope. Con tope, el contador evita que lleguen doscientas
  -- personas a un trabajo para diez, que hay que alimentar y coordinar.
  cupo             int CHECK (cupo IS NULL OR cupo > 0),

  -- Qué llevar. No es un detalle: quien llega sin agua, guantes ni almuerzo
  -- deja de ser ayuda y pasa a ser alguien más a quien cuidar.
  que_llevar       text,
  requisitos       text,

  -- Trabajo con riesgo (escombros, estructuras dañadas). Dispara una
  -- advertencia visible: el voluntariado espontáneo en edificios colapsados
  -- lesiona gente y estorba a los rescatistas profesionales.
  con_riesgo       boolean NOT NULL DEFAULT false,

  contacto         text,
  telefono         text,

  estado           text NOT NULL DEFAULT 'abierta'
                     CHECK (estado IN ('abierta', 'cancelada')),

  es_demo          boolean NOT NULL DEFAULT false,
  admin_token_hash text NOT NULL,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now(),

  CHECK (termina > inicia)
);

CREATE INDEX IF NOT EXISTS convocatoria_geom_idx ON convocatoria USING GIST (geom);
CREATE INDEX IF NOT EXISTS convocatoria_ciudad_idx ON convocatoria (ciudad_slug);
CREATE INDEX IF NOT EXISTS convocatoria_vigencia_idx
  ON convocatoria (termina) WHERE estado = 'abierta';

-- ---------------------------------------------------------------------------
-- Quién se apuntó.
--
-- Los datos de la persona son PRIVADOS: en público solo se publica el número.
-- Quien convoca ve la lista para poder llamar; nadie más. Publicar los
-- teléfonos de quienes se ofrecen a ayudar sería convertir un acto de
-- solidaridad en una base de datos de contactos abierta.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inscripcion (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  convocatoria_id uuid NOT NULL REFERENCES convocatoria(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  telefono        text NOT NULL,
  nota            text,
  estado          text NOT NULL DEFAULT 'confirmada'
                    CHECK (estado IN ('confirmada', 'cancelada')),
  -- Para que la persona pueda darse de baja sin crear cuenta.
  token_hash      text NOT NULL,
  creado_en       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inscripcion_convocatoria_idx
  ON inscripcion (convocatoria_id, estado);

-- ---------------------------------------------------------------------------
-- PROFESIONALES QUE OFRECEN SUS SERVICIOS
--
-- Médicos, enfermeros, psicólogos, veterinarios, trabajadores sociales.
-- Es lo más delicado que publica este sitio: un acopio equivocado hace perder
-- un viaje, pero alguien que dice ser psicólogo sin serlo hace daño real —la
-- atención psicológica improvisada tras un desastre empeora el trauma— y un
-- falso médico puede matar.
--
-- De ahí tres decisiones:
--
-- 1. `registro` guarda la tarjeta profesional o el ReTHUS y SE PUBLICA. No lo
--    verificamos nosotros, no podemos; publicarlo permite que cualquiera lo
--    consulte en el registro oficial. Convierte "confíen en mí" en algo
--    comprobable.
--
-- 2. Nacen 'pendiente'. El sello solo lo pone el equipo tras confirmar.
--
-- 3. NO tienen coordenadas ni salen en el mapa. Un acopio es una dirección
--    pública; una persona no. Con la ciudad y la modalidad alcanza para
--    coordinar, y así no publicamos dónde vive nadie.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profesional (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           text NOT NULL,
  profesion        text NOT NULL,
  -- Tarjeta profesional / ReTHUS. Se publica para que sea verificable.
  registro         text,
  descripcion      text NOT NULL,

  modalidad        text NOT NULL DEFAULT 'ambas'
                     CHECK (modalidad IN ('presencial', 'remoto', 'ambas')),
  -- Opcional: quien atiende solo en remoto no tiene por qué decir dónde vive.
  ciudad_slug      text REFERENCES ciudad(slug),
  disponibilidad   text,

  telefono         text NOT NULL,
  -- Lo decide cada quien. Un psicólogo con el número abierto puede recibir
  -- llamadas a las 3 a.m. y quemarse en una semana; obligarlo a publicarlo
  -- ahuyenta justo a quien más falta hace.
  telefono_publico boolean NOT NULL DEFAULT false,
  email            text,

  estado           text NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'verificado', 'cerrado')),
  es_demo          boolean NOT NULL DEFAULT false,
  admin_token_hash text NOT NULL,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profesional_profesion_idx ON profesional (profesion, estado);
CREATE INDEX IF NOT EXISTS profesional_ciudad_idx ON profesional (ciudad_slug);

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
  ('istmina',      'Istmina',      'Chocó',           5.1594,  -76.6844, 3),

  -- Ciudades NO afectadas, pero donde están los acopios que recogen para
  -- mandar a la zona. Al revisar las guías de acopios publicadas quedó claro
  -- que la mayoría de puntos de recepción están acá: sin estas ciudades la
  -- aplicación no le puede decir a alguien en Bogotá dónde dejar lo suyo.
  ('bogota',       'Bogotá',       'Cundinamarca',    4.7110,  -74.0721, 4),
  ('barranquilla', 'Barranquilla', 'Atlántico',      10.9685,  -74.7813, 4),
  ('bucaramanga',  'Bucaramanga',  'Santander',       7.1193,  -73.1227, 4)
ON CONFLICT (slug) DO NOTHING;
