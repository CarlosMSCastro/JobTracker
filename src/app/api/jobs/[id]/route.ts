import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { JobStatus } from "@/generated/prisma/client";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      source: { select: { name: true } },
      statusHistory: { orderBy: { changedAt: "desc" } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "vaga não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ job });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as {
    status?: JobStatus;
    notes?: string;
    note?: string;
    applicationText?: string;
  };

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "vaga não encontrada" }, { status: 404 });
  }

  const updated = await prisma.job.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.applicationText !== undefined ? { applicationText: body.applicationText } : {}),
    },
  });

  if (body.status && body.status !== job.status) {
    await prisma.statusEvent.create({
      data: { jobId: id, status: body.status, note: body.note },
    });
  }

  return NextResponse.json({ job: updated });
}
