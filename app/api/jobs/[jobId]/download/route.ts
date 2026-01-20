import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  const job = await prisma.compositionJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return new Response('Job not found', { status: 404 });
  }
  if (!job.outputPath) {
    return new Response('Job output not ready', { status: 409 });
  }

  const buf = await fs.readFile(job.outputPath);
  const filename = path.basename(job.outputPath) || `${jobId}.mid`;

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'audio/midi',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
}
