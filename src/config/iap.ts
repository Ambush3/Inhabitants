export const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

export const PRO_ENTITLEMENT = 'Inhabitants Pro';

export const PRODUCT_IDS = {
  monthly: 'com.aaronbush.inhabitants.pro.monthly',
  annual: 'com.aaronbush.inhabitants.pro.annual',
};

export const FREE_MEDIA_PER_SPOT = 5;

export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_URL = 'https://www.termsfeed.com/live/0f374443-94bb-421d-90f4-214568206801';

export const IAP_CONFIGURED = REVENUECAT_IOS_API_KEY.length > 0;
