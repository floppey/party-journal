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

    const permissions = {
      isAllowed: isUserAllowed(email),
      canEdit: canUserEdit(email),
      isAdmin: isAdmin(email),
      role: getUserRole(email),
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
