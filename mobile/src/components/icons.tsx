// Tab and UI icons: 24dp, 2dp square-capped strokes, to sit with the kit's 2dp borders.

import type { ColorValue } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

interface IconProps {
  color: ColorValue;
  size?: number;
}

const stroke = { strokeWidth: 2, strokeLinecap: "square", strokeLinejoin: "miter", fill: "none" } as const;

/** A court seen from above. */
export function CourtIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={3} width={16} height={18} stroke={color} {...stroke} />
      <Line x1={4} y1={12} x2={20} y2={12} stroke={color} {...stroke} />
      <Circle cx={12} cy={12} r={2.5} stroke={color} {...stroke} />
    </Svg>
  );
}

/** A ticket with a notch: a booking. */
export function TicketIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z" stroke={color} {...stroke} />
      <Line x1={14} y1={7} x2={14} y2={17} stroke={color} strokeWidth={2} strokeDasharray="2 2" />
    </Svg>
  );
}

export function PersonIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} stroke={color} {...stroke} />
      <Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke={color} {...stroke} />
    </Svg>
  );
}

export function ArrowDownIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1={12} y1={4} x2={12} y2={18} stroke={color} {...stroke} />
      <Path d="M6 13l6 6 6-6" stroke={color} {...stroke} />
      <Line x1={4} y1={22} x2={20} y2={22} stroke={color} {...stroke} />
    </Svg>
  );
}

export function ChevronIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 5l7 7-7 7" stroke={color} {...stroke} />
    </Svg>
  );
}

export function CalendarIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={5} width={18} height={16} stroke={color} {...stroke} />
      <Line x1={3} y1={10} x2={21} y2={10} stroke={color} {...stroke} />
      <Line x1={8} y1={3} x2={8} y2={6} stroke={color} {...stroke} />
      <Line x1={16} y1={3} x2={16} y2={6} stroke={color} {...stroke} />
    </Svg>
  );
}

/** Floodlight pole: tonight at the venue. */
export function FloodlightIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={6} y={3} width={12} height={6} stroke={color} {...stroke} />
      <Line x1={12} y1={9} x2={12} y2={21} stroke={color} {...stroke} />
      <Line x1={8} y1={21} x2={16} y2={21} stroke={color} {...stroke} />
    </Svg>
  );
}

/** A venue building with a roof line. */
export function VenueIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 10l9-6 9 6v11H3z" stroke={color} {...stroke} />
      <Rect x={9} y={14} width={6} height={7} stroke={color} {...stroke} />
    </Svg>
  );
}
