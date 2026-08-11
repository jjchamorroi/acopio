import { notFound } from "next/navigation";
import PanelDonacion from "@/components/PanelDonacion";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Donación",
  // El enlace lleva el token en la URL.
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PaginaDonacion({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;

  if (!UUID.test(id)) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PanelDonacion id={id} token={t ?? null} />
    </div>
  );
}
