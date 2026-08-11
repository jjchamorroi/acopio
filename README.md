# Red de Acopio — sismo Colombia, 10 de agosto de 2026

Mapa colaborativo de centros de acopio y de **lo que cada uno necesita hoy**.
La idea es simple: que quien tiene algo para donar sepa, antes de salir de la
casa, a qué acopio llevarlo — y que ningún acopio reciba cinco toneladas de
ropa usada cuando lo que le falta es agua.

## Estado

**MVP — Fase 1 de 3.** Funciona el mapa, el registro de acopios y el panel
para que cada acopio actualice sus necesidades.

- [x] Mapa público con filtro por ciudad y por lo que querés donar
- [x] Registro de acopios sin cuenta (enlace privado con token)
- [x] Panel del acopio: actualizar necesidades, horario, teléfono, cerrar
- [x] Panel interno para verificar acopios
- [x] Consulta geoespacial "acopios cerca de mí" (`GET /api/cercanos`)
- [ ] **Fase 2** — donantes: publicar qué tenés para donar y dónde
- [ ] **Fase 3** — voluntarios: rutas de recolección (recoger de A → llevar a B)

La consulta de cercanía ya está lista porque es la pieza sobre la que se monta
todo lo demás; la interfaz de donante y voluntario va encima de ella.

## Stack

| Pieza | Qué se usó | Por qué |
|---|---|---|
| Framework | Next.js 15 (App Router) | Un solo repo para front y API |
| Base de datos | PostgreSQL + PostGIS | Índice geoespacial real, no Haversine a mano |
| Acceso a datos | `node-postgres` con SQL plano | PostGIS y los ORM se llevan mal; acá el SQL es el punto |
| Mapa | Leaflet + OpenStreetMap | Sin API key, sin costo, sin límite de peticiones |
| Estilos | Tailwind v4 | |

## Correr en local

Solo necesitás **Docker**. Ni Node ni Postgres instalados en la máquina.

```bash
cp .env.example .env                 # y poné un ADMIN_TOKEN cualquiera
docker compose up -d --build         # base + aplicación
```

Abrí <http://localhost:3000>. Listo.

El esquema **se aplica solo**: `db/schema.sql` está montado en el
`/docker-entrypoint-initdb.d/` del contenedor de Postgres, así que se ejecuta
al crear el volumen. No hay paso de migración manual la primera vez.

Para ver la interfaz con contenido:

```bash
docker compose exec -T db psql -U acopio -d acopio -f /sql/demo.sql
```

Los acopios de prueba se llaman `[PRUEBA] …` y la interfaz los marca como tales.
**Borralos antes de publicar** — un acopio inventado que parece real manda gente
a una dirección que no existe:

```bash
docker compose exec -T db psql -U acopio -d acopio -f /sql/demo-borrar.sql
```

El panel interno queda en `/admin` y entra con el `ADMIN_TOKEN` del `.env`.

### Comandos

Si tenés Node, hay atajos en `package.json` (`npm run docker:up`,
`docker:logs`, `docker:demo`, `docker:psql`…). Si no, los equivalentes directos:

| Qué querés | Comando |
|---|---|
| Levantar todo | `docker compose up -d --build` |
| Ver los logs de la app | `docker compose logs -f web` |
| Estado de los contenedores | `docker compose ps` |
| Entrar a la base | `docker compose exec db psql -U acopio -d acopio` |
| Bajar todo | `docker compose down` |
| Bajar y **borrar la base** | `docker compose down -v` |
| Reconstruir tras cambiar código | `docker compose up -d --build` |

La base también queda expuesta en `localhost:5433` por si querés conectarte con
DBeaver o similar (usuario, clave y base: `acopio`).

> **Si usás Git Bash**, antepone la ruta de instalación de Git a los argumentos
> que empiezan con `/`, y `-f /sql/demo.sql` se convierte en
> `C:/Program Files/Git/sql/demo.sql`. Se desactiva con `MSYS_NO_PATHCONV=1`:
>
> ```bash
> MSYS_NO_PATHCONV=1 docker compose exec -T db psql -U acopio -d acopio -f /sql/demo.sql
> ```
>
> Desde PowerShell, cmd o los `npm run docker:*` no pasa: es solo Git Bash.

### Desarrollar dentro de Docker

Con recarga en caliente: editás en Windows y el contenedor recompila solo.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Cambios en el esquema

`/docker-entrypoint-initdb.d/` solo corre la primera vez que se crea el volumen.
Si tocás `db/schema.sql` después, aplicalo a mano:

```bash
docker compose exec -T db psql -U acopio -d acopio -f /sql/schema.sql
```

Es idempotente (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), así que
repetirlo no rompe nada.

## Desplegar en Dokploy

1. **Base de datos** → *Create Database* → PostgreSQL, cambiando la imagen a
   `postgis/postgis:16-3.4`. Sin PostGIS, `npm run db:setup` falla.
2. **Aplicación** → *Create Application* → conectá el repo de Git.
   Build type: **Dockerfile** (ya está en la raíz).
3. **Variables de entorno** de la aplicación:
   ```
   DATABASE_URL=<la connection string interna que da Dokploy>
   ADMIN_TOKEN=<algo largo y aleatorio>
   ```
   Generá el token con:
   `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
4. **Dominio** → agregá el tuyo y activá *HTTPS / Let's Encrypt*.
5. **Deploy**. En Dokploy la base se crea sin montar `initdb.d`, así que ahí sí
   hay que aplicar el esquema una vez, desde la terminal del contenedor `web`:
   ```bash
   node scripts/run-sql.mjs db/schema.sql
   ```
   Es idempotente: repetilo en cada despliegue que toque el esquema.
6. Activá el **webhook de despliegue automático** para que cada push salga solo.

## Decisiones que conviene no deshacer

**Las categorías son una lista cerrada** (`src/lib/categorias.ts`). Si cada
acopio escribe en texto libre lo que necesita, "agua" / "agüita" / "botellones"
no se cruzan entre sí y se pierde el emparejamiento, que es todo el valor de
la aplicación.

**Los acopios nacen `pendiente`, no `verificado`.** Un acopio falso desvía
ayuda real. Se muestran igual en el mapa —porque en emergencia la información
imperfecta y rápida vale más que la perfecta y tardía— pero marcados, y con el
aviso de llamar antes de ir.

**Solo el admin puede verificar.** Si el propio responsable pudiera marcarse
como verificado, el sello no significaría nada.

**De los tokens guardamos solo el hash SHA-256.** Si se filtra la base, nadie
puede editar acopios ajenos.

**Decir qué *sobra* es tan importante como decir qué falta.** Es lo que permite
redistribuir excedentes entre acopios en vez de acumularlos.

## Pendientes antes de abrirlo al público

- [ ] Límite de peticiones en `POST /api/acopios` (hoy cualquiera puede
      registrar acopios en bucle). Lo más simple: un contador por IP en la
      misma base, o el rate limit de Traefik desde Dokploy.
- [ ] Captcha o verificación por SMS en el registro
- [ ] Borrar los datos de prueba (`npm run db:demo -- --borrar`)
- [ ] Backups automáticos de la base (Dokploy los tiene hacia S3)
- [ ] Contrastar con las fuentes oficiales (UNGRD, Cruz Roja, Defensa Civil)
      para no duplicar ni contradecir la información de los organismos

## Aviso

Proyecto ciudadano, sin ánimo de lucro y sin relación con ningún organismo
oficial. La información la aporta la comunidad y puede estar desactualizada.
En emergencia, la línea oficial es el **123**.
