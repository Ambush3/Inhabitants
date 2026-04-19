// @ts-nocheck
// eslint-disable-next-line import/no-unresolved
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
    try {
        const { image_url, spot_id, user_id } = await req.json();

        const imageRes = await fetch(image_url);
        const imageBuffer = await imageRes.arrayBuffer();
        const uint8Array = new Uint8Array(imageBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Image = btoa(binary);

        const visionKey = Deno.env.get('GOOGLE_VISION_API_KEY');
        const response = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requests: [
                        {
                            image: { content: base64Image },
                            features: [{ type: 'SAFE_SEARCH_DETECTION' }],
                        },
                    ],
                }),
            }
        );

        const data = await response.json();
        const safe = data.responses?.[0]?.safeSearchAnnotation;

        if (!safe) {
            return new Response(JSON.stringify({ safe: true }), {
                status: 200,
            });
        }

        const flagged = ['adult', 'violence', 'racy'].some((category) =>
            ['LIKELY', 'VERY_LIKELY'].includes(safe[category])
        );

        if (flagged) {
            if (spot_id) {
                const urlParts = image_url.split(
                    '/storage/v1/object/public/spot-images/'
                );
                const filePath = urlParts[1];
                if (filePath) {
                    await supabase.storage
                        .from('spot-images')
                        .remove([filePath]);
                    await supabase
                        .from('spot_images')
                        .delete()
                        .eq('url', image_url);
                }
                await supabase.functions.invoke('send-push-notification', {
                    body: {
                        spot_id,
                        event_type: 'image_removed',
                        actor_username: 'Moderation System',
                    },
                });
            }
            return new Response(
                JSON.stringify({
                    safe: false,
                    reason: 'Inappropriate content detected',
                }),
                { status: 200 }
            );
        }

        return new Response(JSON.stringify({ safe: true }), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
        });
    }
});
