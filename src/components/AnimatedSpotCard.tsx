import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

interface AnimatedSpotCardProps {
    index: number
    children: React.ReactNode
}

export function AnimatedSpotCard({ index, children }: AnimatedSpotCardProps) {
    const opacity = useRef(new Animated.Value(0)).current
    const translateY = useRef(new Animated.Value(16)).current

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 250,
                delay: index * 60,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 250,
                delay: index * 60,
                useNativeDriver: true,
            }),
        ]).start()
    }, [])

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            {children}
        </Animated.View>
    )
}