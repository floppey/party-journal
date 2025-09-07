// src/services/userPermissions.ts
// Firebase-based user permissions management

import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { UserRole } from "../permissions";

export interface UserPermissionDoc {
  email: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // UID of admin who granted permissions
}

export interface UserPermissionData {
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// In-memory cache for permissions to reduce Firebase calls
const permissionsCache = new Map<string, { data: UserPermissionData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Collection reference
const USER_PERMISSIONS_COLLECTION = "userPermissions";

/**
 * Generate a document ID from email (lowercase, replace special chars with underscore)
 */
function emailToDocId(email: string): string {
  return email.toLowerCase().replace(/[.#$[\]]/g, "_");
}

/**
 * Get user permissions from Firebase (with caching)
 */
export async function getUserPermissionsFromFirebase(
  email: string
): Promise<UserPermissionData | null> {
  if (!email) return null;

  const cacheKey = email.toLowerCase();
  const cached = permissionsCache.get(cacheKey);
  
  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const docId = emailToDocId(email);
    const docRef = doc(db, USER_PERMISSIONS_COLLECTION, docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Cache negative result
      permissionsCache.delete(cacheKey);
      return null;
    }

    const data = docSnap.data() as UserPermissionDoc;
    const userData: UserPermissionData = {
      email: data.email,
      role: data.role,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      createdBy: data.createdBy,
    };

    // Cache the result
    permissionsCache.set(cacheKey, {
      data: userData,
      timestamp: Date.now(),
    });

    return userData;
  } catch (error) {
    console.error("Error fetching user permissions from Firebase:", error);
    return null;
  }
}

/**
 * Set user permissions in Firebase
 */
export async function setUserPermissionsInFirebase(
  email: string,
  role: UserRole,
  createdByUid: string
): Promise<boolean> {
  try {
    const docId = emailToDocId(email);
    const docRef = doc(db, USER_PERMISSIONS_COLLECTION, docId);
    
    // Check if document exists to determine if this is an update
    const existingDoc = await getDoc(docRef);
    const now = serverTimestamp();
    
    const data: Record<string, unknown> = {
      email: email.toLowerCase(),
      role,
      updatedAt: now,
    };

    if (!existingDoc.exists()) {
      // New user
      data.createdAt = now;
      data.createdBy = createdByUid;
    }

    await setDoc(docRef, data, { merge: true });

    // Invalidate cache
    permissionsCache.delete(email.toLowerCase());

    return true;
  } catch (error) {
    console.error("Error setting user permissions in Firebase:", error);
    return false;
  }
}

/**
 * Remove user permissions from Firebase
 */
export async function removeUserPermissionsFromFirebase(
  email: string
): Promise<boolean> {
  try {
    const docId = emailToDocId(email);
    const docRef = doc(db, USER_PERMISSIONS_COLLECTION, docId);
    
    await deleteDoc(docRef);

    // Invalidate cache
    permissionsCache.delete(email.toLowerCase());

    return true;
  } catch (error) {
    console.error("Error removing user permissions from Firebase:", error);
    return false;
  }
}

/**
 * Get all users with permissions from Firebase
 */
export async function getAllUserPermissionsFromFirebase(): Promise<UserPermissionData[]> {
  try {
    console.log("Attempting to fetch all user permissions from Firebase...");
    console.log("Current auth user:", auth.currentUser?.email || "No user authenticated");
    console.log("Auth state:", auth.currentUser ? "Authenticated" : "Not authenticated");
    
    const collectionRef = collection(db, USER_PERMISSIONS_COLLECTION);
    const q = query(collectionRef, orderBy("email"));
    const querySnapshot = await getDocs(q);

    const users: UserPermissionData[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserPermissionDoc;
      users.push({
        email: data.email,
        role: data.role,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        createdBy: data.createdBy,
      });
    });

    console.log(`Successfully fetched ${users.length} users from Firebase`);
    return users;
  } catch (error) {
    console.error("Error fetching all user permissions from Firebase:", error);
    console.error("Auth user when error occurred:", auth.currentUser?.email || "No user");
    return [];
  }
}

/**
 * Check if a user has admin role
 */
export async function isUserAdminInFirebase(email: string): Promise<boolean> {
  const permissions = await getUserPermissionsFromFirebase(email);
  return permissions?.role === "admin" || false;
}

/**
 * Clear permissions cache (useful for testing or admin operations)
 */
export function clearPermissionsCache(): void {
  permissionsCache.clear();
}

/**
 * Get cache stats (for debugging)
 */
export function getPermissionsCacheStats(): { size: number; entries: string[] } {
  return {
    size: permissionsCache.size,
    entries: Array.from(permissionsCache.keys()),
  };
}
