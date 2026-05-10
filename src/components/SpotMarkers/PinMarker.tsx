import React from 'react';
import Svg, { Path, Ellipse, Rect } from 'react-native-svg';

type Props = {
    color?: string;
    size?: number;
};

export function PinMarker({ color = '#D9D9D9', size = 44 }: Props) {
    const aspect = 0.75;
    const w = size * aspect;
    const h = size;

    return (
        <Svg width={w} height={h} viewBox="0 0 75 100">
            {/* Teardrop pin shape */}
            <Path
                d="M37.5 0 C16.79 0 0 16.79 0 37.5 C0 58.21 37.5 100 37.5 100 C37.5 100 75 58.21 75 37.5 C75 16.79 58.21 0 37.5 0 Z"
                fill={color}
            />
            {/* Skateboard deck */}
            <Ellipse cx="37.5" cy="37" rx="11" ry="19" fill="#1a1a1a" />
            {/* Top truck axle */}
            <Rect
                x="24"
                y="21"
                width="27"
                height="4"
                rx="2"
                fill={color}
                opacity="0.9"
            />
            {/* Top truck hanger */}
            <Rect x="29" y="19" width="17" height="4" rx="2" fill="#1a1a1a" />
            {/* Top wheels left */}
            <Ellipse cx="25" cy="23" rx="3" ry="3" fill={color} opacity="0.9" />
            {/* Top wheels right */}
            <Ellipse cx="50" cy="23" rx="3" ry="3" fill={color} opacity="0.9" />
            {/* Bottom truck axle */}
            <Rect
                x="24"
                y="50"
                width="27"
                height="4"
                rx="2"
                fill={color}
                opacity="0.9"
            />
            {/* Bottom truck hanger */}
            <Rect x="29" y="50" width="17" height="4" rx="2" fill="#1a1a1a" />
            {/* Bottom wheels left */}
            <Ellipse cx="25" cy="52" rx="3" ry="3" fill={color} opacity="0.9" />
            {/* Bottom wheels right */}
            <Ellipse cx="50" cy="52" rx="3" ry="3" fill={color} opacity="0.9" />
        </Svg>
    );
}
