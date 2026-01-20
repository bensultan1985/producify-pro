import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

function isMidiFilename(name: string) {
  const lower = name.toLowerCase();
  return lower.endsWith('.mid') || lower.endsWith('.midi');
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('midiFile');
    const genre = String(form.get('genre') ?? '').trim() || null;
    const subgenre = String(form.get('subgenre') ?? '').trim() || null;

    const instrumentsRaw = String(form.get('instruments') ?? '[]');
    const sectionsRaw = String(form.get('sections') ?? '[]');

    if (!(file instanceof File)) {
      return new NextResponse('midiFile is required', { status: 400 });
    }

    if (!isMidiFilename(file.name)) {
      return new NextResponse('Only .mid/.midi files are allowed', { status: 400 });
    }

    let instruments: any;
    let sections: any;
    try {
      instruments = JSON.parse(instrumentsRaw);
      sections = JSON.parse(sectionsRaw);
    } catch {
      return new NextResponse('Invalid JSON in instruments/sections', { status: 400 });
    }

    if (!Array.isArray(instruments) || instruments.length === 0) {
      return new NextResponse('Select at least one instrument', { status: 400 });
    }

    // Create DB record first so we have a stable ID
    const job = await prisma.compositionJob.create({
      data: {
        status: 'PENDING',
        genre,
        subgenre,
        instruments,
        sections,
        originalPath: '' // filled below
      }
    });

    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const originalPath = path.join(uploadsDir, `${job.id}__${safeName}`);

    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(originalPath, buf);

    await prisma.compositionJob.update({
      where: { id: job.id },
      data: { originalPath }
    });

    return NextResponse.json({ jobId: job.id });
  } catch (err: any) {
    return new NextResponse(err?.message || 'Unexpected error', { status: 500 });
  }
}
