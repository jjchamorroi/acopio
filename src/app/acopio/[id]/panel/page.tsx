import { notFound } from "next/navigation";
import PanelAcopio from "@/components/PanelAcopio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Panel del acopio",
  // El enlace lleva el token en la URL: que no lo indexe nadie.
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PaginaPanel({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;

  if (!UUID.test(id)) notFound();

  if (!t) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-xl font-semibold text-slate-900">
          Falta el enlace privado
        </h1>
        <p className="mt-2 text-slate-600">
          Para editar este acopio hay que entrar con el enlace completo que se
          entregó al registrarlo (el que termina en <code>?t=…</code>).
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PanelAcopio id={id} token={t} />
    </div>
  );
}
