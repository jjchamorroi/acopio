import FormularioConvocatoria from "@/components/FormularioConvocatoria";
import { buscarCiudades } from "@/lib/consultas";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Convocar voluntarios",
  description:
    "Publica qué hay que hacer, cuándo y cuántas personas hacen falta.",
};

export default async function Convocar() {
  // Solo para sugerir un municipio inicial; el resto lo busca el autocompletado.
  const ciudades = await buscarCiudades();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Convocar voluntarios
      </h1>
      <p className="mt-2 text-slate-600">
        Di qué hay que hacer, cuándo y cuántas personas hacen falta. Al
        terminar recibes un enlace privado para ver quiénes se apuntaron.
      </p>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Convoca solo si vas a estar ahí para recibir a la gente. Una
        convocatoria sin nadie que coordine deja a un grupo de voluntarios
        parados en una esquina.
      </div>

      <div className="mt-6">
        <FormularioConvocatoria ciudades={ciudades} />
      </div>
    </div>
  );
}
