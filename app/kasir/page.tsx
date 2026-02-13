import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KasirClient } from "./KasirClient";

export default function KasirPage() {
  return (
    <DashboardLayout>
      <KasirClient />
    </DashboardLayout>
  );
}
