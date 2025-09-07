// src/permissions.ts
// Firebase-based user permissions management

import { getUserPermissionsFromFirebase } from "./services/userPermissions";

export type UserRole = "admin" | "editor" | "viewer";

/**
 * Get user role from Firebase
 */
export async function getUserRole(email: string | null | undefined): Promise<UserRole | null> {
  if (!email) return null;

  try {
    const firebasePermissions = await getUserPermissionsFromFirebase(email);
    return firebasePermissions?.role || null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

/**
 * Check if user is allowed (has any role)
 */
export async function isUserAllowed(email: string | null | undefined): Promise<boolean> {
  const role = await getUserRole(email);
  return role !== null;
}

/**
 * Check if user can sign up
 */
export async function canUserSignUp(email: string | null | undefined): Promise<boolean> {
  return await isUserAllowed(email);
}

/**
 * Check if user can edit content
 */
export async function canUserEdit(userEmail: string | null | undefined): Promise<boolean> {
  const role = await getUserRole(userEmail);
  return role === "admin" || role === "editor";
}

/**
 * Check if user can read content
 */
export async function canUserRead(userEmail: string | null | undefined): Promise<boolean> {
  const role = await getUserRole(userEmail);
  return role === "admin" || role === "editor" || role === "viewer";
}

/**
 * Check if user is admin
 */
export async function isAdmin(userEmail: string | null | undefined): Promise<boolean> {
  const role = await getUserRole(userEmail);
  return role === "admin";
}

// Note: For performance-critical real-time operations (like note filtering),
// consider using the cached results from usePermissions hook on the client side
// or implement a separate caching layer for synchronous operations.
