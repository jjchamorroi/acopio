/**
 * Fusiona fichas duplicadas del mismo sitio y borra las que sobran.
 *
 *   node scripts/fusionar-duplicados.mjs [--aplicar]
 *
 * Un edificio con tres fichas en un mapa de emergencia es peor que uno con
 * cero: quien lo ve no sabe a cuál hacerle caso, y las necesidades quedan
 * repartidas entre las tres. Pero ninguna ficha gana en todo —las cargadas a
 * mano traen el celular que de verdad contesta, las del lote traen la alerta
 * oficial y la fuente— así que no se puede simplemente borrar una.
 *
 * Reglas al fusionar:
 *  - Se conserva la ficha del LOTE (tiene origen_id, así que la próxima
 *    importación la sigue actualizando; una ficha a mano quedaría huérfana).
 *  - Teléfono y horario: gana el que exista. Si las dos tienen, gana la ficha
 *    a mano — el 119 del comunicado oficial es la línea de bomberos, y un
 *    celular local es lo que de verdad contesta.
 *  - Necesidades: unión de todas. Al chocar, `urgente` manda; y entre
 *    `necesita` y `sobra` gana `sobra`, porque quien reporta desbordamiento
 *    suele estar parado en el sitio, y equivocarse hacia "no traigan más" solo
 *    cuesta un viaje que alguien no hizo.
 */
import pg from "pg";

const FUSIONES = [
  {
    // Los tres son el mismo edificio, a 22 y 34 metros.
    conservar: "manizales-centro-de-acopio-universidad-de-caldas",
    absorber: [
      "52c4c8b5-79ff-4355-ba1b-042f1301c2ac", // 14 necesidades, tel y horario
      "f4d1507f-6552-4004-b683-06138a5eb2f5", // 6 necesidades, sin contacto
    ],
  },
  {
    conservar: "manizales-albergue-temporal-coliseo-mayor-jorge-arango-uribe",
    absorber: ["0739b155-b5f7-4056-ab05-ef168086acbf"], // tel 313 6268661
  },
];

const RANGO = { urgente: 0, sobra: 1, necesita: 2 };
const mejorNivel = (a, b) => (RANGO[a] <= RANGO[b] ? a : b);

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL");
    process.exit(1);
  }
  console.log(aplicar ? "MODO: aplicar\n" : "MODO: ensayo (no escribe)\n");

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  for (const f of FUSIONES) {
    const cliente = await pool.connect();
    try {
      await cliente.query("BEGIN");

      const { rows: base } = await cliente.query(
        "SELECT * FROM centro_acopio WHERE origen_id = $1",
        [f.conservar]
      );
      if (!base.length) {
        console.log(`⊘ no existe la ficha a conservar: ${f.conservar}`);
        await cliente.query("ROLLBACK");
        continue;
      }
      const destino = base[0];

      const { rows: viejas } = await cliente.query(
        "SELECT * FROM centro_acopio WHERE id = ANY($1)",
        [f.absorber]
      );

      console.log(`\n▸ CONSERVA: ${destino.nombre}`);
      for (const v of viejas) console.log(`  ABSORBE : ${v.nombre}`);
      if (viejas.length !== f.absorber.length) {
        console.log(`  ⚠ se esperaban ${f.absorber.length} fichas, se hallaron ${viejas.length}`);
      }

      // Contacto: el que exista; si las dos lo tienen, gana la ficha a mano.
      const telefono = viejas.find((v) => v.telefono)?.telefono ?? destino.telefono;
      const horario = viejas.find((v) => v.horario)?.horario ?? destino.horario;
      if (telefono !== destino.telefono) {
        console.log(`  tel     : ${destino.telefono ?? "—"}  →  ${telefono}`);
      }
      if (horario !== destino.horario) {
        console.log(`  horario : ${destino.horario ?? "—"}  →  ${horario}`);
      }

      // Necesidades: unión, con las reglas de arriba.
      const { rows: necesidades } = await cliente.query(
        "SELECT centro_id, categoria, nivel FROM necesidad WHERE centro_id = ANY($1)",
        [[destino.id, ...f.absorber]]
      );
      const union = new Map();
      for (const n of necesidades) {
        const previo = union.get(n.categoria);
        union.set(n.categoria, previo ? mejorNivel(previo, n.nivel) : n.nivel);
      }
      const antes = necesidades.filter((n) => n.centro_id === destino.id).length;
      console.log(`  necesidades: ${antes} → ${union.size}`);
      for (const [cat, niv] of [...union].sort()) {
        const orig = necesidades.find((n) => n.centro_id === destino.id && n.categoria === cat);
        if (!orig) console.log(`     + ${cat}: ${niv}`);
        else if (orig.nivel !== niv) console.log(`     ~ ${cat}: ${orig.nivel} → ${niv}`);
      }

      if (aplicar) {
        await cliente.query(
          "UPDATE centro_acopio SET telefono = $2, horario = $3, actualizado_en = now() WHERE id = $1",
          [destino.id, telefono, horario]
        );
        await cliente.query("DELETE FROM necesidad WHERE centro_id = $1", [destino.id]);
        for (const [categoria, nivel] of union) {
          await cliente.query(
            "INSERT INTO necesidad (centro_id, categoria, nivel) VALUES ($1,$2,$3)",
            [destino.id, categoria, nivel]
          );
        }
        // `necesidad` y `cambio` van en cascada; `donacion.centro_id` queda en
        // NULL, que es lo correcto: la donación existió, el destino ya no.
        const { rowCount } = await cliente.query(
          "DELETE FROM centro_acopio WHERE id = ANY($1)",
          [f.absorber]
        );
        console.log(`  ✔ fusionado, ${rowCount} fichas borradas`);
        await cliente.query("COMMIT");
      } else {
        await cliente.query("ROLLBACK");
      }
    } catch (e) {
      await cliente.query("ROLLBACK");
      console.error(`  ✗ ${e.message}`);
    } finally {
      cliente.release();
    }
  }

  const { rows } = await pool.query("SELECT count(*)::int c FROM centro_acopio");
  console.log(`\nTotal de lugares: ${rows[0].c}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
