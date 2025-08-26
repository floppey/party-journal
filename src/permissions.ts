// src/permissions.ts
// Simple allowlist-based access control

export type UserRole = "admin" | "editor" | "viewer";

// Configure allowed users here - in production, move to environment or database
const ALLOWED_USERS: Record<string, { email: string; role: UserRole }> = {
  // TODO: Add your email and trusted users here
  // Example:
  // "your-email@gmail.com": { email: "your-email@gmail.com", role: "admin" },
  // "friend@example.com": { email: "friend@example.com", role: "editor" },
  // "viewer@example.com": { email: "viewer@example.com", role: "viewer" },

  // IMPORTANT: Add at least one admin user before deploying!
  // Replace this example with your actual email:
  "thin.ring7065@fastmail.com": {
    email: "thin.ring7065@fastmail.com",
    role: "admin",
  },
};

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
