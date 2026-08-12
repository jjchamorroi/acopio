import FormularioRegistro from "@/components/FormularioRegistro";
import { buscarCiudades } from "@/lib/consultas";

export const dynamic = "force-dynamic";

export const metadata = { title: "Registrar un acopio · Red de Acopio" };

export default async function Registrar() {
  // Solo para sugerir un municipio inicial; el resto lo busca el autocompletado.
  const ciudades = await buscarCiudades();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Registrar un centro de acopio
      </h1>
      <p className="mt-2 text-slate-600">
        Toma dos minutos. Al terminar recibes un enlace privado para ir
        actualizando qué necesitan, sin crear cuenta ni contraseña.
      </p>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Registra solo acopios <strong>que existan y estén recibiendo</strong>.
        Un punto equivocado en el mapa manda a alguien a manejar dos horas con
        el carro lleno para nada.
      </div>

      <div className="mt-6">
        <FormularioRegistro ciudades={ciudades} />
      </div>
    </div>
  );
}
