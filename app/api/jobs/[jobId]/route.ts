import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } }
) {
  const job = await prisma.compositionJob.findUnique({ where: { id: params.jobId } });
  if (!job) return new NextResponse('Job not found', { status: 404 });

  return NextResponse.json({
    id: job.id,
    status: job.status,
    genre: job.genre,
    subgenre: job.subgenre,
    instruments: job.instruments,
    sections: job.sections,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    errorMessage: job.errorMessage
  });
}
