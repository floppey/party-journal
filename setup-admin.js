// Quick setup script to add your first admin user
// Run this in the browser console on your app or as a Node.js script

import { setUserPermissionsInFirebase } from "./src/services/userPermissions";

// Replace with your email address
const ADMIN_EMAIL = "thin.ring7065@fastmail.com";

// This function helps you create your first admin user
export async function createFirstAdmin() {
  try {
    console.log("Creating first admin user...");

    const success = await setUserPermissionsInFirebase(
      ADMIN_EMAIL,
      "admin",
      "initial-setup" // createdBy field for first admin
    );

    if (success) {
      console.log(`✅ Successfully created admin user: ${ADMIN_EMAIL}`);
      console.log(
        "You can now sign in and access the admin panel at /admin/users"
      );
    } else {
      console.error("❌ Failed to create admin user");
    }
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
}

// Uncomment and run this if running as a script:
// createFirstAdmin();

console.log(`
🎉 Firebase User Permissions Setup

To create your first admin user:

1. Update ADMIN_EMAIL in this file with your email address
2. Open your app in the browser 
3. Sign in with your email (this creates the Firebase auth user)
4. Open browser dev tools console
5. Run: createFirstAdmin()

Or manually add to Firebase:
- Collection: userPermissions
- Document ID: ${ADMIN_EMAIL.toLowerCase().replace(/[.#$[\]]/g, "_")}
- Data: {
    email: "${ADMIN_EMAIL}",
    role: "admin", 
    createdAt: [current timestamp],
    updatedAt: [current timestamp],
    createdBy: "initial-setup"
  }
`);
