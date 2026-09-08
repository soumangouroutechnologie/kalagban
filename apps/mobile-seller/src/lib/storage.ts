import { supabase } from './supabase';

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function uploadMedia(localUri: string, prefix = 'media'): Promise<string | null> {
  try {
    if (!localUri) return null;
    if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
      return localUri;
    }

    const isBase64DataUrl = localUri.startsWith('data:');
    let fileExt = 'jpg';
    let contentType = 'image/jpeg';

    if (isBase64DataUrl) {
      if (localUri.startsWith('data:image/png')) {
        fileExt = 'png';
        contentType = 'image/png';
      } else if (localUri.startsWith('data:image/webp')) {
        fileExt = 'webp';
        contentType = 'image/webp';
      }
    } else {
      const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
      fileExt = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg';
      contentType = fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';
    }

    const fileName = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExt}`;

    let bodyData: Uint8Array | ArrayBuffer;

    if (isBase64DataUrl) {
      bodyData = decodeBase64ToUint8Array(localUri);
    } else {
      const response = await fetch(localUri);
      bodyData = await response.arrayBuffer();
    }

    const { error: uploadError } = await supabase.storage
      .from('kalagban_media')
      .upload(fileName, bodyData, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('kalagban_media')
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('Media upload failed:', err);
    return null;
  }
}
