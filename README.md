# Red de Acopio — sismo Colombia, 10 de agosto de 2026

Mapa colaborativo de centros de acopio y de **lo que cada uno necesita hoy**.
La idea es simple: que quien tiene algo para donar sepa, antes de salir de la
casa, a qué acopio llevarlo — y que ningún acopio reciba cinco toneladas de
ropa usada cuando lo que le falta es agua.

## Estado

**MVP — Fase 1 de 3.** Funciona el mapa, el registro de acopios y el panel
para que cada acopio actualice sus necesidades.

- [x] Mapa público con filtro por ciudad y por lo que querés donar
- [x] Registro de lugares sin cuenta (enlace privado con token)
- [x] Panel del lugar: actualizar necesidades, horario, teléfono, cerrar
- [x] Panel interno para verificar lugares
- [x] Consulta geoespacial "lugares cerca de mí" (`GET /api/cercanos`)
- [x] Límite de peticiones por IP contra el registro masivo de lugares falsos
- [x] **Cuatro tipos de lugar** y los dos públicos en un solo mapa
- [x] **Fase 2** — donantes: publicar qué tenés y a quién cerca le sirve
- [x] Compartir por WhatsApp con previsualización y cifras reales
- [ ] **Fase 3** — voluntarios: rutas de recolección (recoger de A → llevar a B)

### Privacidad de los donantes (fase 2)

De cada donación se guardan **dos ubicaciones**: la exacta y una desplazada al
azar unos 300 m. Las consultas públicas seleccionan **únicamente la
aproximada** — la exacta ni siquiera aparece en el `SELECT`, así que no puede
escaparse por un endpoint mal escrito.

El desplazamiento se calcula una sola vez, al insertar, y se guarda. Si se
recalculara en cada consulta, el punto bailaría y bastaría con pedir la misma
donación varias veces para triangular el centro real.

Sin esto, el mapa sería un catálogo de casas con cosas de valor adentro,
publicado justo cuando media ciudad está vacía. En el mapa se dibuja un
**círculo del tamaño real de la imprecisión**, no un punto: un punto sugeriría
una dirección exacta que no tenemos.

El teléfono **sí** es público —es lo que permite coordinar— y el formulario lo
advierte antes de enviar.

### Cobertura geográfica

**1.122 municipios**, todo el país, con prioridad al occidente:

| Prioridad | Qué es | Municipios |
|---|---|---|
| 1 | Foco del sismo | 5 |
| 2 | Chocó, Risaralda, Quindío, Caldas, Valle del Cauca | 119 |
| 3 | Resto del occidente: Antioquia, Cauca, Nariño, Tolima, Huila | 316 |
| 4 | Capitales del resto del país | 21 |
| 5 | Los demás municipios | 661 |

El catálogo se genera desde el volcado de GeoNames y se versiona en
`db/municipios.sql`, para que nadie tenga que bajar 2 MB para levantar el
proyecto. Para regenerarlo (la división político-administrativa no cambia en
una emergencia, así que casi nunca hace falta):

```bash
curl -o CO.zip https://download.geonames.org/export/dump/CO.zip && unzip CO.zip
node scripts/generar-municipios.mjs CO.txt
```

Dos cosas que resuelve el generador y conviene no romper:

**Municipios homónimos.** Armenia existe en Quindío y en Antioquia. El slug
lleva sufijo de departamento cuando hay repetición (`armenia` /
`armenia-antioquia`), y los trece municipios que ya estaban en la base
conservan su slug original porque hay lugares registrados que los referencian.

**Coordenadas ya revisadas.** `ON CONFLICT DO NOTHING` impide que el catálogo
pise las que estaban. La de Bogotá en GeoNames, por ejemplo, es el centroide
del distrito entero y cae en Sumapaz, a 40 km del centro.

Con 1.122 municipios, el desplegable dejó de servir: el formulario usa un
**autocompletado** contra `/api/ciudades?q=`, insensible a tildes ("quibdo"
encuentra "Quibdó"), y los filtros del mapa ofrecen **solo los municipios que
tienen lugares registrados**.

### Los dos públicos

El mapa sirve a dos personas distintas y un selector arriba decide a cuál le
habla:

| | Muestra | Tipos |
|---|---|---|
| **Quiero donar** | quien `recibe_donaciones` | acopio, recolección, albergue, animales |
| **Necesito ayuda** | quien `entrega_ayuda` | albergue, animales |

`recibe_donaciones` y `entrega_ayuda` son campos propios y no algo deducido del
tipo, porque hay excepciones reales: un albergue desbordado deja de recibir
donaciones sin dejar de alojar gente.

### Mascotas

`acepta_mascotas` tiene tres estados —`true`, `false` y `NULL`— y la interfaz
los distingue. "No informado" no es lo mismo que "no aceptan": a quien viaja con
un animal hay que decirle que llame a preguntar, no hacerle descartar el lugar.

Existe porque mucha gente no evacúa por no abandonar a su mascota. El filtro
*"que acepten mascotas"* solo devuelve los que lo confirmaron (`IS TRUE`), nunca
los que callaron.

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
| Bajar todo (los datos se conservan) | `docker compose down` |
| ⛔ Bajar y **BORRAR TODOS LOS DATOS** | `docker compose down -v` |
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

### Los datos no se pierden al reconstruir

Verificado: un lugar registrado sobrevive a `docker compose up --build`, a
`docker compose restart` y a `docker compose down` seguido de `up`. Viven en un
volumen de Docker, separado de la imagen de la aplicación, y `db/schema.sql`
—lo único que corre solo en cada arranque— no tiene una sola sentencia
`DROP`, `TRUNCATE` ni `DELETE`.

**El único comando que borra todo es `docker compose down -v`.** La `-v`
elimina el volumen. No existe forma de deshacerlo sin un respaldo.

En Railway pasa lo mismo: redesplegar la aplicación no toca la base, que es un
servicio aparte con su propio volumen. Lo que sí borraría todo es eliminar el
servicio de Postgres desde el panel.

### Respaldos

```bash
npm run db:respaldo                                  # la base local
DATABASE_URL="postgresql://…" npm run db:respaldo    # producción
```

Deja un `.sql` en `respaldos/` con ciudades, lugares, necesidades y donaciones,
incluidos los `admin_token_hash` — así los enlaces privados de cada lugar
siguen funcionando después de restaurar.

Para restaurar:

```bash
node scripts/run-sql.mjs respaldos/respaldo-XXXX.sql
```

Es **aditivo**: todo va con `ON CONFLICT DO NOTHING`, así que restaurar sobre
una base con datos no pisa nada. Se puede correr sin miedo.

Probado de punta a punta: se destruyó el volumen completo, se levantó de cero y
se restauró — volvieron los 10 municipios, los 9 lugares, las 25 necesidades y
las geometrías de PostGIS, que Postgres recalcula sola porque las columnas
generadas se excluyen del respaldo.

No usa `pg_dump` a propósito: eso exigiría instalar las herramientas de
PostgreSQL en Windows. Con Node basta.

> `respaldos/` está en `.gitignore`. Los archivos llevan teléfonos y
> ubicaciones exactas de donantes: son datos personales y no deben subirse a
> ningún repositorio ni compartirse por chat.

### Desarrollar dentro de Docker

Con recarga en caliente: editás en Windows y el contenedor recompila solo.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Cambios en el esquema

**No hay que hacer nada.** El contenedor aplica `db/schema.sql` en cada arranque
(`scripts/arrancar.mjs`), antes de levantar Next. Vale igual en local, en
Railway y en Dokploy.

Es seguro porque el archivo es idempotente —`CREATE TABLE IF NOT EXISTS`,
`ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`—, así que correrlo cien
veces da lo mismo que correrlo una.

Existe porque desplegar código nuevo contra el esquema viejo tira abajo la
aplicación entera (`column c.tipo does not exist`) y migrar dependía de que
alguien se acordara. Un paso manual que hay que recordar en cada despliegue es
un incidente esperando su turno.

Si la migración falla, el servidor **arranca igual**: un contenedor que no
levanta no muestra logs ni responde `/api/salud`, y te deja a ciegas justo
cuando necesitás diagnosticar. En ese caso el healthcheck reporta
`"esquema": "pendiente"` y el error queda escrito en los logs.

## Dónde alojarlo

Dokploy es gratis como software, pero **no incluye servidor**: hay que poner uno
(propio con Dokploy self-hosted, o el panel administrado de Dokploy Cloud a
4,50 US$/servidor al mes, que igual necesita tu VPS).

| Opción | Costo | Ojo con |
|---|---|---|
| Hetzner CX22 (2 vCPU, 4 GB) | ~4,50 €/mes | Nada. Es el camino corto. |
| Oracle Cloud Always Free (2 vCPU, 12 GB ARM) | 0 | **Es ARM** — ver abajo. Y suele dar "Out of capacity". |
| DigitalOcean 2 GB, Nueva York | ~12 US$/mes | Menos latencia desde Colombia. |

### Si el servidor es ARM

La imagen oficial `postgis/postgis` es **solo amd64**: en ARM el contenedor de
la base no levanta. Se resuelve con una variable en el `.env`, sin tocar
`docker-compose.yml`:

```bash
POSTGIS_IMAGE=imresamu/postgis:16-3.4
```

Es el mismo PostGIS compilado también para ARM, mantenido por uno de los
mantenedores de la imagen oficial. `node:22-alpine` ya es multiarquitectura,
así que la aplicación no necesita ningún cambio.

## Desplegar en Railway

La vía más corta: no hay servidor que administrar. Requiere el plan **Hobby
(5 US$/mes)** — el plan gratuito da 1 US$ de crédito mensual, que no alcanza
para tener algo prendido todo el tiempo.

1. **New Project → Deploy from GitHub repo** y elegí este repositorio.
   Railway detecta el `Dockerfile` y construye su última etapa (`runner`), que
   es justamente la imagen de producción.
2. **New → Database → PostGIS** (buscá "PostGIS" en los templates; usa
   `postgis/postgis:17-3.5`). **No sirve el Postgres normal**: sin PostGIS
   fallan todas las consultas de cercanía.
3. En el servicio web, pestaña **Variables**:
   ```
   DATABASE_URL = ${{Postgres.DATABASE_URL}}
   ADMIN_TOKEN  = <algo largo y aleatorio>
   ```
   La primera es una *referencia* a la otra base, no un texto pegado: si
   Railway rota la contraseña, se actualiza sola.
4. **Aplicá el esquema una vez.** Copiá la cadena de conexión pública de la
   base (pestaña *Connect*) y desde tu máquina:
   ```bash
   DATABASE_URL="postgresql://…la cadena de Railway…" npm run db:setup
   ```
   La variable escrita así tiene prioridad sobre la del `.env`, así que apunta
   a Railway sin que tengas que tocar el archivo.
5. **Settings → Networking → Generate Domain** para obtener la URL pública.

`railway.json` ya deja configurado el healthcheck contra `/api/salud`, así que
Railway no manda tráfico a una instancia que todavía no conectó con la base.

El `docker-compose.yml` no interviene acá: Railway despliega servicios sueltos.
Sigue siendo el entorno de desarrollo local.

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
