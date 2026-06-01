import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
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
    const link = `skatespotapp:///join?ref=${user.id}`;
    await Share.share({
      message: `Join me on Inhabitants — the skate spot finder. Download the app and sign up here: ${link}`,
    });
  }

  async function inviteViaContacts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return;

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });

    const withPhone = (data ?? []).filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0);

    return withPhone;
  }

  async function sendSMSInvite(phoneNumbers: string[], userId: string) {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) return;

    const link = `skatespotapp:///join?ref=${userId}`;
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
