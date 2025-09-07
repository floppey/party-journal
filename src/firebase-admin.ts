// src/firebase-admin.ts
// Firebase Admin SDK for server-side operations

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminApp;

if (getApps().length === 0) {
  try {
    // For development with Firebase CLI authentication
    // This will use the credentials from Firebase CLI login
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

    console.log(
      "Firebase Admin initialized with project ID:",
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    throw error;
  }
} else {
  adminApp = getApps()[0];
}

export const adminDb = getFirestore(adminApp);
export default adminApp;
