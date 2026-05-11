import React from 'react';
import Svg, { Path, Image, Defs, ClipPath, Rect } from 'react-native-svg';

type Props = {
    color?: string;
    size?: number;
    icon: any;
    iconX?: number;
    iconY?: number;
    iconWidth?: number;
    iconHeight?: number;
};

export function PinMarker({
    color = '#D9D9D9',
    size = 44,
    icon,
    iconX = 8,
    iconY = 10,
    iconWidth = 59,
    iconHeight = 59,
}: Props) {
    const w = size * 0.75;
    const h = size;

    return (
        <Svg width={w} height={h} viewBox="0 0 75 100">
            <Path
                d="M37.5 2 C18.5 2 3 17.5 3 36.5 C3 55.5 37.5 98 37.5 98 C37.5 98 72 55.5 72 36.5 C72 17.5 56.5 2 37.5 2 Z"
                fill={color}
            />
            <Image
                x={iconX}
                y={iconY}
                width={iconWidth}
                height={iconHeight}
                href={icon}
                preserveAspectRatio="xMidYMid meet"
            />
        </Svg>
    );
}
