import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

/**
 * Composition stub.
 *
 * In the next iteration we'll:
 *  - parse the uploaded MIDI
 *  - generate new tracks per requested instruments/sections
 *  - render back to a MIDI file
 */
export async function POST(
  _request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  const job = await prisma.compositionJob.findUnique({ where: { id: jobId } });

  if (!job) return new NextResponse('Job not found', { status: 404 });

  if (job.status === 'COMPLETE' && job.outputPath) {
    return NextResponse.json({ downloadUrl: `/api/jobs/${jobId}/download` });
  }

  try {
    await prisma.compositionJob.update({ where: { id: jobId }, data: { status: 'PROCESSING', errorMessage: null } });

    const outputsDir = path.join(process.cwd(), 'outputs');
    await fs.mkdir(outputsDir, { recursive: true });

    const originalBuf = await fs.readFile(job.originalPath);

    // TODO: replace this with real composition logic.
    const outputPath = path.join(outputsDir, `${jobId}__composed.mid`);
    await fs.writeFile(outputPath, originalBuf);

    await prisma.compositionJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETE', outputPath }
    });

    return NextResponse.json({ downloadUrl: `/api/jobs/${jobId}/download` });
  } catch (err: any) {
    await prisma.compositionJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', errorMessage: err?.message || 'Compose failed' }
    });
    return new NextResponse(err?.message || 'Compose failed', { status: 500 });
  }
}
