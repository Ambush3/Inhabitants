import { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/hooks/useAuth';

export default function Join() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const { session, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (ref) await AsyncStorage.setItem('pending_referral_id', ref);
      setReady(true);
    })();
  }, [ref]);

  if (loading || !ready) return null;
  return <Redirect href={session ? '/' : '/auth'} />;
}
