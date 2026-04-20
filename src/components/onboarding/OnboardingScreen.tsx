import React, { useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';

const { width } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        emoji: '🛹',
        title: 'Welcome to Spots',
        subtitle:
            'The community-driven map for skaters. Find spots, parks, and shops near you.',
    },
    {
        id: '2',
        emoji: '📍',
        title: 'Explore the Map',
        subtitle:
            "Gold circular pins are your spots. Dark pins are other skaters' spots — they turn red when selected. Skate parks and shops have their own icons.",
    },
    {
        id: '3',
        emoji: '✋',
        title: 'Add a Spot',
        subtitle:
            'Long press anywhere on the map to drop a pin and create a new spot. Add tags, photos, and a rating.',
    },
    {
        id: '4',
        emoji: '☰',
        title: 'Explore Nearby',
        subtitle:
            'Tap the menu to find local skate parks, skate shops, and top rated spots in your area. Search by tag to find specific types of spots like stairs or rails.',
    },
    {
        id: '5',
        emoji: '👤',
        title: 'Your Profile',
        subtitle:
            'Set a profile picture, track your spots and reviews, and edit your username. Access your profile from the menu footer.',
    },
];

type Props = {
    onFinish: () => void;
};

export function OnboardingScreen({ onFinish }: Props) {
    const { theme } = useTheme();
    const c = theme.colors;
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0)
            setCurrentIndex(viewableItems[0].index ?? 0);
    });

    function goNext() {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        } else {
            onFinish();
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
            <Pressable
                onPress={onFinish}
                style={{
                    position: 'absolute',
                    top: 56,
                    right: 20,
                    zIndex: 10,
                    padding: 8,
                }}
            >
                <Text
                    style={{
                        color: c.subtext,
                        fontSize: 14,
                        fontWeight: '600',
                    }}
                >
                    Skip
                </Text>
            </Pressable>

            <FlatList
                ref={flatListRef}
                data={slides}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onViewableItemsChanged={onViewableItemsChanged.current}
                viewabilityConfig={viewabilityConfig.current}
                renderItem={({ item }) => (
                    <View
                        style={{
                            width,
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 40,
                        }}
                    >
                        <Text style={{ fontSize: 80, marginBottom: 32 }}>
                            {item.emoji}
                        </Text>
                        <Text
                            style={{
                                fontSize: 28,
                                fontWeight: '800',
                                color: c.text,
                                textAlign: 'center',
                                marginBottom: 16,
                                letterSpacing: 0.3,
                            }}
                        >
                            {item.title}
                        </Text>
                        <Text
                            style={{
                                fontSize: 16,
                                color: c.subtext,
                                textAlign: 'center',
                                lineHeight: 24,
                            }}
                        >
                            {item.subtitle}
                        </Text>
                    </View>
                )}
            />

            <View style={{ paddingHorizontal: 24, paddingBottom: 48 }}>
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8,
                        marginBottom: 32,
                    }}
                >
                    {slides.map((_, i) => (
                        <View
                            key={i}
                            style={{
                                width: i === currentIndex ? 20 : 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor:
                                    i === currentIndex ? c.text : c.border,
                            }}
                        />
                    ))}
                </View>

                <Pressable
                    onPress={goNext}
                    style={{
                        backgroundColor: c.buttonBg,
                        borderRadius: 14,
                        padding: 16,
                        alignItems: 'center',
                    }}
                >
                    <Text
                        style={{
                            color: c.background,
                            fontSize: 16,
                            fontWeight: '700',
                        }}
                    >
                        {currentIndex === slides.length - 1
                            ? 'Get Started'
                            : 'Next'}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
