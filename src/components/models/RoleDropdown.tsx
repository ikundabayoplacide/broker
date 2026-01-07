"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import ChangeRoleModal from "./ChangeRoleModal";

type ApiUserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "TELLER" | "COMPANY" | "CLIENT";

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  role: ApiUserRole;
}

interface RoleDropdownProps {
  user: ApiUser;
  onRoleChanged: () => void;
}

const ROLE_LABELS: Record<ApiUserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager", 
  TELLER: "Teller",
  COMPANY: "Company",
  CLIENT: "Client",
};

export default function RoleDropdown({ user, onRoleChanged }: RoleDropdownProps) {
  const { user: currentUser } = useAuth();
  const [changeRoleModal, setChangeRoleModal] = useState<{ user: ApiUser; newRole: ApiUserRole } | null>(null);

  // Determine allowed roles based on current user's role
  const getAllowedRoles = (): ApiUserRole[] => {
    const currentUserRole = currentUser?.role?.toUpperCase();
    
    switch (currentUserRole) {
      case "SUPER_ADMIN":
        return ["SUPER_ADMIN", "ADMIN", "MANAGER", "TELLER", "COMPANY", "CLIENT"];
      case "ADMIN":
        return ["ADMIN", "MANAGER", "TELLER", "COMPANY", "CLIENT"];
      case "MANAGER":
        return ["TELLER", "CLIENT"];
      default:
        return [];
    }
  };

  const canChangeRole = () => {
    const currentUserRole = currentUser?.role?.toUpperCase();
    const targetUserRole = user.role;
    
    // Super admins can change any role
    if (currentUserRole === "SUPER_ADMIN") return true;
    
    // Admins can change roles except super admin
    if (currentUserRole === "ADMIN" && targetUserRole !== "SUPER_ADMIN") return true;
    
    // Managers can change teller and client roles
    if (currentUserRole === "MANAGER" && ["TELLER", "CLIENT"].includes(targetUserRole)) return true;
    
    return false;
  };

  const handleRoleChange = (newRole: ApiUserRole) => {
    if (newRole === user.role) return;
    
    setChangeRoleModal({ user, newRole });
  };

  const handleModalClose = () => {
    setChangeRoleModal(null);
  };

  const handleRoleChanged = () => {
    onRoleChanged();
    setChangeRoleModal(null);
  };

  if (!canChangeRole()) {
    return (
      <span className="text-sm text-gray-600">
        {ROLE_LABELS[user.role]}
      </span>
    );
  }

  return (
    <>
      <select
        value={user.role}
        onChange={(e) => handleRoleChange(e.target.value as ApiUserRole)}
        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 bg-white"
      >
        {getAllowedRoles().map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>

      <ChangeRoleModal
        isOpen={!!changeRoleModal}
        onClose={handleModalClose}
        user={changeRoleModal?.user || null}
        newRole={changeRoleModal?.newRole || user.role}
        onRoleChanged={handleRoleChanged}
      />
    </>
  );
}