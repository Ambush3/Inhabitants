import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from '@/src/components/onboarding/OnboardingScreen';

export default function Onboarding() {
    async function handleFinish() {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        router.replace('/');
    }

    return <OnboardingScreen onFinish={handleFinish} />;
}