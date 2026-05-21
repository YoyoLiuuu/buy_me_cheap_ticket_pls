import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const search = await prisma.savedSearch.findUnique({
    where: { token },
    include: {
      priceRecords: { orderBy: { checkedAt: "desc" }, take: 100 },
      alertLogs: { orderBy: { sentAt: "desc" }, take: 20 },
    },
  });

  if (!search) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(search);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();

  const search = await prisma.savedSearch.findUnique({ where: { token } });
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.savedSearch.update({
    where: { token },
    data: {
      active: body.active ?? search.active,
      alertThreshold: body.alertThreshold ?? search.alertThreshold,
      digestEnabled: body.digestEnabled ?? search.digestEnabled,
    },
  });

  return NextResponse.json({ success: true, active: updated.active });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const search = await prisma.savedSearch.findUnique({ where: { token } });
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savedSearch.update({ where: { token }, data: { active: false } });

  return NextResponse.json({ success: true });
}
