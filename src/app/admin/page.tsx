// src/app/admin/page.tsx
"use client";
import Link from "next/link";
import { useAuth } from "../../auth";
import { isAdmin } from "../../permissions";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin(user.email))) {
      window.location.href = "/";
    }
  }, [user, loading]);

  if (loading) return <div>Loading...</div>;
  if (!user || !isAdmin(user.email)) return <div>Access denied</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">User Management</h2>
        <Link href="/admin/users" className="text-blue-600 underline">
          Manage Users
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Role Definitions</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>
            <strong>Admin:</strong> Can access this panel, read and edit all
            notes
          </li>
          <li>
            <strong>Editor:</strong> Can create, read, and edit notes
          </li>
          <li>
            <strong>Viewer:</strong> Can read notes but cannot create or edit
          </li>
        </ul>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Current User</h2>
        <p>Email: {user.email}</p>
        <p>Display Name: {user.displayName || "Not set"}</p>
        <p>Role: Admin</p>
      </div>
    </div>
  );
}
