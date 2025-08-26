// src/permissions.ts
// Simple allowlist-based access control

export type UserRole = "admin" | "editor" | "viewer";

// Load allowed users from environment variables
function loadAllowedUsers(): Record<string, { email: string; role: UserRole }> {
  const allowedUsers: Record<string, { email: string; role: UserRole }> = {};

  // Parse ALLOWED_USERS environment variable
  // Format: "email1:role1,email2:role2,email3:role3"
  const allowedUsersEnv = process.env.ALLOWED_USERS || "";

  if (allowedUsersEnv) {
    const userEntries = allowedUsersEnv.split(",");
    for (const entry of userEntries) {
      const [email, role] = entry.trim().split(":");
      if (
        email &&
        role &&
        (role === "admin" || role === "editor" || role === "viewer")
      ) {
        allowedUsers[email.toLowerCase()] = {
          email: email.trim(),
          role: role as UserRole,
        };
      }
    }
  }

  // Fallback for development - add admin user from separate env var
  const devAdminEmail = process.env.DEV_ADMIN_EMAIL;
  if (devAdminEmail && Object.keys(allowedUsers).length === 0) {
    console.warn(
      "Using DEV_ADMIN_EMAIL for development. Set ALLOWED_USERS for production."
    );
    allowedUsers[devAdminEmail.toLowerCase()] = {
      email: devAdminEmail,
      role: "admin",
    };
  }

  return allowedUsers;
}

const ALLOWED_USERS = loadAllowedUsers();

export function isUserAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() in ALLOWED_USERS;
}

export function getUserRole(email: string | null | undefined): UserRole | null {
  if (!email) return null;
  const user = ALLOWED_USERS[email.toLowerCase()];
  return user?.role || null;
}

export function canUserSignUp(email: string | null | undefined): boolean {
  return isUserAllowed(email);
}

export function canUserEdit(userEmail: string | null | undefined): boolean {
  const role = getUserRole(userEmail);
  return role === "admin" || role === "editor";
}

export function canUserRead(userEmail: string | null | undefined): boolean {
  const role = getUserRole(userEmail);
  return role === "admin" || role === "editor" || role === "viewer";
}

export function isAdmin(userEmail: string | null | undefined): boolean {
  return getUserRole(userEmail) === "admin";
}

// Helper to get all allowed emails for configuration
export function getAllowedEmails(): string[] {
  return Object.keys(ALLOWED_USERS);
}

// Helper to add a user (for admins to use in console/dev)
export function addUserToAllowlist(email: string, role: UserRole) {
  console.log(`Add this to ALLOWED_USERS in src/permissions.ts:`);
  console.log(
    `"${email.toLowerCase()}": { email: "${email}", role: "${role}" },`
  );
}
