"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../auth";
import { usePermissions } from "../../../hooks/usePermissions";
import { UserRole } from "../../../permissions";

interface User {
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { isAdmin, loading: permissionsLoading } = usePermissions(user?.email);
  
  // Fallback for dev admin during bootstrapping
  const isDevAdmin = user?.email === "thin.ring7065@fastmail.com";
  const isActualAdmin = isAdmin || isDevAdmin;
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add user form state
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("viewer");
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!user?.email || !isActualAdmin) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${user.email}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user?.email, isActualAdmin]);

  // Add or update user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail.trim() || !user?.email) return;
    
    setIsAddingUser(true);
    setError(null);
    
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.email}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          role: newUserRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add user");
      }

      // Reset form and refresh users
      setNewUserEmail("");
      setNewUserRole("viewer");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsAddingUser(false);
    }
  };

  // Remove user
  const handleRemoveUser = async (email: string) => {
    if (!user?.email || !confirm(`Remove access for ${email}?`)) return;
    
    try {
      setError(null);
      
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${user.email}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove user");
      }

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  // Update user role
  const handleUpdateRole = async (email: string, newRole: UserRole) => {
    if (!user?.email) return;
    
    try {
      setError(null);
      
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.email}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  useEffect(() => {
    if (!permissionsLoading && isActualAdmin) {
      fetchUsers();
    }
  }, [permissionsLoading, isActualAdmin, fetchUsers]);

  // Loading state
  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Not admin
  if (!isActualAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" style={{ color: "var(--foreground)" }}>
      <h1 className="text-3xl font-bold mb-8">User Management</h1>

      {error && (
        <div 
          className="border px-4 py-3 rounded mb-6"
          style={{ 
            backgroundColor: "var(--error-bg)", 
            borderColor: "var(--error-border)", 
            color: "var(--error-text)" 
          }}
        >
          {error}
        </div>
      )}

      {/* Add User Form */}
      <div 
        className="border rounded-lg p-6 mb-8" 
        style={{ 
          backgroundColor: "var(--surface)", 
          borderColor: "var(--border)" 
        }}
      >
        <h2 className="text-xl font-semibold mb-4">Add User</h2>
        <form onSubmit={handleAddUser} className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              style={{ 
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--foreground)"
              }}
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium mb-2">
              Role
            </label>
            <select
              id="role"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              className="px-3 py-2 border rounded-md"
              style={{ 
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--foreground)"
              }}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isAddingUser}
            className="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#2563eb" }}
          >
            {isAddingUser ? "Adding..." : "Add User"}
          </button>
        </form>
      </div>

      {/* Users List */}
      <div 
        className="border rounded-lg" 
        style={{ 
          backgroundColor: "var(--surface)", 
          borderColor: "var(--border)" 
        }}
      >
        <div 
          className="px-6 py-4 border-b" 
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-xl font-semibold">Users ({users.length})</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center" style={{ opacity: 0.7 }}>No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: "var(--surface-secondary)" }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ opacity: 0.7 }}>
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ opacity: 0.7 }}>
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ opacity: 0.7 }}>
                    Added
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ opacity: 0.7 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {users.map((userItem) => (
                  <tr key={userItem.email} style={{ borderColor: "var(--border)" }}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {userItem.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={userItem.role}
                        onChange={(e) =>
                          handleUpdateRole(userItem.email, e.target.value as UserRole)
                        }
                        className="text-sm border rounded px-2 py-1"
                        style={{ 
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)"
                        }}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ opacity: 0.7 }}>
                      {new Date(userItem.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleRemoveUser(userItem.email)}
                        className="text-red-600 hover:text-red-700"
                        disabled={userItem.email === user?.email}
                        style={{ 
                          opacity: userItem.email === user?.email ? 0.5 : 1,
                          cursor: userItem.email === user?.email ? "not-allowed" : "pointer"
                        }}
                      >
                        {userItem.email === user?.email ? "Cannot remove self" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Descriptions */}
      <div 
        className="mt-8 border rounded-lg p-6" 
        style={{ 
          backgroundColor: "var(--surface-secondary)", 
          borderColor: "var(--border)" 
        }}
      >
        <h3 className="text-lg font-semibold mb-4">Role Descriptions</h3>
        <div className="space-y-2 text-sm">
          <div><strong>Admin:</strong> Full access - can manage users, create/edit/delete all content</div>
          <div><strong>Editor:</strong> Can create, edit, and delete content but cannot manage users</div>
          <div><strong>Viewer:</strong> Can only view content, cannot create or edit</div>
        </div>
      </div>
    </div>
  );
}
