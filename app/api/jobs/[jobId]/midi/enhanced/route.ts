import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';

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
    return new Response('Enhanced MIDI file not available yet', { status: 404 });
  }

  try {
    const buf = await fs.readFile(job.outputPath);
    
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/midi',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return new Response('Failed to read MIDI file', { status: 500 });
  }
}
