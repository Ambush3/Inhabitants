import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '@/src/context/ThemeContext';
import { useToast, ToastHost } from '@/src/context/ToastContext';
import { usePro } from '@/src/context/ProContext';
import { TERMS_URL, PRIVACY_URL, IAP_CONFIGURED } from '@/src/config/iap';

type Props = {
  visible: boolean;
  onClose: () => void;
  headline?: string;
};

const PRO_FEATURES = [
  'Unlimited photos & videos on every spot',
  'See who has skated your spots',
  'Shareable Skate Passport card',
  'Pro status on your profile',
  'Support an indie skate app',
];

function packageLabel(pkg: PurchasesPackage): string {
  const t = pkg.packageType;
  if (t === 'ANNUAL') return 'Annual';
  if (t === 'MONTHLY') return 'Monthly';
  return pkg.product.title || t;
}

export function PaywallModal({ visible, onClose, headline }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const toast = useToast();
  const { offering, purchase, restore, loading } = usePro();
  const [busy, setBusy] = useState(false);

  const packages = offering?.availablePackages ?? [];

  async function handleBuy(pkg: PurchasesPackage) {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await purchase(pkg);
      if (ok) {
        toast.success('You’re Pro! 🎉');
        onClose();
      }
    } catch {
      toast.error('Purchase failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await restore();
      toast.show(ok ? 'Purchases restored' : 'Nothing to restore');
      if (ok) onClose();
    } catch {
      toast.error('Restore failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible ? <ToastHost /> : null}
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={26} color={c.subtext} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 6 }}>
            Inhabitants Pro
          </Text>
          <Text style={{ fontSize: 15, color: c.subtext, marginBottom: 24 }}>
            {headline ?? 'Unlock everything and support an indie skate app.'}
          </Text>

          <View style={{ gap: 12, marginBottom: 28 }}>
            {PRO_FEATURES.map((f) => (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="checkmark-circle" size={20} color={c.accent} />
                <Text style={{ fontSize: 15, color: c.text, flex: 1 }}>{f}</Text>
              </View>
            ))}
          </View>

          {!IAP_CONFIGURED ? (
            <Text style={{ color: c.subtext, fontSize: 13, textAlign: 'center' }}>
              Subscriptions aren’t available yet.
            </Text>
          ) : loading ? (
            <ActivityIndicator color={c.accent} />
          ) : packages.length === 0 ? (
            <Text style={{ color: c.subtext, fontSize: 13, textAlign: 'center' }}>
              Plans are loading. Check back shortly.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {packages.map((pkg) => (
                <Pressable
                  key={pkg.identifier}
                  onPress={() => handleBuy(pkg)}
                  disabled={busy}
                  style={{
                    borderRadius: 14,
                    backgroundColor: c.accent,
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: busy ? 0.6 : 1,
                  }}>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                    {packageLabel(pkg)}
                  </Text>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                    {pkg.product.priceString}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable onPress={handleRestore} disabled={busy} style={{ marginTop: 18, alignItems: 'center' }}>
            <Text style={{ color: c.accent, fontSize: 14, fontWeight: '600' }}>Restore Purchases</Text>
          </Pressable>

          <Text
            style={{ color: c.subtext, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 20 }}>
            7-day free trial, then the selected price. Subscriptions auto-renew unless canceled at least 24
            hours before the end of the period. Manage or cancel anytime in your App Store account settings.
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 }}>
            <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={{ color: c.subtext, fontSize: 12, textDecorationLine: 'underline' }}>
                Terms
              </Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={{ color: c.subtext, fontSize: 12, textDecorationLine: 'underline' }}>
                Privacy
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
