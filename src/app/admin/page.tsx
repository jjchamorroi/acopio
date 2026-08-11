import PanelAdmin from "@/components/PanelAdmin";

export const metadata = {
  title: "Panel interno",
  robots: { index: false, follow: false },
};

export default function PaginaAdmin() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PanelAdmin />
    </div>
  );
}
