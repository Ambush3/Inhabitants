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
    subtitle: 'The community-driven map for skaters. Find spots, parks, and shops near you.',
  },
  {
    id: '2',
    emoji: '📍',
    title: 'Reading the Map',
    subtitle:
      'Your spots show as gray pins. Friends appear in purple. Other skaters are cream. Green pins are skate parks and blue pins are skate shops.',
  },
  {
    id: '3',
    emoji: '✋',
    title: 'Add a Spot',
    subtitle:
      'Long press anywhere on the map to drop a pin and create a new spot. Add tags, photos, and a rating. Vetted users can also add skate parks and shops.',
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
      'Set a profile picture, add your first and last name, track your spots and reviews, and edit your username. Access your profile from the menu footer.',
  },
  {
    id: '6',
    emoji: '👥',
    title: 'Add Friends',
    subtitle:
      "Tap any other skater's username or pin to view their public profile, then tap Add Friend. Cancel a request by tapping Request Sent. Accept incoming requests from your profile.",
  },
  {
    id: '7',
    emoji: '🔒',
    title: 'Spot Visibility',
    subtitle:
      'Each spot you create can be Public (everyone), Friends (only your friends), or Private (only you). Swipe right on a spot in Mine to change visibility anytime. Tap a pin to select it — your pins highlight in gold.',
  },
  {
    id: '8',
    emoji: '🟣',
    title: 'Friend Spots on the Map',
    subtitle:
      "Pins from your friends show in purple so you can spot them quickly. Friends-only spots appear only if you're connected.",
  },
  {
    id: '9',
    emoji: '🔔',
    title: 'Notifications & Activity',
    subtitle:
      'A red badge on the menu shows pending friend requests and unread activity. Open the menu to see who reviewed, bookmarked, or flagged your spots — tap a row to jump to it.',
  },
  {
    id: '10',
    emoji: '📰',
    title: 'Friend Feed',
    subtitle:
      'The Feed tab in the menu shows what your friends are doing — new spots they created and reviews they left. Tap any item to open the spot.',
  },
  {
    id: '11',
    emoji: '🤘',
    title: 'Crews',
    subtitle:
      'Create or join crews to skate with your group. Invite friends, share spots to the crew, and tap any member to open their profile. Manage invites from the Crews menu.',
  },
  {
    id: '12',
    emoji: '🎬',
    title: 'Photos & Videos',
    subtitle:
      'Add photos and clips to any spot — anyone can contribute. After a check-in you can attach a session to your passport. Tap a thumbnail to swipe through them full screen; videos autoplay.',
  },
  {
    id: '13',
    emoji: '💬',
    title: 'Like & Comment',
    subtitle:
      'Give a thumbs up and leave comments on any photo or video. Find all of your own uploads under Profile → Lists → Media, where you can hold to select and delete several at once.',
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
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
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
        }}>
        <Text
          style={{
            color: c.subtext,
            fontSize: 14,
            fontWeight: '600',
          }}>
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
            }}>
            <Text style={{ fontSize: 80, marginBottom: 32 }}>{item.emoji}</Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: c.text,
                textAlign: 'center',
                marginBottom: 16,
                letterSpacing: 0.3,
              }}>
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: c.subtext,
                textAlign: 'center',
                lineHeight: 24,
              }}>
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
          }}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentIndex ? 20 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === currentIndex ? c.text : c.border,
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
          }}>
          <Text
            style={{
              color: c.background,
              fontSize: 16,
              fontWeight: '700',
            }}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
