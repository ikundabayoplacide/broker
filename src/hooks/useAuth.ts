"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type AuthRole = "CLIENT" | "TELLER" | "ADMIN" | "MANAGER" | "SUPER_ADMIN" | "COMPANY";

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  fullName?: string | null;
  [key: string]: unknown;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

const DASHBOARD_PATHS: Record<AuthRole, string> = {
  CLIENT: "/dashboard/client",
  TELLER: "/dashboard/teller",
  ADMIN: "/dashboard/admin",
  MANAGER: "/dashboard/manager",
  SUPER_ADMIN: "/dashboard/super-admin",
  COMPANY: "/dashboard/company",
};

const normalizeRole = (role?: string | null): AuthRole | null => {
  if (!role) return null;
  const upper = role.toUpperCase().replace(/-/g, "_");
  if (["CLIENT", "TELLER", "ADMIN", "MANAGER", "SUPER_ADMIN", "COMPANY"].includes(upper)) {
    return upper as AuthRole;
  }
  console.warn('Failed to normalize role:', role, 'upper:', upper);
  return null;
};

const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  try {
    // Check for user first, then company
    let storedUser = localStorage.getItem("user");
    let isCompany = false;
    
    if (!storedUser) {
      storedUser = localStorage.getItem("company");
      isCompany = true;
    }
    
    if (!storedUser) return null;
    
    const parsed = JSON.parse(storedUser) as AuthUser;
    
    if (isCompany && !parsed.role) {
      parsed.role = "COMPANY";
    }
    
    const role = normalizeRole(parsed?.role as string | undefined);
    
    if (!role) return null;
    return { ...parsed, role };
  } catch (error) {
    console.warn("Failed to parse stored user/company", error);
    return null;
  }
};

const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

export const getDashboardPath = (role?: string | null): string => {
  const normalized = normalizeRole(role);
  if (normalized) {
    return DASHBOARD_PATHS[normalized];
  }
  return "/dashboard/client";
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  const syncAuthState = useCallback(() => {
    const user = getStoredUser();
    const token = getStoredToken();
    setState({ user, token, loading: false });
  }, []);

  useEffect(() => {
    syncAuthState();
  }, [syncAuthState]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "user" || event.key === "company" || event.key === "token") {
        syncAuthState();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [syncAuthState]);

  const logout = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.setItem("santech:logoutRedirect", "true");
    } catch (error) {
      console.warn("Failed to set logout redirect flag", error);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("company"); // Also remove company data
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    syncAuthState();
  }, [syncAuthState]);

  const value = useMemo(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.user && state.token),
      dashboardPath: getDashboardPath(state.user?.role),
      logout,
      refreshAuth: syncAuthState,
    }),
    [state, logout, syncAuthState]
  );

  return value;
}
