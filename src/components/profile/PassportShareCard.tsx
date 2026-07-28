import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import QRCode from 'react-native-qrcode-svg';
import { CrownIcon } from '@/src/components/icons/CrownIcon';

type Props = {
  username: string | null;
  avatarUrl: string | null;
  spotsVisited: number;
  totalCheckIns: number;
  parksSkated?: number;
  longestStreak: number;
  mostSkatedSpot: string | null;
  profileUrl?: string | null;
};

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <View
      style={{
        width: '47%',
        backgroundColor: '#1F1F22',
        borderRadius: 14,
        padding: 14,
      }}>
      <Text
        numberOfLines={1}
        style={{ color: '#FFB300', fontSize: small ? 15 : 24, fontWeight: '800' }}>
        {value}
      </Text>
      <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

export function PassportShareCard({
  username,
  avatarUrl,
  spotsVisited,
  totalCheckIns,
  parksSkated,
  longestStreak,
  mostSkatedSpot,
  profileUrl,
}: Props) {
  return (
    <View style={{ width: 340, backgroundColor: '#141416', borderRadius: 24, padding: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Inhabitants</Text>
        <CrownIcon size={22} />
      </View>

      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 8 }}
          />
        ) : null}
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
          @{username ?? 'skater'}
        </Text>
        <Text style={{ color: '#8E8E93', fontSize: 12, marginTop: 2 }}>Skate Passport</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
        <Stat label="Spots Skated" value={String(spotsVisited)} />
        <Stat label="Spot Check-ins" value={String(totalCheckIns)} />
        {parksSkated != null ? <Stat label="Parks Skated" value={String(parksSkated)} /> : null}
        <Stat label="Longest Streak" value={`${longestStreak}d`} />
        <Stat label="Top Spot" value={mostSkatedSpot ?? '—'} small />
      </View>

      {profileUrl ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginTop: 22,
            paddingTop: 18,
            borderTopWidth: 1,
            borderTopColor: '#26262A',
          }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 6 }}>
            <QRCode value={profileUrl} size={52} backgroundColor="#fff" color="#141416" />
          </View>
          <Text style={{ flex: 1, color: '#8E8E93', fontSize: 12, lineHeight: 17 }}>
            Scan to see my spots on Inhabitants
          </Text>
        </View>
      ) : (
        <Text style={{ color: '#8E8E93', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          Find your spots on Inhabitants
        </Text>
      )}
    </View>
  );
}
