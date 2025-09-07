// src/services/userPermissionsAdmin.ts
// Server-side user permissions management using Firebase Admin SDK

import { adminDb } from "../firebase-admin";
import { UserRole } from "../permissions";

export interface UserPermissionData {
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Collection reference
const USER_PERMISSIONS_COLLECTION = "userPermissions";

/**
 * Generate a document ID from email (lowercase, replace special chars with underscore)
 */
function emailToDocId(email: string): string {
  return email.toLowerCase().replace(/[.#$[\]]/g, "_");
}

/**
 * Get user permissions from Firebase Admin (server-side)
 */
export async function getUserPermissionsFromFirebaseAdmin(
  email: string
): Promise<UserPermissionData | null> {
  if (!email) return null;

  try {
    const docId = emailToDocId(email);
    const docRef = adminDb.collection(USER_PERMISSIONS_COLLECTION).doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data()!;
    return {
      email: data.email,
      role: data.role,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      createdBy: data.createdBy,
    };
  } catch (error) {
    console.error("Error fetching user permissions from Firebase Admin:", error);
    return null;
  }
}

/**
 * Set user permissions in Firebase Admin (server-side)
 */
export async function setUserPermissionsInFirebaseAdmin(
  email: string,
  role: UserRole,
  createdByUid: string
): Promise<boolean> {
  try {
    const docId = emailToDocId(email);
    const docRef = adminDb.collection(USER_PERMISSIONS_COLLECTION).doc(docId);
    
    // Check if document exists to determine if this is an update
    const existingDoc = await docRef.get();
    
    const data: Record<string, unknown> = {
      email: email.toLowerCase(),
      role,
      updatedAt: new Date(),
    };

    if (!existingDoc.exists) {
      // New user
      data.createdAt = new Date();
      data.createdBy = createdByUid;
    }

    await docRef.set(data, { merge: true });
    return true;
  } catch (error) {
    console.error("Error setting user permissions in Firebase Admin:", error);
    return false;
  }
}

/**
 * Remove user permissions from Firebase Admin (server-side)
 */
export async function removeUserPermissionsFromFirebaseAdmin(
  email: string
): Promise<boolean> {
  try {
    const docId = emailToDocId(email);
    const docRef = adminDb.collection(USER_PERMISSIONS_COLLECTION).doc(docId);
    
    await docRef.delete();
    return true;
  } catch (error) {
    console.error("Error removing user permissions from Firebase Admin:", error);
    return false;
  }
}

/**
 * Get all users with permissions from Firebase Admin (server-side)
 */
export async function getAllUserPermissionsFromFirebaseAdmin(): Promise<UserPermissionData[]> {
  try {
    console.log("Attempting to fetch all user permissions from Firebase Admin...");
    
    const collectionRef = adminDb.collection(USER_PERMISSIONS_COLLECTION);
    const querySnapshot = await collectionRef.orderBy("email").get();

    const users: UserPermissionData[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        email: data.email,
        role: data.role,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        createdBy: data.createdBy,
      });
    });

    console.log(`Successfully fetched ${users.length} users from Firebase Admin`);
    return users;
  } catch (error) {
    console.error("Error fetching all user permissions from Firebase Admin:", error);
    return [];
  }
}

/**
 * Check if a user has admin role using Firebase Admin (server-side)
 */
export async function isUserAdminInFirebaseAdmin(email: string): Promise<boolean> {
  const permissions = await getUserPermissionsFromFirebaseAdmin(email);
  return permissions?.role === "admin" || false;
}
