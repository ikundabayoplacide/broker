"use client";

import { useAuth } from "@/hooks/useAuth";

export default function RoleDebugger() {
  const { user } = useAuth();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="font-bold mb-2">Role Debug Info:</div>
      <div>User ID: {user?.id || 'N/A'}</div>
      <div>Email: {user?.email || 'N/A'}</div>
      <div>Role: {user?.role || 'N/A'}</div>
      <div>Full Name: {user?.fullName || 'N/A'}</div>
    </div>
  );
}