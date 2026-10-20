import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { uploadToBlob } from '@/lib/blob';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Sanitize filename and create unique path
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathName = `${folder}/${Date.now()}_${sanitizedName}`;

    const url = await uploadToBlob(pathName, file, {
      access: 'public',
      contentType: file.type || undefined,
    });

    return NextResponse.json({ success: true, url });
  } catch (err: any) {
    console.error('Blob upload error:', err);
    return NextResponse.json(
      { error: err.message || 'File upload failed' },
      { status: 500 }
    );
  }
}
