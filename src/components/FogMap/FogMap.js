import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  PanResponder,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Path, Rect, G, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import {
  ZONES,
  ZONE_CONNECTIONS,
  ZONE_COLORS,
  ZONE_ACCENT_COLORS,
  ZONE_STATE,
  MAP_WIDTH,
  MAP_HEIGHT,
} from '../../constants/zones';
import { getZoneState } from '../../utils/mapUtils';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MIN_SCALE = 0.55;
const MAX_SCALE = 2.8;
const INITIAL_SCALE = Math.max(SCREEN_W / MAP_WIDTH, 0.65);
const TAP_THRESHOLD_PX = 8;
const TAP_THRESHOLD_MS = 280;

// Build a dashed path string between two zone centers
const buildConnectionPath = (zA, zB) => {
  const ax = zA.x;
  const ay = zA.y;
  const bx = zB.x;
  const by = zB.y;
  const mx = (ax + bx) / 2 + (by - ay) * 0.1;
  const my = (ay + by) / 2 + (ax - bx) * 0.1;
  return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
};

// Fog swirl decoration — static SVG circles inside fog
const FogTexture = ({ cx, cy, r }) => (
  <>
    <Circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke="#263050" strokeWidth={1.5} opacity={0.4} />
    <Circle cx={cx - r * 0.2} cy={cy + r * 0.2} r={r * 0.25} fill="none" stroke="#263050" strokeWidth={1} opacity={0.3} />
    <Circle cx={cx + r * 0.25} cy={cy - r * 0.15} r={r * 0.2} fill="none" stroke="#1C2340" strokeWidth={1} opacity={0.2} />
  </>
);

// Individual zone rendered in SVG
const ZoneShape = ({ zone, state }) => {
  const cx = zone.x;
  const cy = zone.y;
  const r = zone.radius;
  const accentColor = ZONE_ACCENT_COLORS[zone.type] ?? COLORS.waveActive;
  const baseColor = ZONE_COLORS[zone.type] ?? '#1A1A2E';

  if (state === ZONE_STATE.HIDDEN) {
    return (
      <G>
        <Circle cx={cx} cy={cy} r={r} fill={COLORS.fog} opacity={0.6} />
        <FogTexture cx={cx} cy={cy} r={r} />
      </G>
    );
  }

  if (state === ZONE_STATE.RESTORED) {
    return (
      <G>
        {/* Outer glow */}
        <Circle cx={cx} cy={cy} r={r + 10} fill={accentColor} opacity={0.15} />
        <Circle cx={cx} cy={cy} r={r + 5} fill={accentColor} opacity={0.1} />
        {/* Zone body */}
        <Circle cx={cx} cy={cy} r={r} fill={baseColor} />
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.waveComplete} strokeWidth={3} opacity={0.9} />
        {/* Inner glow */}
        <Circle cx={cx} cy={cy} r={r * 0.7} fill={accentColor} opacity={0.12} />
        <SvgText
          x={cx}
          y={cy + 7}
          fontSize={r * 0.62}
          textAnchor="middle"
          fill={COLORS.text}
        >
          {zone.emoji}
        </SvgText>
        <SvgText x={cx} y={cy + r + 16} fontSize={11} textAnchor="middle" fill={COLORS.waveComplete} fontWeight="700">
          ✨ {zone.name}
        </SvgText>
      </G>
    );
  }

  // DISCOVERED
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={baseColor} />
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={accentColor} strokeWidth={2} opacity={0.7} />
      <Circle cx={cx} cy={cy} r={r * 0.7} fill={accentColor} opacity={0.08} />
      <SvgText
        x={cx}
        y={cy + 7}
        fontSize={r * 0.58}
        textAnchor="middle"
        fill={COLORS.text}
      >
        {zone.emoji}
      </SvgText>
      <SvgText x={cx} y={cy + r + 16} fontSize={10} textAnchor="middle" fill={COLORS.textMuted}>
        {zone.name}
      </SvgText>
    </G>
  );
};

// Connection path between zones
const ZoneConnection = ({ fromZone, toZone, bothDiscovered }) => {
  const path = buildConnectionPath(fromZone, toZone);
  return (
    <Path
      d={path}
      stroke={bothDiscovered ? '#2D4060' : '#1C2340'}
      strokeWidth={bothDiscovered ? 2 : 1}
      strokeDasharray={bothDiscovered ? '6 4' : '3 6'}
      fill="none"
      opacity={bothDiscovered ? 0.7 : 0.3}
    />
  );
};

// Tap-invisible overlay for hit testing (separate from SVG)
const ZoneTapTarget = ({ zone, onPress, scale }) => {
  const r = zone.radius;
  return (
    <TouchableWithoutFeedback onPress={() => onPress(zone)}>
      <View
        style={{
          position: 'absolute',
          left: zone.x - r,
          top: zone.y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
        }}
      />
    </TouchableWithoutFeedback>
  );
};

// Animated fog overlay per zone (absolutely positioned over the SVG)
const FogOverlay = ({ zone, opacity }) => {
  const r = zone.radius;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: zone.x - r - 4,
        top: zone.y - r - 4,
        width: (r + 4) * 2,
        height: (r + 4) * 2,
        borderRadius: (r + 4),
        backgroundColor: COLORS.fog,
        opacity,
      }}
      pointerEvents="none"
    />
  );
};

// Pulsing reveal ring shown during fog reveal animation
const RevealRing = ({ zone }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.6, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const r = zone.radius;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: zone.x - r,
        top: zone.y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        borderWidth: 3,
        borderColor: COLORS.waveActive,
        opacity,
        transform: [{ scale }],
      }}
      pointerEvents="none"
    />
  );
};

const FogMap = ({
  fogOpacities,
  discoveredZones = [],
  zoneFirestoreData = {},
  revealingZoneId,
  onZonePress,
}) => {
  const scale = useRef(new Animated.Value(INITIAL_SCALE)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const lastScale = useRef(INITIAL_SCALE);
  const lastPan = useRef({ x: 0, y: 0 });
  const pinchDistance = useRef(null);
  const touchStart = useRef({ time: 0, x: 0, y: 0 });
  const isPinching = useRef(false);

  const getDistance = (touches) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length > 1,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > TAP_THRESHOLD_PX || Math.abs(g.dy) > TAP_THRESHOLD_PX,

      onPanResponderGrant: (evt, g) => {
        isPinching.current = false;
        pinchDistance.current = null;
        touchStart.current = {
          time: Date.now(),
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };
        pan.setOffset({ x: lastPan.current.x, y: lastPan.current.y });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: (evt, g) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          isPinching.current = true;
          const dist = getDistance(touches);
          if (pinchDistance.current === null) {
            pinchDistance.current = dist;
          } else {
            const ratio = dist / pinchDistance.current;
            const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, lastScale.current * ratio));
            scale.setValue(newScale);
          }
        } else if (!isPinching.current) {
          pan.setValue({ x: g.dx, y: g.dy });
        }
      },

      onPanResponderRelease: (evt, g) => {
        pan.flattenOffset();
        lastPan.current = { x: pan.x._value, y: pan.y._value };

        if (isPinching.current) {
          lastScale.current = scale._value;
          pinchDistance.current = null;
          isPinching.current = false;
          return;
        }

        // Tap detection
        const duration = Date.now() - touchStart.current.time;
        const dist = Math.sqrt(g.dx * g.dx + g.dy * g.dy);
        if (dist < TAP_THRESHOLD_PX && duration < TAP_THRESHOLD_MS) {
          // Convert screen coords to map coords
          const mapX = (evt.nativeEvent.pageX - lastPan.current.x) / lastScale.current;
          const mapY = (evt.nativeEvent.pageY - lastPan.current.y) / lastScale.current;
          const hit = ZONES.find((z) => {
            const dx = mapX - z.x;
            const dy = mapY - z.y;
            return Math.sqrt(dx * dx + dy * dy) <= z.radius + 8;
          });
          if (hit) onZonePress?.(hit);
        }
      },

      onPanResponderTerminate: () => {
        pan.flattenOffset();
        lastPan.current = { x: pan.x._value, y: pan.y._value };
      },
    }),
  ).current;

  const mapTransform = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { scale },
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.canvas, mapTransform]} {...panResponder.panHandlers}>
        {/* Base SVG map */}
        <Svg width={MAP_WIDTH} height={MAP_HEIGHT}>
          {/* Ocean/ground background */}
          <Rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#080D1A" />

          {/* Subtle grid */}
          {Array.from({ length: 14 }).map((_, i) => (
            <Path
              key={`vg${i}`}
              d={`M ${i * 60} 0 L ${i * 60} ${MAP_HEIGHT}`}
              stroke="#0F1520"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <Path
              key={`hg${i}`}
              d={`M 0 ${i * 62} L ${MAP_WIDTH} ${i * 62}`}
              stroke="#0F1520"
              strokeWidth={1}
            />
          ))}

          {/* Zone connection paths */}
          {ZONE_CONNECTIONS.map(([aId, bId]) => {
            const zA = ZONES.find((z) => z.id === aId);
            const zB = ZONES.find((z) => z.id === bId);
            if (!zA || !zB) return null;
            const both = discoveredZones.includes(aId) && discoveredZones.includes(bId);
            return (
              <ZoneConnection key={`${aId}-${bId}`} fromZone={zA} toZone={zB} bothDiscovered={both} />
            );
          })}

          {/* Zone shapes */}
          {ZONES.map((zone) => {
            const state = getZoneState(zone.id, discoveredZones, zoneFirestoreData[zone.id]);
            return <ZoneShape key={zone.id} zone={zone} state={state} />;
          })}
        </Svg>

        {/* Fog overlays — animated per zone */}
        {ZONES.map((zone) => {
          if (discoveredZones.includes(zone.id) && fogOpacities[zone.id]._value === 0) return null;
          return (
            <FogOverlay
              key={zone.id}
              zone={zone}
              opacity={fogOpacities[zone.id]}
            />
          );
        })}

        {/* Reveal ring for currently-animating zone */}
        {revealingZoneId && (() => {
          const zone = ZONES.find((z) => z.id === revealingZoneId);
          return zone ? <RevealRing zone={zone} /> : null;
        })()}

        {/* Tap targets for non-hidden discovered/restored zones */}
        {ZONES.map((zone) => {
          const state = getZoneState(zone.id, discoveredZones, zoneFirestoreData[zone.id]);
          if (state === ZONE_STATE.HIDDEN) return null;
          return (
            <ZoneTapTarget key={zone.id} zone={zone} onPress={onZonePress} scale={lastScale.current} />
          );
        })}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080D1A',
    overflow: 'hidden',
  },
  canvas: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  },
});

export default FogMap;
