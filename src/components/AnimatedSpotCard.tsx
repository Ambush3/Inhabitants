import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

interface AnimatedSpotCardProps {
    index: number
    children: React.ReactNode
    staggerDelay?: number
}

export function AnimatedSpotCard({ index, children, staggerDelay = 40 }: AnimatedSpotCardProps) {
    const opacity = useRef(new Animated.Value(0)).current
    const translateY = useRef(new Animated.Value(8)).current

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 180,
                delay: index * staggerDelay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 180,
                delay: index * staggerDelay,
                useNativeDriver: true,
            }),
        ]).start()
    }, [index, staggerDelay, opacity, translateY])

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            {children}
        </Animated.View>
    )
}
