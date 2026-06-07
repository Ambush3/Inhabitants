# Inhabitants

A community-driven skateboarding spot finder built with React Native and Expo. Skaters can discover, add, and review spots, skate parks, and skate shops — connect with friends, track their visits, and explore the skating world around them.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Building and Deploying](#building-and-deploying)
- [Versioning](#versioning)

---

## Features

### Map & Spots

- Interactive map with color-coded teardrop SVG pins — gray for your spots, purple for friends, cream for others, green for parks, blue for shops, gold for selected
- Long press the map to create a spot with name, description, tags, photos, rating, and visibility
- Spot visibility: Public, Friends Only, or Private
- Tag-based search filtered to the current map view
- Nearby skate parks and skate shops via Google Places API
- Top rated spots in the current map area
- Community flagging system with warning banners at 3+ flags
- Verified spot badges after 3 or more unique ratings
- Spot conditions reporting (wet, crowded, perfect, etc.) with 24hr expiry
- Spot editing for owners — name, description, tags
- Share spots via Apple Maps or Google Maps links

### Social

- Friend requests with send, accept, decline, and cancel
- Ability to create crews and share spots privately inside those specific crews
- Bulk remove friends via long press selection
- Social feed showing spots created and reviews left by friends
- Friends-only spot visibility
- Public profile pages with stats, spots, and reviews
- Activity notifications for reviews, saves, wishlists, flags, and conditions on your spots
- Real-time updates for friendships, spots, and activity

### Spot Passport

- Check in at spots to track every visit
- Personal passport tab on your profile showing all visited spots with full visit history
- Unique skater count displayed on each spot (deduped by user)
- 24hr feed cooldown — repeated same-day check-ins don't spam the feed
- Per-visit privacy toggle and delete
- Global Public Check-ins toggle in Settings

### Events

- Create skate sessions with title, description, date, time, and location
- Link events to existing spots or drop a custom map pin
- Visibility: Public, Friends Only, or Invite Only
- RSVP system — Going, Maybe, Not Going
- Attendee list visible to the event creator
- Invite friends to private events
- Edit and cancel events after creation
- Push notifications for event invites with deep link to the Invited tab
- Event reminders 24 hours and 1 hour before for Going RSVPs
- Unread badges on the Events tab and hamburger menu

### Notifications

- Push notifications via Expo Notifications
- Deep links from notifications directly into spot details, profile, crews, and events
- Per-type notification preferences in Settings
- In-app activity feed for spot-level events

### Offline Mode

- Spots and favorites cached to AsyncStorage on every successful load
- Cached spots render on the map when offline
- Offline banner shown when disconnected or when cache is older than 24 hours
- Network state detection via `@react-native-community/netinfo`

### Profile & Settings

- Avatar upload with image compression and AI content moderation
- Username, first name, and last name
- Badge system — Local, Regular, and Ambassador tiers based on spot review activity
- Dark mode with preference persisted to AsyncStorage and Supabase
- Password reset via email
- Account deletion with server-side RPC
- What's New modal shown once per version on first login after an update

### Moderation

- Text moderation on spot names, descriptions, tags, comments, and event content
- Image moderation via Supabase Edge Function on avatar and spot photo uploads
- Vetted account system — only vetted accounts can create skate parks and shops

---

## Tech Stack

| Layer          | Technology                                             |
| -------------- | ------------------------------------------------------ |
| Framework      | React Native + Expo SDK                                |
| Routing        | Expo Router (file-based)                               |
| Backend        | Supabase (PostgreSQL, Auth, Storage, Edge Functions)   |
| Map            | react-native-maps + react-native-map-clustering        |
| Notifications  | Expo Notifications                                     |
| Build & Deploy | EAS Build + EAS Submit                                 |
| Image handling | expo-image-picker + expo-image-manipulator             |
| Gestures       | react-native-gesture-handler + react-native-reanimated |
| Haptics        | expo-haptics                                           |
| Location       | expo-location                                          |
| Offline        | @react-native-community/netinfo + AsyncStorage         |
| Storage        | @react-native-async-storage/async-storage              |

---

## Architecture

### Hooks-first data layer

All data fetching and business logic lives in `src/hooks/`. Components are kept as thin as possible — they receive data and callbacks as props and render UI. No data fetching happens inside components directly.

### Supabase as the backend

- **Auth** — email/password with session persistence
- **Database** — PostgreSQL with Row Level Security on every table
- **Storage** — avatars and spot photos in separate buckets
- **Edge Functions** — image moderation via external API
- **Realtime** — used for friendships, notifications, and feed updates
- **RPC** — account deletion via a server-side function to cascade cleanly

### Offline caching

Spots and favorites are written to `AsyncStorage` after every successful fetch. On app start, the cache is loaded immediately. If the device is offline, the cached data is used as the source of truth for the map. A stale banner appears if the cache is older than 24 hours.

### Theme system

Dark mode preference is stored in both Supabase (so it syncs across devices on login) and `AsyncStorage` (so it loads instantly before the session is established, and persists through sign out).

### Push notifications

Expo push tokens are stored per user in the `profiles` table. Notifications are sent server-side via `sendPushNotification` using the Expo Push API. Deep links are handled via `expo-router` params and `AsyncStorage` for notifications received while the app is closed.

---

## Project Structure

```
app/
  index.tsx              # Main map screen and root navigator
  reset-password.tsx     # Password reset handler

src/
  components/
    SpotDetailsModal.tsx       # Full spot detail sheet
    SpotCommentsModal.tsx      # Comments thread for a spot
    CollectionsModal.tsx       # Add spot to a collection
    CreateSpotModal.tsx        # New spot creation flow
    ExplorePanel.tsx           # Side panel — explore, feed, events, favorites
    SettingsPanel.tsx          # Settings drawer
    ProfileModal.tsx           # Own profile with passport tab
    PublicProfileModal.tsx     # Other users' profiles
    WhatsNewModal.tsx          # Version update highlights popup
    SkateShopDetailsModal.tsx  # Place details for parks and shops
    CreateEventModal.tsx       # Event creation and editing
    EventDetailsModal.tsx      # Event details with RSVP
    SplashScreen.tsx           # Animated splash
    AnimatedSpotCard.tsx       # Animated list item wrapper
    crews/
      AddSpotToCrewModal.tsx
      CreateCrewModal.tsx
      CrewDetailModal.tsx
      CrewsModal.tsx
    onboarding/
      OnboardingScreen.tsx
    profile/
      ProfileModal.tsx
      PublicProfileModal.tsx
    SpotMarkers/
      MySpotMarker.tsx
      OtherUsersSpotMarkers.tsx
      SkateMarker.tsx

  hooks/
    useSpots.ts                # Spot CRUD, search, visibility
    useReviews.ts              # Reviews and ratings
    useSpotImages.ts           # Image upload and deletion
    useSpotConditions.ts       # Conditions reporting
    useCheckIns.ts             # Passport check-ins
    useFavorites.ts            # Saved spots
    useWishlist.ts             # Wishlisted spots
    useCollections.ts          # User collections
    useNearbyPlaces.ts         # Google Places integration
    useTopRated.ts             # Top rated spots in area
    useAuth.ts                 # Auth session
    useEvents.ts               # Events CRUD and RSVPs
    useNotifications.ts        # In-app activity notifications
    useNotificationPreferences.ts
    usePushNotifications.ts    # Expo push token registration
    useSocialFeed.ts           # Friend activity feed
    useWhatsNew.ts             # Version-gated What's New modal
    offlineCache/
      useOfflineCache.ts       # AsyncStorage spot caching
    social/
      useFriendships.ts
    flaggingSystem/
      useSpotFlags.ts
      useReviewFlags.ts

  libs/
    supabase.ts                # Supabase client
    sendPushNotification.ts    # Expo Push API helper
    moderator/
      textModerator.ts         # Client-side text moderation

  context/
    ThemeContext.tsx            # Dark mode with AsyncStorage + Supabase persistence

  types/
    index.ts                   # Spot, Review, Place, and other shared types

  changelog.ts                 # In-app version history

assets/
  pin-images/                  # SVG and PNG map marker assets
  animations/                  # Lottie files

scripts/
  bump-version.js              # Auto-bumps changelog version — run with npm run new-version
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- An Apple Developer account (for iOS builds)
- A Supabase project
- A Google Places API key

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npx expo start
```

### Run on iOS simulator

```bash
npx expo run:ios
```

### Run a full native build

```bash
npx eas build --platform ios --profile preview
```

---

## Environment Variables

Set the following in your EAS dashboard under the project's environment variables, or in a local `.env` file for development:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=
```

> Never commit `.env` to version control. Add it to `.gitignore`.

---

## Database

Key Supabase tables:

| Table              | Purpose                                                  |
| ------------------ | -------------------------------------------------------- |
| `profiles`         | User profile, avatar, badge, dark mode, check-in privacy |
| `spots`            | All spots with location, type, visibility, flags         |
| `reviews`          | Ratings and comments per spot per user                   |
| `spot_images`      | Photo URLs linked to spots                               |
| `spot_conditions`  | Active conditions per spot with expiry                   |
| `check_ins`        | Passport check-ins with privacy flag                     |
| `friendships`      | Friend requests and accepted friendships                 |
| `notifications`    | In-app activity notifications                            |
| `collections`      | Named spot collections per user                          |
| `collection_spots` | Junction table for collections                           |
| `events`           | Skate sessions with location and visibility              |
| `event_rsvps`      | RSVP records per event per user                          |
| `event_invites`    | Invite records for invite-only events                    |
| `spot_comments`    | Comment threads per spot                                 |
| `spot_flags`       | Community flags per spot                                 |
| `review_flags`     | Community flags per review                               |

Row Level Security is enabled on all tables. Users can only read and write their own data except where explicitly permitted (e.g. public spots, public check-ins, public profiles).

---

## Building and Deploying

### TestFlight (iOS)

Build:

```bash
npx eas build --platform ios --profile preview
```

Submit to App Store Connect:

```bash
npx eas submit --platform ios
```

Then add the build to a TestFlight external group in App Store Connect and submit for Beta App Review.

### EAS profiles

Defined in `eas.json`:

- `development` — development client build for local testing
- `preview` — TestFlight distribution build
- `production` — App Store release build

---

## Versioning

In-app versioning uses a separate version string from the App Store build number.

- In-app versions (`1.0`, `1.1`, `1.5` etc.) live in `src/changelog.ts`
- App Store build numbers increment independently with each EAS submission
- The `WhatsNewModal` shows the first 4 entries from the latest changelog version, displayed once per version per user

To bump the in-app version for a new release:

```bash
npm run new-version
```

This auto-increments the version, adds a new empty changelog entry, and sets the date. Fill in the `changes` array as you build, then ship.
