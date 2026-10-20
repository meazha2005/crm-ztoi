import { put, del } from '@vercel/blob';

const BLOB_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  'vercel_blob_rw_vQMlSmaShFxbx8MD_3qBmAzcsQ1040rzVrT0wdWXlzISjtG';

export async function uploadToBlob(
  pathName: string,
  body: Buffer | Blob | File | string,
  options?: { access?: 'public'; contentType?: string }
): Promise<string> {
  const blob = await put(pathName, body, {
    access: options?.access || 'public',
    token: BLOB_TOKEN,
    contentType: options?.contentType,
  });
  return blob.url;
}

export async function deleteFromBlob(url: string): Promise<void> {
  try {
    if (!url || !url.includes('blob.vercel-storage.com')) return;
    await del(url, { token: BLOB_TOKEN });
  } catch (err) {
    console.warn('Vercel blob delete warning:', err);
  }
}
