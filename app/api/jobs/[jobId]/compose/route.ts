import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import { composeWithAI } from '@/lib/ai-composer';

export const runtime = 'nodejs';

/**
 * Composition endpoint with AI integration.
 *
 * This endpoint:
 *  - Parses the uploaded MIDI
 *  - Uses OpenAI to generate new tracks per requested instruments/sections
 *  - Renders the composed arrangement back to a MIDI file
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

    const outputPath = path.join(outputsDir, `${jobId}__composed.mid`);

    // Use AI composer to generate the arrangement
    await composeWithAI(
      {
        midiPath: job.originalPath,
        genre: job.genre || undefined,
        subgenre: job.subgenre || undefined,
        instruments: job.instruments as string[],
        sections: job.sections as any[]
      },
      outputPath
    );

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
