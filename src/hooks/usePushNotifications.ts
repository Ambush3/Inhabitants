import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/src/libs/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

let hasHandledLastNotification = false;
let hasHandledTap = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications(
  userId: string | null,
  session: any,
  onSpotOpen?: (spotId: string, lat: number, lng: number) => void,
  onOpenProfile?: () => void,
  onOpenPublicProfile?: (userId: string) => void,
  onMarkSpotNotificationRead?: (spotId: string) => void,
  onOpenEvents?: () => void,
  onOpenCrewInvites?: () => void,
  onOpenCrewDetail?: (crewId: string) => void,
  onOpenPlace?: (placeId: string) => void
) {
  const sessionRef = useRef(session);
  const onSpotOpenRef = useRef(onSpotOpen);
  const onOpenProfileRef = useRef(onOpenProfile);
  const onOpenPublicProfileRef = useRef(onOpenPublicProfile);

  const onMarkSpotNotificationReadRef = useRef(onMarkSpotNotificationRead);
  const onOpenEventsRef = useRef(onOpenEvents);
  const onOpenCrewInvitesRef = useRef(onOpenCrewInvites);
  const onOpenCrewDetailRef = useRef(onOpenCrewDetail);
  const onOpenPlaceRef = useRef(onOpenPlace);

  useEffect(() => {
    onMarkSpotNotificationReadRef.current = onMarkSpotNotificationRead;
  }, [onMarkSpotNotificationRead]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    onSpotOpenRef.current = onSpotOpen;
  }, [onSpotOpen]);
  useEffect(() => {
    onOpenProfileRef.current = onOpenProfile;
  }, [onOpenProfile]);
  useEffect(() => {
    onOpenPublicProfileRef.current = onOpenPublicProfile;
  }, [onOpenPublicProfile]);
  useEffect(() => {
    onOpenEventsRef.current = onOpenEvents;
  }, [onOpenEvents]);
  useEffect(() => {
    onOpenCrewInvitesRef.current = onOpenCrewInvites;
  }, [onOpenCrewInvites]);
  useEffect(() => {
    onOpenCrewDetailRef.current = onOpenCrewDetail;
  }, [onOpenCrewDetail]);
  useEffect(() => {
    onOpenPlaceRef.current = onOpenPlace;
  }, [onOpenPlace]);

  useEffect(() => {
    (async () => {
      const response = Notifications.getLastNotificationResponse();
      if (response && !hasHandledLastNotification) {
        hasHandledLastNotification = true;
        const data = response.notification.request.content.data as Record<string, any>;
        const url = data?.url as string;
        if (url?.includes('friend_accepted')) {
          const params = new URLSearchParams(url.split('?')[1]);
          const actorId = params.get('actorId');
          if (actorId) {
            await AsyncStorage.setItem('pendingNotificationPublicProfile', actorId);
          }
        } else if (url?.includes('friend_request')) {
          await AsyncStorage.setItem('pendingNotificationProfile', 'true');
        } else if (url?.includes('events')) {
          await AsyncStorage.setItem('pendingNotificationEvents', 'true');
        } else if (url?.includes('openCrewInvites')) {
          await AsyncStorage.setItem('pendingNotificationCrewInvites', 'true');
        } else if (url?.includes('openCrewId')) {
          const params = new URLSearchParams(url.split('?')[1]);
          const crewId = params.get('openCrewId');
          if (crewId) await AsyncStorage.setItem('pendingNotificationCrewDetail', crewId);
        } else if (url?.includes('deepLinkPlaceId')) {
          const params = new URLSearchParams(url.split('?')[1]);
          const placeId = params.get('deepLinkPlaceId');
          if (placeId) await AsyncStorage.setItem('pendingNotificationPlace', placeId);
        } else if (url) {
          const params = new URLSearchParams(url.split('?')[1]);
          const spot_id = params.get('deepLinkSpotId');
          const lat = params.get('deepLinkLat');
          const lng = params.get('deepLinkLng');
          if (spot_id && lat && lng) {
            await AsyncStorage.setItem('pendingNotificationSpot', JSON.stringify({ spot_id, lat, lng }));
          }
        }
      }
    })();

    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      if (hasHandledTap) return;
      hasHandledTap = true;
      setTimeout(() => {
        hasHandledTap = false;
      }, 2000);

      const data = response.notification.request.content.data as Record<string, any>;
      const url = data?.url as string;
      if (!url) return;

      if (url.includes('friend_accepted')) {
        const params = new URLSearchParams(url.split('?')[1]);
        const actorId = params.get('actorId');
        if (!actorId) return;
        if (sessionRef.current) {
          onOpenPublicProfileRef.current?.(actorId);
        } else {
          await AsyncStorage.setItem('pendingNotificationPublicProfile', actorId);
        }
        return;
      }

      if (url.includes('friend_request')) {
        if (sessionRef.current) {
          onOpenProfileRef.current?.();
        } else {
          await AsyncStorage.setItem('pendingNotificationProfile', 'true');
        }
        return;
      }

      if (url.includes('events')) {
        if (sessionRef.current) {
          onOpenEventsRef.current?.();
        } else {
          await AsyncStorage.setItem('pendingNotificationEvents', 'true');
        }
        return;
      }

      if (url.includes('openCrewInvites')) {
        if (sessionRef.current) {
          onOpenCrewInvitesRef.current?.();
        } else {
          await AsyncStorage.setItem('pendingNotificationCrewInvites', 'true');
        }
        return;
      }

      if (url.includes('openCrewId')) {
        const crewParams = new URLSearchParams(url.split('?')[1]);
        const crewId = crewParams.get('openCrewId');
        if (!crewId) return;
        if (sessionRef.current) {
          onOpenCrewDetailRef.current?.(crewId);
        } else {
          await AsyncStorage.setItem('pendingNotificationCrewDetail', crewId);
        }
        return;
      }

      if (url.includes('deepLinkPlaceId')) {
        const placeParams = new URLSearchParams(url.split('?')[1]);
        const placeId = placeParams.get('deepLinkPlaceId');
        if (!placeId) return;
        if (sessionRef.current) {
          onOpenPlaceRef.current?.(placeId);
        } else {
          await AsyncStorage.setItem('pendingNotificationPlace', placeId);
        }
        return;
      }

      const params = new URLSearchParams(url.split('?')[1]);
      const spot_id = params.get('deepLinkSpotId');
      const lat = params.get('deepLinkLat');
      const lng = params.get('deepLinkLng');

      if (sessionRef.current) {
        if (spot_id && lat && lng) {
          onSpotOpenRef.current?.(spot_id, parseFloat(lat), parseFloat(lng));
          onMarkSpotNotificationReadRef.current?.(spot_id);
        }
      } else {
        await AsyncStorage.setItem('pendingNotificationSpot', JSON.stringify({ spot_id, lat, lng }));
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!userId) return;
    registerToken(userId);
  }, [userId]);

  async function registerToken(userId: string) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token: tokenData.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  }
}
