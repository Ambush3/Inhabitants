import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import QRCode from 'react-native-qrcode-svg';
import { CrownIcon } from '@/src/components/icons/CrownIcon';

type Props = {
  username: string | null;
  avatarUrl: string | null;
  daysSkated: number;
  weekCheckIns: number;
  newSpots: number;
  week: boolean[];
  profileUrl?: string | null;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#1F1F22', borderRadius: 14, padding: 14 }}>
      <Text style={{ color: '#FFB300', fontSize: 24, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

export function WeeklyRecapCard({
  username,
  avatarUrl,
  daysSkated,
  weekCheckIns,
  newSpots,
  week,
  profileUrl,
}: Props) {
  return (
    <View style={{ width: 340, backgroundColor: '#141416', borderRadius: 24, padding: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>This Week</Text>
        <CrownIcon size={22} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
          />
        ) : null}
        <View>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
            @{username ?? 'skater'}
          </Text>
          <Text style={{ color: '#8E8E93', fontSize: 12, marginTop: 2 }}>
            {daysSkated} of 7 days skated
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
        {week.map((skated, i) => (
          <View
            key={i}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: skated ? '#34C759' : '#26262A',
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat label="Check-ins" value={String(weekCheckIns)} />
        <Stat label="New Spots" value={String(newSpots)} />
      </View>

      {profileUrl ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginTop: 20,
            paddingTop: 18,
            borderTopWidth: 1,
            borderTopColor: '#26262A',
          }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 6 }}>
            <QRCode value={profileUrl} size={48} backgroundColor="#fff" color="#141416" />
          </View>
          <Text style={{ flex: 1, color: '#8E8E93', fontSize: 12, lineHeight: 17 }}>
            Follow my sessions on Inhabitants
          </Text>
        </View>
      ) : null}
    </View>
  );
}
