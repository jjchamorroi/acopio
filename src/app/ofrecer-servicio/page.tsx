import FormularioProfesional from "@/components/FormularioProfesional";
import { buscarCiudades } from "@/lib/consultas";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ofrecer mis servicios",
  description:
    "Si eres profesional de la salud u otra área y puedes atender gratis tras el sismo, regístrate en el directorio.",
};

export default async function OfrecerServicio() {
  const ciudades = await buscarCiudades();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Ofrecer mis servicios
      </h1>
      <p className="mt-2 text-slate-600">
        Si puedes atender gratis a personas afectadas por el sismo, regístrate
        acá. Al terminar recibes un enlace privado para actualizar tu
        disponibilidad o darte de baja.
      </p>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Regístrate solo si estás habilitado para ejercer.</strong> En
        salud —y especialmente en salud mental— atender sin la formación
        adecuada no es un favor a medias: empeora a quien ya está mal. Si quieres
        ayudar sin ser profesional, hay{" "}
        <a href="/?modo=voluntarios" className="font-medium underline">
          convocatorias de voluntarios
        </a>{" "}
        donde haces muchísima falta.
      </div>

      <div className="mt-6">
        <FormularioProfesional ciudades={ciudades} />
      </div>
    </div>
  );
}
