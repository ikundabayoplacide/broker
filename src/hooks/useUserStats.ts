import { useMemo, useState, useEffect } from "react";
import api from "@/lib/axios";

type ApiUserRole = "SUPER_ADMIN" | "ADMIN" | "TELLER" | "COMPANY" | "CLIENT";

interface ApiUser {
  id: string;
  role: ApiUserRole;
  isVerified: boolean;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<ApiUserRole, number>;
}

export function useUserStats() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<{ data: ApiUser[] }>("/user");
        const fetchedUsers = Array.isArray(response.data) ? response.data : [];
        setUsers(fetchedUsers);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load users";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchUsers();
  }, []);

  const stats = useMemo<UserStats>(() => {
    const result: UserStats = {
      total: users.length,
      active: 0,
      inactive: 0,
      byRole: {} as Record<ApiUserRole, number>,
    };

    users.forEach((user) => {
      if (user.isVerified) result.active++;
      else result.inactive++;
      result.byRole[user.role] = (result.byRole[user.role] || 0) + 1;
    });

    return result;
  }, [users]);

  return { stats, loading, error };
}
