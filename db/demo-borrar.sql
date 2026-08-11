-- Elimina todos los acopios de prueba. Correr antes de salir a producción.
-- Las necesidades caen solas por el ON DELETE CASCADE.
DELETE FROM centro_acopio WHERE es_demo = true;
