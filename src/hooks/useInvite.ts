import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Share } from 'react-native';
import { supabase } from '@/src/libs/supabase';

const PENDING_REFERRAL_KEY = 'pending_referral_id';

export function useInvite() {
  const [inviterId, setInviterId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PENDING_REFERRAL_KEY).then((val) => {
      if (val) setInviterId(val);
    });
  }, []);

  async function storeReferral(refId: string) {
    await AsyncStorage.setItem(PENDING_REFERRAL_KEY, refId);
    setInviterId(refId);
  }

  async function clearReferral() {
    await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
    setInviterId(null);
  }

  async function shareInviteLink() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const link = `https://inhabitants.chottu.link/join?ref=${user.id}`;
    await Share.share({
      message: `Join me on Inhabitants — the skate spot finder. Download the app and sign up here: ${link}`,
    });
  }

  async function inviteViaContacts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const Contacts = await import('expo-contacts');

    const perm = await Contacts.requestPermissionsAsync();
    if (perm.status !== 'granted') return;

    if (Platform.OS === 'ios' && perm.accessPrivileges === 'limited') {
      try {
        await Contacts.presentAccessPickerAsync();
      } catch { }
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });

    const withPhone = (data ?? []).filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0);

    return withPhone;
  }

  async function sendSMSInvite(phoneNumbers: string[], userId: string) {
    const SMS = await import('expo-sms');
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) return;
    const link = `https://inhabitants.chottu.link/join?ref=${userId}`;
    await SMS.sendSMSAsync(phoneNumbers, `Join me on Inhabitants — the skate spot finder! Sign up here: ${link}`);
  }

  return {
    inviterId,
    storeReferral,
    clearReferral,
    shareInviteLink,
    inviteViaContacts,
    sendSMSInvite,
  };
}
