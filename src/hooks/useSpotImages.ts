import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

export function useSpotImages() {
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    async function loadImages(spotId: string) {
        const { data, error } = await supabase
            .from('spot_images')
            .select('url')
            .eq('spot_id', spotId)
            .order('created_at', { ascending: true });

        if (error) return;
        setImages((data ?? []).map((r: any) => r.url));
    }

    async function uploadImages(spotId: string, uris: string[]): Promise<void> {
        setUploading(true);
        console.log('uploadImages called, spotId:', spotId, 'uris:', uris.length);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('user:', user?.id, 'userError:', userError);
        if (!user) { setUploading(false); return; }

        for (const uri of uris) {
            try {
                console.log('Processing uri:', uri);
                const compressed = await manipulateAsync(
                    uri,
                    [{ resize: { width: 1080 } }],
                    { compress: 0.7, format: SaveFormat.JPEG, base64: true }
                );
                console.log('Compressed, has base64:', !!compressed.base64);
                if (!compressed.base64) continue;

                const filename = `${user.id}/${spotId}-${Date.now()}.jpg`;
                console.log('Uploading filename:', filename);

                const { error: uploadError } = await supabase.storage
                    .from('spot-images')
                    .upload(filename, decode(compressed.base64), {
                        contentType: 'image/jpeg',
                        upsert: false,
                    });

                console.log('uploadError:', uploadError);
                if (uploadError) continue;

                const { data: urlData } = supabase.storage
                    .from('spot-images')
                    .getPublicUrl(filename);

                console.log('publicUrl:', urlData.publicUrl);

                const { error: insertError } = await supabase.from('spot_images').insert({
                    spot_id: spotId,
                    user_id: user.id,
                    url: urlData.publicUrl,
                });
                console.log('insertError:', insertError);

            } catch (e) {
                console.log('Exception:', e);
            }
        }

        setUploading(false);
        await loadImages(spotId);
    }

    async function deleteImage(spotId: string, url: string): Promise<void> {
        const filename = url.split('/spot-images/')[1];
        if (!filename) return;
        await supabase.storage.from('spot-images').remove([filename]);
        await supabase.from('spot_images').delete().eq('url', url);
        await loadImages(spotId);
    }

    function clearImages() {
        setImages([]);
    }

    return { images, uploading, loadImages, uploadImages, deleteImage, clearImages };
}