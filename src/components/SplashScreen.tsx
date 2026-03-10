import * as ExpoSplashScreen from 'expo-splash-screen'
import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import LottieView from 'lottie-react-native'

interface SplashScreenProps {
    onFinish: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
    const opacity = useRef(new Animated.Value(1)).current

    useEffect(() => {
        ExpoSplashScreen.hideAsync()

        const timer = setTimeout(() => {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start(onFinish)
        }, 2800)

        return () => clearTimeout(timer)
    }, [])

    return (
        <Animated.View style={[styles.container, { opacity }]}>
            <LottieView
                source={require('../../assets/animations/wheel.json')}
                autoPlay
                loop={false}
                style={styles.animation}
            />
            <Text style={styles.title}>SkateSpot</Text>
            <Text style={styles.subtitle}>find your spot.</Text>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    animation: {
        width: 280,
        height: 280,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: '#f5f0e8',
        letterSpacing: 2,
        marginTop: 12,
        fontFamily: 'monospace',
    },
    subtitle: {
        fontSize: 14,
        color: '#a89880',
        letterSpacing: 4,
        marginTop: 6,
        fontFamily: 'monospace',
    },
})