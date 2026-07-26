import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { supabase } from '@/src/libs/supabase';
import { REVENUECAT_IOS_API_KEY, PRO_ENTITLEMENT, IAP_CONFIGURED } from '@/src/config/iap';

type ProContextType = {
  isPro: boolean;
  loading: boolean;
  offering: PurchasesOffering | null;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

const ProContext = createContext<ProContextType>({
  isPro: false,
  loading: true,
  offering: null,
  purchase: async () => false,
  restore: async () => false,
  refresh: async () => {},
});

let configured = false;

function hasPro(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active[PRO_ENTITLEMENT];
}

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

  useEffect(() => {
    if (!IAP_CONFIGURED || Platform.OS === 'web') {
      setLoading(false);
      return;
    }

    if (!configured) {
      Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
      configured = true;
    }

    const listener = (info: CustomerInfo) => setIsPro(hasPro(info));
    Purchases.addCustomerInfoUpdateListener(listener);

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) await Purchases.logIn(user.id);
        const info = await Purchases.getCustomerInfo();
        setIsPro(hasPro(info));
        const offerings = await Purchases.getOfferings();
        setOffering(offerings.current ?? null);
      } catch {
      } finally {
        setLoading(false);
      }
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        Purchases.logIn(session.user.id).catch(() => {});
      } else {
        Purchases.getAppUserID()
          .then((id) => {
            if (!id.startsWith('$RCAnonymousID')) Purchases.logOut().catch(() => {});
          })
          .catch(() => {});
      }
    });

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
      authSub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ is_pro: isPro }).eq('id', user.id);
    })();
  }, [isPro, loading]);

  async function purchase(pkg: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = hasPro(customerInfo);
      setIsPro(active);
      return active;
    } catch (e: any) {
      if (!e?.userCancelled) throw e;
      return false;
    }
  }

  async function restore(): Promise<boolean> {
    const info = await Purchases.restorePurchases();
    const active = hasPro(info);
    setIsPro(active);
    return active;
  }

  async function refresh(): Promise<void> {
    if (!IAP_CONFIGURED) return;
    try {
      const info = await Purchases.getCustomerInfo();
      setIsPro(hasPro(info));
    } catch {}
  }

  return (
    <ProContext.Provider value={{ isPro, loading, offering, purchase, restore, refresh }}>
      {children}
    </ProContext.Provider>
  );
}

export function usePro() {
  return useContext(ProContext);
}
