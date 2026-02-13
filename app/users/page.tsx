"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Shield } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadge = (role: string) => {
    if (role === "ADMIN") {
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          <Shield className="h-3 w-3 mr-1" />
          ADMIN
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        <Users className="h-3 w-3 mr-1" />
        KASIR
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <UserCheck className="h-3 w-3 mr-1" />
          Aktif
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        <UserX className="h-3 w-3 mr-1" />
        Tidak Aktif
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen User</h1>
          <p className="text-muted-foreground">
            Kelola akun pengguna dan peran mereka
          </p>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Daftar Pengguna
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada pengguna
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Nama
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Peran
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Terakhir Login
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium">{user.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(user.isActive)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(user.lastLoginAt)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
