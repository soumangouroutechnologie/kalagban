import { supabase } from './supabase';

export async function uploadMedia(localUri: string, prefix = 'media'): Promise<string | null> {
  try {
    if (!localUri) return null;
    if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
      return localUri;
    }

    const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExt}`;
    const contentType = fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';

    const response = await fetch(localUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('kalagban_media')
      .upload(fileName, blob, {
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
