# Inhabitants

A community-driven skateboarding spot finder built with React Native and Expo. Skaters can discover, add, and review spots, skate parks, and skate shops near them — and connect with friends to share the spots they find.

## Features

- Interactive map with color-coded teardrop pins for your spots, friends, strangers, parks, and shops
- Long press the map to create a spot with photos, tags, and a rating
- Tag-based search filtered to your current map view
- Find nearby skate parks and skate shops via Google Places
- Top rated spots nearby
- Friends system with friend requests, visibility controls, and a social feed
- Spot visibility: Public, Friends Only, or Private
- Push notifications for reviews, saves, flags, friend requests, and more
- Vetted account system for adding parks and shops
- Dark mode support
- Profile pages with stats, spots, and review history

## Tech Stack

- React Native / Expo
- Expo Router (file-based routing)
- Supabase (auth, database, storage)
- react-native-maps
- react-native-svg
- EAS Build and Submit

## Get Started

1. Install dependencies

```bash
npm install
```

2. Start the app

```bash
npx expo start
```

For a full native build on iOS simulator:

```bash
npx expo run:ios
```

## Environment Variables

Set the following in your EAS dashboard or `.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`

## Project Structure

- `app/` — screens and routing
- `src/components/` — UI components including map markers
- `src/hooks/` — data fetching and business logic
- `src/libs/` — Supabase client and utilities
- `assets/` — images, icons, animations
