import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { decode } from 'base64-arraybuffer';
import { videoSizeLimitMb } from '@/src/config/iap';

const BUCKET = 'check-in-media';

export type CheckInMedia = {
  id: string;
  check_in_id: string | null;
  user_id: string;
  spot_id: string | null;
  place_id?: string | null;
  url: string;
  thumbnail_url?: string | null;
  media_type: 'image' | 'video';
  is_hero?: boolean;
  created_at: string;
  profiles?: { username: string | null; avatar_url: string | null } | null;
  spots?: { name: string | null } | null;
};

export type PendingMedia = { uri: string; type: 'image' | 'video' };

async function fetchMediaForCheckIn(checkInId: string): Promise<CheckInMedia[] | null> {
  const { data, error } = await supabase
    .from('check_in_media')
    .select('*')
    .eq('check_in_id', checkInId)
    .order('created_at', { ascending: true });
  if (error) return null;
  return (data ?? []) as CheckInMedia[];
}

// Public session media at a spot (RLS limits to non-private check-ins / own).
async function fetchMediaForSpot(spotId: string): Promise<CheckInMedia[] | null> {
  // Disambiguate the profiles embed — there are multiple FK paths to profiles,
  // so pin it to the uploader (user_id) FK by constraint name.
  const { data, error } = await supabase
    .from('check_in_media')
    .select('*, profiles!check_in_media_user_id_fkey(username, avatar_url)')
    .eq('spot_id', spotId)
    .order('created_at', { ascending: false });
  if (error) return null;
  return (data ?? []) as CheckInMedia[];
}

// Public session media at an OSM place (skatepark/shop), keyed by place_id.
async function fetchMediaForPlace(placeId: string): Promise<CheckInMedia[] | null> {
  const { data, error } = await supabase
    .from('check_in_media')
    .select('*, profiles!check_in_media_user_id_fkey(username, avatar_url)')
    .eq('place_id', placeId)
    .order('created_at', { ascending: false });
  if (error) return null;
  return (data ?? []) as CheckInMedia[];
}

// Public session media by a user (RLS limits to non-private check-ins / own).
async function fetchMediaForUser(userId: string): Promise<CheckInMedia[] | null> {
  const { data, error } = await supabase
    .from('check_in_media')
    .select('*, spots(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return null;
  return (data ?? []) as CheckInMedia[];
}

async function uploadCheckInMedia(
  spotId: string | null,
  checkInId: string | null,
  assets: PendingMedia[],
  placeId?: string
): Promise<{ uploaded: number; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { uploaded: 0, error: 'Not logged in' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro')
    .eq('id', user.id)
    .maybeSingle();
  const sizeLimitMb = videoSizeLimitMb(!!profile?.is_pro);

  let uploaded = 0;
  let firstError: string | undefined;

  for (const asset of assets) {
    try {
      const pathKey = checkInId ?? spotId ?? placeId;

      if (asset.type === 'image') {
        const compressed = await manipulateAsync(
          asset.uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: SaveFormat.JPEG, base64: true }
        );
        if (!compressed.base64) continue;

        const { data: mod } = await supabase.functions.invoke('moderate-image', {
          body: { image_base64: compressed.base64, check_only: true },
        });
        if (mod?.safe === false) {
          firstError = firstError ?? 'This photo was flagged as inappropriate.';
          continue;
        }

        const filename = `${user.id}/${pathKey}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filename, decode(compressed.base64), {
            contentType: 'image/jpeg',
            upsert: false,
          });
        if (uploadError) {
          firstError = firstError ?? `Storage: ${uploadError.message}`;
          continue;
        }
        const url = supabase.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl;

        const { error: insertError } = await supabase.from('check_in_media').insert({
          check_in_id: checkInId,
          user_id: user.id,
          spot_id: spotId,
          place_id: placeId ?? null,
          url,
          thumbnail_url: null,
          media_type: 'image',
          is_public: true,
        });
        if (insertError) {
          await supabase.storage.from(BUCKET).remove([filename]);
          firstError = firstError ?? `Insert: ${insertError.message}`;
          continue;
        }
        uploaded += 1;
      } else {
        const res = await fetch(asset.uri);
        const bytes = await res.arrayBuffer();
        if (bytes.byteLength > sizeLimitMb * 1024 * 1024) {
          firstError = firstError ?? `Videos must be under ${sizeLimitMb}MB.`;
          continue;
        }

        const filename = `${user.id}/${pathKey}-${Date.now()}.mp4`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filename, bytes, { contentType: 'video/mp4', upsert: false });
        if (uploadError) {
          firstError = firstError ?? `Storage: ${uploadError.message}`;
          continue;
        }
        const url = supabase.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl;

        const frameBase64s: string[] = [];
        for (const t of [0, 2000, 5000, 10000]) {
          try {
            const { uri: fUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: t });
            const comp = await manipulateAsync(fUri, [{ resize: { width: 1080 } }], {
              compress: 0.7,
              format: SaveFormat.JPEG,
              base64: true,
            });
            if (comp.base64) frameBase64s.push(comp.base64);
          } catch {}
        }

        if (frameBase64s.length === 0) {
          await supabase.storage.from(BUCKET).remove([filename]);
          firstError = firstError ?? 'Could not process this video. Try a different clip.';
          continue;
        }

        let flagged = false;
        for (const b64 of frameBase64s) {
          const { data: mod } = await supabase.functions.invoke('moderate-image', {
            body: { image_base64: b64, check_only: true },
          });
          if (mod?.safe === false) {
            flagged = true;
            break;
          }
        }
        if (flagged) {
          await supabase.storage.from(BUCKET).remove([filename]);
          firstError = firstError ?? 'This video was flagged as inappropriate.';
          continue;
        }

        let thumbnailUrl: string | null = null;
        const thumbName = `${user.id}/${pathKey}-${Date.now()}-thumb.jpg`;
        const { error: thumbErr } = await supabase.storage
          .from(BUCKET)
          .upload(thumbName, decode(frameBase64s[0]), {
            contentType: 'image/jpeg',
            upsert: false,
          });
        if (!thumbErr) {
          thumbnailUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbName).data.publicUrl;
        }

        const { error: insertError } = await supabase.from('check_in_media').insert({
          check_in_id: checkInId,
          user_id: user.id,
          spot_id: spotId,
          place_id: placeId ?? null,
          url,
          thumbnail_url: thumbnailUrl,
          media_type: 'video',
          is_public: true,
        });
        if (insertError) {
          await supabase.storage.from(BUCKET).remove([filename]);
          if (thumbnailUrl) await supabase.storage.from(BUCKET).remove([thumbName]);
          firstError = firstError ?? `Insert: ${insertError.message}`;
          continue;
        }
        uploaded += 1;
      }
    } catch (e: any) {
      console.log('uploadMedia exception:', e);
      firstError = firstError ?? String(e?.message ?? e);
    }
  }

  return { uploaded, error: uploaded === 0 ? firstError : undefined };
}

function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.split(`/${BUCKET}/`)[1] ?? null;
}

async function deleteCheckInMedia(item: CheckInMedia): Promise<void> {
  const paths = [storagePathFromUrl(item.url), storagePathFromUrl(item.thumbnail_url)].filter(
    (p): p is string => !!p
  );
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
  await supabase.from('check_in_media').delete().eq('id', item.id);
}

export async function deleteAllMediaForCheckIn(checkInId: string): Promise<void> {
  const { data } = await supabase
    .from('check_in_media')
    .select('id, url, thumbnail_url')
    .eq('check_in_id', checkInId);

  const paths = (data ?? [])
    .flatMap((row: any) => [storagePathFromUrl(row.url), storagePathFromUrl(row.thumbnail_url)])
    .filter((p): p is string => !!p);

  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
  await supabase.from('check_in_media').delete().eq('check_in_id', checkInId);
}

export function useCheckInMedia() {
  const [media, setMedia] = useState<CheckInMedia[]>([]);
  const [uploading, setUploading] = useState(false);

  async function loadMediaForCheckIn(checkInId: string) {
    const rows = await fetchMediaForCheckIn(checkInId);
    if (rows) setMedia(rows);
  }

  async function loadMediaForSpot(spotId: string) {
    const rows = await fetchMediaForSpot(spotId);
    if (rows) setMedia(rows);
  }

  async function loadMediaForPlace(placeId: string) {
    const rows = await fetchMediaForPlace(placeId);
    if (rows) setMedia(rows);
  }

  async function loadMediaForUser(userId: string) {
    const rows = await fetchMediaForUser(userId);
    if (rows) setMedia(rows);
  }

  async function uploadMedia(
    spotId: string | null,
    checkInId: string | null,
    assets: PendingMedia[],
    placeId?: string
  ): Promise<{ uploaded: number; error?: string }> {
    setUploading(true);
    const result = await uploadCheckInMedia(spotId, checkInId, assets, placeId);
    setUploading(false);
    if (checkInId) await loadMediaForCheckIn(checkInId);
    return result;
  }

  async function deleteMedia(item: CheckInMedia): Promise<void> {
    await deleteCheckInMedia(item);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
  }

  function clearMedia() {
    setMedia([]);
  }

  return {
    media,
    uploading,
    loadMediaForCheckIn,
    loadMediaForSpot,
    loadMediaForPlace,
    loadMediaForUser,
    uploadMedia,
    deleteMedia,
    clearMedia,
  };
}
