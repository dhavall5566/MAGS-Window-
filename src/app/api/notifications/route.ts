import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSystemUser } from "@/lib/api-auth";

export async function GET() {
  try {
    const user = await getSystemUser();
    const notifications = await prisma.notification.findMany({
      where: user ? { userId: user.id } : undefined,
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ notifications: [] });
  }
}
