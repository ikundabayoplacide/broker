"use client";

import { useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import EditUserModal from "./EditUserModal";
import DeleteUserModal from "./DeleteUserModal";

type ApiUserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "TELLER" | "COMPANY" | "CLIENT";

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  idNumber?: string | null;
  passportPhoto?: string | null;
  idDocument?: string | null;
  dateOfBirth?: string | null;
  gender: string;
  country: string;
  city: string;
  occupation?: string | null;
  investmentExperience?: string | null;
  notificationPreferences: Record<string, unknown> | null;
  role: ApiUserRole;
  isVerified: boolean;
  csdNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserActionsProps {
  user: ApiUser;
  onUserUpdated: () => void;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
}

export default function UserActions({ 
  user, 
  onUserUpdated, 
  showView = true, 
  showEdit = true, 
  showDelete = true 
}: UserActionsProps) {
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleUserUpdated = () => {
    onUserUpdated();
    setEditModalOpen(false);
  };

  const handleUserDeleted = () => {
    onUserUpdated();
    setDeleteModalOpen(false);
  };

  return (
    <>
      <div className="flex justify-center gap-2">
        {showView && (
          <Button
            variant="outline"
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
            onClick={() => router.push(`/dashboard/commonPage/users/${user.id}`)}
          >
            <Eye className="h-4 w-4 flex justify-center" />
          </Button>
        )}
        
        {showEdit && (
          <Button
            variant="outline"
            className="h-8 w-8 p-0 text-green-600 text-center hover:text-green-800"
            onClick={() => setEditModalOpen(true)}
          >
            <Pencil className="h-4 w-4 mb-1" />
          </Button>
        )}
        
        {showDelete && (
          <Button
            variant="outline"
            className="h-8 w-8 p-0 text-red-600 items-center hover:text-red-800"
            onClick={() => setDeleteModalOpen(true)}
          >
            <Trash2 className="h-4 w-4 mb-1" />
          </Button>
        )}
      </div>

      <EditUserModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={user}
        onUserUpdated={handleUserUpdated}
      />

      <DeleteUserModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        user={user}
        onUserDeleted={handleUserDeleted}
      />
    </>
  );
}