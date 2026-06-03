import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { projectSchema } from "@/lib/validations";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const projects = await prisma.project.findMany({
    include: {
      profiles: { include: { profile: true } },
      _count: { select: { challans: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { profiles, ...data } = body as {
    profiles?: { profileId: string; plannedQty: number; plannedLength?: number }[];
  };

  const project = await prisma.project.create({
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      profiles: profiles?.length
        ? {
            create: profiles.map((p) => ({
              profileId: p.profileId,
              plannedQty: p.plannedQty,
              plannedLength: p.plannedLength,
            })),
          }
        : undefined,
    },
    include: { profiles: { include: { profile: true } } },
  });

  if (user) {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entity: "Project",
        entityId: project.id,
        details: `Created project ${project.projectCode}`,
      },
    });
  }

  return NextResponse.json(project, { status: 201 });
}
