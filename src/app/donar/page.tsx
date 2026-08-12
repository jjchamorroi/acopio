import FormularioDonacion from "@/components/FormularioDonacion";
import { buscarCiudades } from "@/lib/consultas";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ofrecer una donación · Red de Acopio",
  description:
    "Publica qué tienes para donar y te decimos qué lugar cerca tuyo lo está pidiendo.",
};

export default async function Donar() {
  // Solo para sugerir un municipio inicial; el resto lo busca el autocompletado.
  const ciudades = await buscarCiudades();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Tengo algo para donar
      </h1>
      <p className="mt-2 text-slate-600">
        Publica qué tienes y dónde estás. Al terminar te mostramos los lugares
        cerca tuyo que están pidiendo justo eso — muchas veces puedes llevarlo
        tú mismo y no hace falta que nadie lo recoja.
      </p>

      <div className="mt-4 rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Tu dirección exacta <strong>no se publica</strong>. En el mapa solo se
        ve una zona aproximada; el punto de encuentro lo coordinas por teléfono.
      </div>

      <div className="mt-6">
        <FormularioDonacion ciudades={ciudades} />
      </div>
    </div>
  );
}
