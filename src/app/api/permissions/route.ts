// API route for checking user permissions
import { NextRequest, NextResponse } from "next/server";
import {
  canUserEdit,
  getUserRole,
  isAdmin,
  isUserAllowed,
} from "../../../permissions";

export async function POST(request: NextRequest) {
  try {
    const { email, action } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Use async permission functions
    const [isAllowed, canEdit, isAdminUser, role] = await Promise.all([
      isUserAllowed(email),
      canUserEdit(email),
      isAdmin(email),
      getUserRole(email),
    ]);

    const permissions = {
      isAllowed,
      canEdit,
      isAdmin: isAdminUser,
      role,
    };

    // If a specific action is requested, return just that
    if (action && action in permissions) {
      return NextResponse.json({
        result: permissions[action as keyof typeof permissions],
      });
    }

    // Return all permissions
    return NextResponse.json(permissions);
  } catch (error) {
    console.error("Error checking permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
