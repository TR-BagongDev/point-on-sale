import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";

interface PengaturanLayoutProps {
  children: React.ReactNode;
}

export default async function PengaturanLayout({ children }: PengaturanLayoutProps) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userName={session?.user?.name ?? "Kasir"}
        userRole={session?.user?.role ?? "KASIR"}
      />
      <main className="ml-64 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
