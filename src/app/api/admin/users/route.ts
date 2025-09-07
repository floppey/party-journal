// API route for managing user permissions (admin only) - Simplified version
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/permissions";

// Simple Firebase REST API approach that works on Vercel
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

interface UserPermissionData {
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Simple Firebase REST API functions
async function getAllUsersFromFirestore(): Promise<UserPermissionData[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/userPermissions`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Firestore API error: ${response.status}`);
    }
    
    const data = await response.json();
    const users: UserPermissionData[] = [];
    
    if (data.documents) {
      data.documents.forEach((doc: { name: string; fields: Record<string, { stringValue?: string; timestampValue?: string }> }) => {
        const fields = doc.fields;
        if (fields.email?.stringValue && fields.role?.stringValue) {
          users.push({
            email: fields.email.stringValue,
            role: fields.role.stringValue as UserRole,
            createdAt: fields.createdAt?.timestampValue || new Date().toISOString(),
            updatedAt: fields.updatedAt?.timestampValue || new Date().toISOString(),
            createdBy: fields.createdBy?.stringValue || 'system',
          });
        }
      });
    }
    
    return users.sort((a, b) => a.email.localeCompare(b.email));
  } catch (error) {
    console.error("Error getting users from Firestore:", error);
    return [];
  }
}

async function setUserInFirestore(userData: UserPermissionData): Promise<boolean> {
  try {
    const docId = userData.email.toLowerCase().replace(/[.#$[\]]/g, "_");
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/userPermissions/${docId}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          email: { stringValue: userData.email },
          role: { stringValue: userData.role },
          createdAt: { timestampValue: userData.createdAt },
          updatedAt: { timestampValue: new Date().toISOString() },
          createdBy: { stringValue: userData.createdBy },
        }
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error("Error setting user in Firestore:", error);
    return false;
  }
}

async function deleteUserFromFirestore(email: string): Promise<boolean> {
  try {
    const docId = email.toLowerCase().replace(/[.#$[\]]/g, "_");
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/userPermissions/${docId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
    });
    
    return response.ok;
  } catch (error) {
    console.error("Error deleting user from Firestore:", error);
    return false;
  }
}

// Verify if user is admin (simplified for now)
async function verifyAdmin(): Promise<string | null> {
  try {
    // For development, allow the dev admin
    const devAdminEmail = process.env.DEV_ADMIN_EMAIL;
    if (devAdminEmail) {
      console.log("Using dev admin fallback:", devAdminEmail);
      return devAdminEmail;
    }
    
    // TODO: Implement proper Firebase Auth token verification
    return null;
  } catch (error) {
    console.error("Error in verifyAdmin:", error);
    return null;
  }
}

// GET - Get all users with permissions
export async function GET() {
  try {
    console.log("GET /api/admin/users - Getting all user permissions");
    
    const adminEmail = await verifyAdmin();
    if (!adminEmail) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const users = await getAllUsersFromFirestore();
    console.log(`Retrieved ${users.length} users`);
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error in GET /api/admin/users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST - Add or update a user's permissions
export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/admin/users - Adding/updating user permissions");
    
    const adminEmail = await verifyAdmin();
    if (!adminEmail) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { email, role } = await request.json();
    
    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    const userData: UserPermissionData = {
      email: email.toLowerCase(),
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: adminEmail,
    };

    const success = await setUserInFirestore(userData);
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to set user permissions" },
        { status: 500 }
      );
    }

    console.log(`Successfully set permissions for ${email} to ${role}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/admin/users:", error);
    return NextResponse.json(
      { error: "Failed to set user permissions" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a user's permissions
export async function DELETE(request: NextRequest) {
  try {
    console.log("DELETE /api/admin/users - Removing user permissions");
    
    const adminEmail = await verifyAdmin();
    if (!adminEmail) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const success = await deleteUserFromFirestore(email);
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to remove user permissions" },
        { status: 500 }
      );
    }

    console.log(`Successfully removed permissions for ${email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users:", error);
    return NextResponse.json(
      { error: "Failed to remove user permissions" },
      { status: 500 }
    );
  }
}
