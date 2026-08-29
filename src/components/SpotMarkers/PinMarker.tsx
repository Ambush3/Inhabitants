import React from 'react';
import Svg, { Path, Image, Ellipse, G } from 'react-native-svg';
import { GLYPH_SIZE, DEFAULT_GLYPH_VIEWBOX } from '@/src/config/markerStyles';

type Props = {
    color?: string;
    size?: number;
    icon: any;
    iconX?: number;
    iconY?: number;
    iconWidth?: number;
    iconHeight?: number;
    /** SVG path data — one or more subpaths. Takes precedence over `icon`. */
    glyphPath?: string | string[] | null;
    /** viewBox the glyph path was drawn in. */
    glyphViewBox?: string;
    glyphColor?: string;
};

export function PinMarker({
    color = '#D9D9D9',
    size = 30,
    icon,
    iconX = 8,
    iconY = 10,
    iconWidth = 59,
    iconHeight = 59,
    glyphPath = null,
    glyphViewBox = DEFAULT_GLYPH_VIEWBOX,
    glyphColor = '#1C1C1E',
}: Props) {
    const w = size * 0.75;
    const h = size;

    const [vbX, vbY, vbW, vbH] = glyphViewBox.split(/[\s,]+/).map(Number);
    const glyphScale = GLYPH_SIZE / Math.max(vbW || 100, vbH || 100);
    const glyphX = 37.5 - ((vbW || 100) * glyphScale) / 2 - (vbX || 0) * glyphScale;
    const glyphY = 36.5 - ((vbH || 100) * glyphScale) / 2 - (vbY || 0) * glyphScale;

    return (
        <Svg width={w} height={h} viewBox="0 0 75 104">
            <Ellipse cx={37.5} cy={99} rx={12} ry={3.5} fill="#000" opacity={0.3} />
            <Path
                d="M37.5 2 C18.5 2 3 17.5 3 36.5 C3 55.5 37.5 98 37.5 98 C37.5 98 72 55.5 72 36.5 C72 17.5 56.5 2 37.5 2 Z"
                fill={color}
                stroke="white"
                strokeWidth={3}
            />
            {glyphPath ? (
                <G transform={`translate(${glyphX}, ${glyphY}) scale(${glyphScale})`}>
                    {(Array.isArray(glyphPath) ? glyphPath : [glyphPath]).map((d, i) => (
                        <Path key={i} d={d} fill={glyphColor} />
                    ))}
                </G>
            ) : (
                <Image
                    x={iconX}
                    y={iconY}
                    width={iconWidth}
                    height={iconHeight}
                    href={icon}
                    preserveAspectRatio="xMidYMid meet"
                />
            )}
        </Svg>
    );
}
