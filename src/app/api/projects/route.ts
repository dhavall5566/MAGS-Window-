import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import { projectSchema } from "@/lib/validations";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return NextResponse.json(db.getProjects());
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { profiles } = body as {
    profiles?: { profileId: string; plannedQty: number; plannedLength?: number }[];
  };

  const project = db.createProject(
    {
      ...parsed.data,
      startDate: parsed.data.startDate
        ? new Date(parsed.data.startDate).toISOString()
        : undefined,
      endDate: parsed.data.endDate
        ? new Date(parsed.data.endDate).toISOString()
        : undefined,
    },
    profiles
  );

  if (user) {
    db.createActivityLog({
      userId: user.id,
      action: "CREATE",
      entity: "Project",
      entityId: project.id,
      details: `Created project ${project.projectCode}`,
    });
  }

  return NextResponse.json(project, { status: 201 });
}
