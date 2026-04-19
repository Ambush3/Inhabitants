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

type MyReview = {
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
    mySpots: Spot[];
    myReviews: MyReview[];
    onLoadMyReviews: () => Promise<void>;
    onSelectSpot: (spot: Spot) => void;
};

type Tab = 'spots' | 'reviews';

export function ProfileModal({
    visible,
    onClose,
    mySpots,
    myReviews,
    onLoadMyReviews,
    onSelectSpot,
}: Props) {
    const { theme } = useTheme();
    const c = theme.colors;

    const [activeTab, setActiveTab] = useState<Tab>('spots');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [joinDate, setJoinDate] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        async function loadProfile() {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from('profiles')
                .select('avatar_url, username, created_at')
                .eq('id', user.id)
                .single();
            setAvatarUrl(data?.avatar_url ?? null);
            setUsername(data?.username ?? null);
            setJoinDate(data?.created_at ?? null);
        }
        loadProfile();
        onLoadMyReviews();
    }, [visible]);

    const myActualSpots = mySpots.filter((s) => s.spot_type === 'spot');
    const myParks = mySpots.filter((s) => s.spot_type === 'skatepark');
    const myShops = mySpots.filter((s) => s.spot_type === 'skateshop');

    const avgRatingGiven =
        myReviews.length === 0
            ? null
            : myReviews.reduce((sum, r) => sum + r.rating, 0) /
              myReviews.length;

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

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ alignItems: 'center', paddingVertical: 28 }}>
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
                            <Text style={{ fontSize: 13, color: c.subtext }}>
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
                                {mySpots.length}
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
                                {myReviews.length}
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
                                {avgRatingGiven
                                    ? avgRatingGiven.toFixed(1)
                                    : '—'}
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
                        {(['spots', 'reviews'] as Tab[]).map((tab) => (
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
                                    {tab === 'spots'
                                        ? 'My Spots'
                                        : 'My Reviews'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
                        {activeTab === 'spots' ? (
                            mySpots.length === 0 ? (
                                <Text
                                    style={{
                                        color: c.subtext,
                                        fontSize: 14,
                                        textAlign: 'center',
                                        marginTop: 24,
                                    }}
                                >
                                    {"You haven't created any spots yet."}
                                </Text>
                            ) : (
                                <>
                                    {myActualSpots.length > 0 ? (
                                        <View style={{ marginBottom: 16 }}>
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: '600',
                                                    color: c.subtext,
                                                    letterSpacing: 0.8,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                SPOTS
                                            </Text>
                                            {myActualSpots.map((s) => (
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
                                                                fontWeight:
                                                                    '600',
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
                                                                    .map(
                                                                        (t) =>
                                                                            `#${t}`
                                                                    )
                                                                    .join(' ')}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    {s.is_private ? (
                                                        <Ionicons
                                                            name="lock-closed"
                                                            size={14}
                                                            color={c.danger}
                                                        />
                                                    ) : null}
                                                    <Ionicons
                                                        name="chevron-forward"
                                                        size={16}
                                                        color={c.subtext}
                                                    />
                                                </Pressable>
                                            ))}
                                        </View>
                                    ) : null}
                                    {myParks.length > 0 ? (
                                        <View style={{ marginBottom: 16 }}>
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: '600',
                                                    color: c.subtext,
                                                    letterSpacing: 0.8,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                PARKS
                                            </Text>
                                            {myParks.map((s) => (
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
                                                        name="flag-outline"
                                                        size={16}
                                                        color={c.subtext}
                                                    />
                                                    <Text
                                                        style={{
                                                            flex: 1,
                                                            fontWeight: '600',
                                                            color: c.text,
                                                        }}
                                                    >
                                                        {s.name}
                                                    </Text>
                                                    <Ionicons
                                                        name="chevron-forward"
                                                        size={16}
                                                        color={c.subtext}
                                                    />
                                                </Pressable>
                                            ))}
                                        </View>
                                    ) : null}
                                    {myShops.length > 0 ? (
                                        <View style={{ marginBottom: 16 }}>
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: '600',
                                                    color: c.subtext,
                                                    letterSpacing: 0.8,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                SHOPS
                                            </Text>
                                            {myShops.map((s) => (
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
                                                        name="storefront-outline"
                                                        size={16}
                                                        color={c.subtext}
                                                    />
                                                    <Text
                                                        style={{
                                                            flex: 1,
                                                            fontWeight: '600',
                                                            color: c.text,
                                                        }}
                                                    >
                                                        {s.name}
                                                    </Text>
                                                    <Ionicons
                                                        name="chevron-forward"
                                                        size={16}
                                                        color={c.subtext}
                                                    />
                                                </Pressable>
                                            ))}
                                        </View>
                                    ) : null}
                                </>
                            )
                        ) : myReviews.length === 0 ? (
                            <Text
                                style={{
                                    color: c.subtext,
                                    fontSize: 14,
                                    textAlign: 'center',
                                    marginTop: 24,
                                }}
                            >
                                {"You haven't left any reviews yet."}
                            </Text>
                        ) : (
                            myReviews.map((r) => (
                                <View
                                    key={r.id}
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
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}
