export const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

export const PRO_ENTITLEMENT = 'Inhabitants Pro';

export const PRODUCT_IDS = {
  monthly: 'com.aaronbush.inhabitants.pro.monthly',
  annual: 'com.aaronbush.inhabitants.pro.annual',
};

export const FREE_MEDIA_PER_SPOT = 5;

export const FREE_VIDEO_DURATION_SEC = 60;
export const PRO_VIDEO_DURATION_SEC = 180;

export const FREE_VIDEO_MB = 75;
export const PRO_VIDEO_MB = 200;

export function videoDurationLimit(isPro: boolean) {
  return isPro ? PRO_VIDEO_DURATION_SEC : FREE_VIDEO_DURATION_SEC;
}

export function videoSizeLimitMb(isPro: boolean) {
  return isPro ? PRO_VIDEO_MB : FREE_VIDEO_MB;
}

export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_URL = 'https://www.termsfeed.com/live/0f374443-94bb-421d-90f4-214568206801';

export const IAP_CONFIGURED = REVENUECAT_IOS_API_KEY.length > 0;
