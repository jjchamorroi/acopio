-- Acopios DE MENTIRA para poder ver la interfaz funcionando.
--
-- Son inventados a propósito y quedan marcados con es_demo = true, lo que hace
-- que la aplicación los muestre con un aviso de "dato de prueba". Nunca
-- inventamos acopios que parezcan reales: alguien podría manejar dos horas con
-- el carro lleno hasta una dirección que no existe.
--
-- Aplicar:  npm run db:demo      |  docker compose exec -T db psql -U acopio -d acopio -f /sql/demo.sql
-- Borrar:   npm run db:demo:borrar
--
-- El token de edición de todos ellos es literalmente "demo", para poder entrar
-- al panel de cualquiera durante las pruebas. Por eso son solo de prueba.

INSERT INTO centro_acopio
  (id, nombre, direccion, ciudad_slug, lat, lng, responsable, telefono,
   horario, estado, es_demo, admin_token_hash,
   tipo, recibe_donaciones, entrega_ayuda, acepta_mascotas)
VALUES
  ('11111111-1111-4111-8111-111111111111',
   '[PRUEBA] Coliseo municipal',
   'Dirección de ejemplo, no es un acopio real',
   'pereira', 4.8143, -75.6951, 'Responsable de prueba', '000 000 0000',
   '8:00 a.m. - 6:00 p.m.', 'verificado', true,
   encode(digest('demo', 'sha256'), 'hex'),
   'acopio', true, false, NULL),

  ('22222222-2222-4222-8222-222222222222',
   '[PRUEBA] Parroquia del barrio',
   'Dirección de ejemplo, no es un acopio real',
   'pereira', 4.8072, -75.7015, 'Responsable de prueba', '000 000 0000',
   '24 horas', 'pendiente', true,
   encode(digest('demo', 'sha256'), 'hex'),
   'recoleccion', true, false, NULL),

  ('33333333-3333-4333-8333-333333333333',
   '[PRUEBA] Centro comunitario',
   'Dirección de ejemplo, no es un acopio real',
   'manizales', 5.0693, -75.5168, 'Responsable de prueba', '000 000 0000',
   '7:00 a.m. - 8:00 p.m.', 'verificado', true,
   encode(digest('demo', 'sha256'), 'hex'),
   'acopio', true, false, NULL),

  -- Albergue que SÍ recibe mascotas.
  ('44444444-4444-4444-8444-444444444444',
   '[PRUEBA] Coliseo cubierto',
   'Dirección de ejemplo, no es un albergue real',
   'armenia', 4.5359, -75.6791, 'Responsable de prueba', '000 000 0000',
   '24 horas', 'verificado', true,
   encode(digest('demo', 'sha256'), 'hex'),
   'albergue', true, true, true),

  -- Albergue que NO puede recibirlas: el contraste hace visible el dato.
  ('66666666-6666-4666-8666-666666666666',
   '[PRUEBA] Colegio del centro',
   'Dirección de ejemplo, no es un albergue real',
   'pereira', 4.8180, -75.6890, 'Responsable de prueba', '000 000 0000',
   '24 horas', 'verificado', true,
   encode(digest('demo', 'sha256'), 'hex'),
   'albergue', true, true, false),

  -- Albergue que todavía no informó: tercer estado.
  ('77777777-7777-4777-8777-777777777777',
   '[PRUEBA] Polideportivo',
   'Dirección de ejemplo, no es un albergue real',
   'manizales', 5.0730, -75.5100, 'Responsable de prueba', '000 000 0000',
   NULL, 'pendiente', true,
   encode(digest('demo', 'sha256'), 'hex'),
   'albergue', true, true, NULL),

  ('88888888-8888-4888-8888-888888888888',
   '[PRUEBA] Veterinaria de emergencia',
   'Dirección de ejemplo, no es un lugar real',
   'pereira', 4.8095, -75.6930, 'Responsable de prueba', '000 000 0000',
   '7:00 a.m. - 9:00 p.m.', 'verificado', true,
   encode(digest('demo', 'sha256'), 'hex'),
   'animales', true, true, true),

  ('55555555-5555-4555-8555-555555555555',
   '[PRUEBA] Casa de la cultura',
   'Dirección de ejemplo, no es un acopio real',
   'quibdo', 5.6937, -76.6601, 'Responsable de prueba', '000 000 0000',
   '6:00 a.m. - 6:00 p.m.', 'verificado', true,
   encode(digest('demo', 'sha256'), 'hex'),
   'acopio', true, false, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO necesidad (centro_id, categoria, nivel, detalle) VALUES
  ('11111111-1111-4111-8111-111111111111', 'agua',         'urgente',  'Botellón y bolsa'),
  ('11111111-1111-4111-8111-111111111111', 'bebe',         'urgente',  'Pañales etapa 3 y 4'),
  ('11111111-1111-4111-8111-111111111111', 'dormir',       'necesita', NULL),
  ('11111111-1111-4111-8111-111111111111', 'ropa',         'sobra',    'Ya no reciben ropa usada'),

  ('22222222-2222-4222-8222-222222222222', 'alimentos',    'urgente',  'Enlatados y arroz'),
  ('22222222-2222-4222-8222-222222222222', 'aseo',         'necesita', NULL),
  ('22222222-2222-4222-8222-222222222222', 'mascotas',     'necesita', NULL),

  ('33333333-3333-4333-8333-333333333333', 'medicamentos', 'urgente',  'Suero, gasas, analgésicos'),
  ('33333333-3333-4333-8333-333333333333', 'energia',      'urgente',  'Linternas y pilas AA'),
  ('33333333-3333-4333-8333-333333333333', 'carpas',       'necesita', NULL),
  ('33333333-3333-4333-8333-333333333333', 'agua',         'sobra',    'Tienen excedente para ceder'),

  ('44444444-4444-4444-8444-444444444444', 'dormir',       'urgente',  'Colchonetas, están durmiendo en el piso'),
  ('44444444-4444-4444-8444-444444444444', 'mascotas',     'urgente',  'Reciben animales y no tienen con qué alimentarlos'),
  ('44444444-4444-4444-8444-444444444444', 'aseo',         'necesita', NULL),

  ('66666666-6666-4666-8666-666666666666', 'dormir',       'urgente',  NULL),
  ('66666666-6666-4666-8666-666666666666', 'alimentos',    'necesita', NULL),

  ('77777777-7777-4777-8777-777777777777', 'agua',         'urgente',  NULL),
  ('77777777-7777-4777-8777-777777777777', 'herramientas', 'necesita', 'Palas y carretillas'),

  ('88888888-8888-4888-8888-888888888888', 'veterinario',  'urgente',  'Suero, vendas, antiparasitarios'),
  ('88888888-8888-4888-8888-888888888888', 'guacales',     'urgente',  'Para trasladar animales rescatados'),
  ('88888888-8888-4888-8888-888888888888', 'mascotas',     'necesita', NULL),

  ('55555555-5555-4555-8555-555555555555', 'agua',         'urgente',  'Es lo más crítico'),
  ('55555555-5555-4555-8555-555555555555', 'alimentos',    'urgente',  NULL),
  ('55555555-5555-4555-8555-555555555555', 'bebe',         'necesita', NULL)
ON CONFLICT (centro_id, categoria) DO NOTHING;
