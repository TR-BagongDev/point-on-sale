"use client";

import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
}

export function DashboardLayout({ children, userName, userRole }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar userName={userName} userRole={userRole} />
      <main className="ml-64 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
