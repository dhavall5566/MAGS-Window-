import { NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { getSystemUser } from "@/lib/api-auth";

export async function GET() {
  try {
    const user = await getSystemUser();
    const notifications = db.getNotifications(user?.id);
    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ notifications: [] });
  }
}
