import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    ScrollView,
    Pressable,
    Image,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/libs/supabase';
import { useTheme } from '@/src/context/ThemeContext';
import { Spot } from '@/src/types';

type PublicReview = {
    id: string;
    spot_id: string;
    spot_name: string;
    rating: number;
    comment: string | null;
    created_at: string;
};

type Props = {
    visible: boolean;
    onClose: () => void;
    userId: string | null;
    onSelectSpot: (spot: Spot) => void;
    allSpots: Spot[];
};

export function PublicProfileModal({
    visible,
    onClose,
    userId,
    onSelectSpot,
    allSpots,
}: Props) {
    const { theme } = useTheme();
    const c = theme.colors;

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [joinDate, setJoinDate] = useState<string | null>(null);
    const [publicSpots, setPublicSpots] = useState<Spot[]>([]);
    const [publicReviews, setPublicReviews] = useState<PublicReview[]>([]);
    const [activeTab, setActiveTab] = useState<'spots' | 'reviews'>('spots');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible || !userId) return;
        async function load() {
            setLoading(true);
            const [profileRes, spotsRes, reviewsRes] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('avatar_url, username, created_at')
                    .eq('id', userId)
                    .single(),
                supabase
                    .from('spots')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('is_private', false)
                    .eq('spot_type', 'spot')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('reviews')
                    .select(
                        'id, spot_id, rating, comment, created_at, spots(name)'
                    )
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false }),
            ]);
            setAvatarUrl(profileRes.data?.avatar_url ?? null);
            setUsername(profileRes.data?.username ?? null);
            setJoinDate(profileRes.data?.created_at ?? null);
            setPublicSpots((spotsRes.data as Spot[]) ?? []);
            setPublicReviews(
                (reviewsRes.data ?? []).map((r: any) => ({
                    id: r.id,
                    spot_id: r.spot_id,
                    spot_name: r.spots?.name ?? 'Unknown spot',
                    rating: r.rating,
                    comment: r.comment,
                    created_at: r.created_at,
                }))
            );
            setLoading(false);
        }
        load();
    }, [visible, userId]);

    const avgRating =
        publicReviews.length === 0
            ? null
            : publicReviews.reduce((sum, r) => sum + r.rating, 0) /
              publicReviews.length;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderColor: c.border,
                    }}
                >
                    <Pressable onPress={onClose} style={{ padding: 4 }}>
                        <Ionicons name="close" size={24} color={c.text} />
                    </Pressable>
                    <Text
                        style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: 16,
                            fontWeight: '700',
                            color: c.text,
                        }}
                    >
                        Profile
                    </Text>
                    <View style={{ width: 32 }} />
                </View>

                {loading ? (
                    <View
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text style={{ color: c.subtext }}>Loading...</Text>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View
                            style={{
                                alignItems: 'center',
                                paddingVertical: 28,
                            }}
                        >
                            {avatarUrl ? (
                                <Image
                                    source={{ uri: avatarUrl }}
                                    style={{
                                        width: 90,
                                        height: 90,
                                        borderRadius: 45,
                                        marginBottom: 12,
                                    }}
                                />
                            ) : (
                                <View
                                    style={{
                                        width: 90,
                                        height: 90,
                                        borderRadius: 45,
                                        backgroundColor: c.tagBg,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 12,
                                    }}
                                >
                                    <Ionicons
                                        name="person-outline"
                                        size={40}
                                        color={c.subtext}
                                    />
                                </View>
                            )}
                            {username ? (
                                <Text
                                    style={{
                                        fontSize: 22,
                                        fontWeight: '700',
                                        color: c.text,
                                        marginBottom: 4,
                                    }}
                                >
                                    @{username}
                                </Text>
                            ) : null}
                            {joinDate ? (
                                <Text
                                    style={{ fontSize: 13, color: c.subtext }}
                                >
                                    Joined{' '}
                                    {new Date(joinDate).toLocaleDateString([], {
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </Text>
                            ) : null}
                        </View>

                        <View
                            style={{
                                flexDirection: 'row',
                                marginHorizontal: 16,
                                marginBottom: 24,
                                borderRadius: 12,
                                backgroundColor: c.tagBg,
                                overflow: 'hidden',
                            }}
                        >
                            <View
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    paddingVertical: 16,
                                    borderRightWidth: 1,
                                    borderColor: c.border,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 22,
                                        fontWeight: '700',
                                        color: c.text,
                                    }}
                                >
                                    {publicSpots.length}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: c.subtext,
                                        marginTop: 2,
                                    }}
                                >
                                    Spots
                                </Text>
                            </View>
                            <View
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    paddingVertical: 16,
                                    borderRightWidth: 1,
                                    borderColor: c.border,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 22,
                                        fontWeight: '700',
                                        color: c.text,
                                    }}
                                >
                                    {publicReviews.length}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: c.subtext,
                                        marginTop: 2,
                                    }}
                                >
                                    Reviews
                                </Text>
                            </View>
                            <View
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    paddingVertical: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 22,
                                        fontWeight: '700',
                                        color: c.text,
                                    }}
                                >
                                    {avgRating ? avgRating.toFixed(1) : '—'}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: c.subtext,
                                        marginTop: 2,
                                    }}
                                >
                                    Avg Rating
                                </Text>
                            </View>
                        </View>

                        <View
                            style={{
                                flexDirection: 'row',
                                marginHorizontal: 16,
                                marginBottom: 16,
                                borderRadius: 8,
                                backgroundColor: c.tagBg,
                                padding: 4,
                            }}
                        >
                            {(['spots', 'reviews'] as const).map((tab) => (
                                <Pressable
                                    key={tab}
                                    onPress={() => setActiveTab(tab)}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 8,
                                        borderRadius: 6,
                                        alignItems: 'center',
                                        backgroundColor:
                                            activeTab === tab
                                                ? c.surface
                                                : 'transparent',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: '600',
                                            color:
                                                activeTab === tab
                                                    ? c.text
                                                    : c.subtext,
                                        }}
                                    >
                                        {tab === 'spots' ? 'Spots' : 'Reviews'}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <View
                            style={{ paddingHorizontal: 16, paddingBottom: 32 }}
                        >
                            {activeTab === 'spots' ? (
                                publicSpots.length === 0 ? (
                                    <Text
                                        style={{
                                            color: c.subtext,
                                            fontSize: 14,
                                            textAlign: 'center',
                                            marginTop: 24,
                                        }}
                                    >
                                        No public spots yet.
                                    </Text>
                                ) : (
                                    publicSpots.map((s) => (
                                        <Pressable
                                            key={s.id}
                                            onPress={() => {
                                                onSelectSpot(s);
                                                onClose();
                                            }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingVertical: 12,
                                                borderBottomWidth: 1,
                                                borderColor: c.border,
                                                gap: 10,
                                            }}
                                        >
                                            <Ionicons
                                                name="location-outline"
                                                size={16}
                                                color={c.subtext}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={{
                                                        fontWeight: '600',
                                                        color: c.text,
                                                    }}
                                                >
                                                    {s.name}
                                                </Text>
                                                {s.tags?.length > 0 ? (
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            color: c.subtext,
                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        {s.tags
                                                            .map((t) => `#${t}`)
                                                            .join(' ')}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <Ionicons
                                                name="chevron-forward"
                                                size={16}
                                                color={c.subtext}
                                            />
                                        </Pressable>
                                    ))
                                )
                            ) : publicReviews.length === 0 ? (
                                <Text
                                    style={{
                                        color: c.subtext,
                                        fontSize: 14,
                                        textAlign: 'center',
                                        marginTop: 24,
                                    }}
                                >
                                    No reviews yet.
                                </Text>
                            ) : (
                                publicReviews.map((r) => (
                                    <Pressable
                                        key={r.id}
                                        onPress={() => {
                                            const spot = allSpots.find(
                                                (s) => s.id === r.spot_id
                                            );
                                            if (spot) {
                                                onSelectSpot(spot);
                                                onClose();
                                            }
                                        }}
                                        style={{
                                            paddingVertical: 14,
                                            borderBottomWidth: 1,
                                            borderColor: c.border,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontWeight: '700',
                                                color: c.text,
                                                marginBottom: 4,
                                            }}
                                        >
                                            {r.spot_name}
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                color: '#F5A623',
                                                letterSpacing: 1,
                                                marginBottom: 4,
                                            }}
                                        >
                                            {'★'.repeat(r.rating)}
                                            {'☆'.repeat(5 - r.rating)}
                                        </Text>
                                        {r.comment ? (
                                            <Text
                                                style={{
                                                    fontSize: 14,
                                                    color: c.text,
                                                    lineHeight: 20,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                {r.comment}
                                            </Text>
                                        ) : null}
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                color: c.subtext,
                                            }}
                                        >
                                            {new Date(
                                                r.created_at
                                            ).toLocaleDateString([], {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </Text>
                                    </Pressable>
                                ))
                            )}
                        </View>
                    </ScrollView>
                )}
            </SafeAreaView>
        </Modal>
    );
}
