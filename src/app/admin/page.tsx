// src/app/admin/page.tsx
"use client";
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
        <p className="mb-4 text-gray-600">
          To add users, edit the ALLOWED_USERS object in{" "}
          <code>src/permissions.ts</code>
        </p>

        <button
          onClick={() => {
            setShowUsers(!showUsers);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showUsers ? "Hide" : "Show"} Console Helper
        </button>

        {showUsers && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p className="mb-2 font-medium">Add users with console commands:</p>
            <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
              {`// Open browser console and run:
import { addUserToAllowlist } from './src/permissions';

// Add an admin user
addUserToAllowlist("user@example.com", "admin");

// Add an editor user
addUserToAllowlist("user@example.com", "editor");

// Add a viewer user
addUserToAllowlist("user@example.com", "viewer");`}
            </pre>
            <p className="text-sm text-gray-600 mt-2">
              Copy the output and add it to the ALLOWED_USERS object in
              src/permissions.ts
            </p>
          </div>
        )}
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
