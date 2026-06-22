import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { decode } from 'base64-arraybuffer';

const BUCKET = 'check-in-media';

export type CheckInMedia = {
  id: string;
  check_in_id: string;
  user_id: string;
  spot_id: string;
  url: string;
  thumbnail_url?: string | null;
  media_type: 'image' | 'video';
  is_hero?: boolean;
  created_at: string;
  profiles?: { username: string | null; avatar_url: string | null } | null;
  spots?: { name: string | null } | null;
};

export type PendingMedia = { uri: string; type: 'image' | 'video' };

export function useCheckInMedia() {
  const [media, setMedia] = useState<CheckInMedia[]>([]);
  const [uploading, setUploading] = useState(false);

  async function loadMediaForCheckIn(checkInId: string) {
    const { data, error } = await supabase
      .from('check_in_media')
      .select('*')
      .eq('check_in_id', checkInId)
      .order('created_at', { ascending: true });
    if (error) return;
    setMedia((data ?? []) as CheckInMedia[]);
  }

  // Public session media at a spot (RLS limits to non-private check-ins / own).
  async function loadMediaForSpot(spotId: string) {
    // Disambiguate the profiles embed — there are multiple FK paths to profiles,
    // so pin it to the uploader (user_id) FK by constraint name.
    const { data, error } = await supabase
      .from('check_in_media')
      .select('*, profiles!check_in_media_user_id_fkey(username, avatar_url)')
      .eq('spot_id', spotId)
      .order('created_at', { ascending: false });
    if (error) return;
    setMedia((data ?? []) as CheckInMedia[]);
  }

  // Public session media by a user (RLS limits to non-private check-ins / own).
  async function loadMediaForUser(userId: string) {
    const { data, error } = await supabase
      .from('check_in_media')
      .select('*, spots(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return;
    setMedia((data ?? []) as CheckInMedia[]);
  }

  async function uploadMedia(
    spotId: string,
    checkInId: string | null,
    assets: PendingMedia[]
  ): Promise<{ uploaded: number; error?: string }> {
    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return { uploaded: 0, error: 'Not logged in' };
    }

    let uploaded = 0;
    let firstError: string | undefined;

    for (const asset of assets) {
      try {
        let bytes: ArrayBuffer;
        let ext: string;
        let contentType: string;

        if (asset.type === 'video') {
          const res = await fetch(asset.uri);
          bytes = await res.arrayBuffer();
          ext = 'mp4';
          contentType = 'video/mp4';
        } else {
          const compressed = await manipulateAsync(
            asset.uri,
            [{ resize: { width: 1080 } }],
            { compress: 0.7, format: SaveFormat.JPEG, base64: true }
          );
          if (!compressed.base64) continue;
          bytes = decode(compressed.base64);
          ext = 'jpg';
          contentType = 'image/jpeg';
        }

        const filename = `${user.id}/${checkInId ?? spotId}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filename, bytes, { contentType, upsert: false });
        if (uploadError) {
          console.log('[uploadMedia] storage error:', uploadError.message);
          firstError = firstError ?? `Storage: ${uploadError.message}`;
          continue;
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);

        // For videos, extract a poster frame and upload it as the thumbnail.
        let thumbnailUrl: string | null = null;
        if (asset.type === 'video') {
          try {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
              time: 0,
            });
            const compressed = await manipulateAsync(thumbUri, [{ resize: { width: 1080 } }], {
              compress: 0.7,
              format: SaveFormat.JPEG,
              base64: true,
            });
            if (compressed.base64) {
              const thumbName = `${user.id}/${checkInId ?? spotId}-${Date.now()}-thumb.jpg`;
              const { error: thumbErr } = await supabase.storage
                .from(BUCKET)
                .upload(thumbName, decode(compressed.base64), {
                  contentType: 'image/jpeg',
                  upsert: false,
                });
              if (!thumbErr) {
                thumbnailUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbName).data.publicUrl;
              }
            }
          } catch (e) {
            console.log('[uploadMedia] thumbnail error:', e);
          }
        }

        const { error: insertError } = await supabase.from('check_in_media').insert({
          check_in_id: checkInId,
          user_id: user.id,
          spot_id: spotId,
          url: urlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          media_type: asset.type,
          is_public: true,
        });
        if (insertError) {
          console.log('[uploadMedia] insert error:', insertError.message);
          firstError = firstError ?? `Insert: ${insertError.message}`;
          continue;
        }
        uploaded += 1;

        // Moderate the visible frame: the photo itself, or a video's thumbnail.
        // moderate-image deletes the flagged row + file by url, so point it at
        // the row's primary url (it matches on check_in_media.url).
        const moderationImageUrl = asset.type === 'image' ? urlData.publicUrl : thumbnailUrl;
        if (moderationImageUrl) {
          await supabase.functions.invoke('moderate-image', {
            body: {
              image_url: moderationImageUrl,
              // row is identified/deleted by its primary url (the mp4 for videos)
              match_url: urlData.publicUrl,
              spot_id: spotId,
              user_id: user.id,
              bucket: BUCKET,
              table: 'check_in_media',
            },
          });
        }
      } catch (e: any) {
        console.log('uploadMedia exception:', e);
        firstError = firstError ?? String(e?.message ?? e);
      }
    }

    setUploading(false);
    if (checkInId) await loadMediaForCheckIn(checkInId);
    return { uploaded, error: uploaded === 0 ? firstError : undefined };
  }

  async function deleteMedia(item: CheckInMedia): Promise<void> {
    const filename = item.url.split(`/${BUCKET}/`)[1];
    if (filename) await supabase.storage.from(BUCKET).remove([filename]);
    await supabase.from('check_in_media').delete().eq('id', item.id);
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
    loadMediaForUser,
    uploadMedia,
    deleteMedia,
    clearMedia,
  };
}
