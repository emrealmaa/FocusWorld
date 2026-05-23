import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { ZONES } from '../constants/zones';

const buildFogValues = (discoveredZones) =>
  ZONES.reduce((acc, zone) => {
    acc[zone.id] = new Animated.Value(discoveredZones.includes(zone.id) ? 0 : 1);
    return acc;
  }, {});

export const useMapFog = (discoveredZones = []) => {
  const fogOpacities = useRef(buildFogValues(discoveredZones)).current;
  const [revealingZoneId, setRevealingZoneId] = useState(null);
  const [revealBanner, setRevealBanner] = useState(null);
  const prevDiscovered = useRef([...discoveredZones]);

  // Sync fog when discoveredZones changes from Firestore (no animation — instant)
  useEffect(() => {
    ZONES.forEach((zone) => {
      if (discoveredZones.includes(zone.id)) {
        // Only animate zones newly added since last render
        if (!prevDiscovered.current.includes(zone.id)) {
          triggerRevealAnimation(zone.id);
        } else {
          fogOpacities[zone.id].setValue(0);
        }
      }
    });
    prevDiscovered.current = [...discoveredZones];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(discoveredZones)]);

  const triggerRevealAnimation = (zoneId) => {
    const zone = ZONES.find((z) => z.id === zoneId);
    if (!zone) return;

    setRevealingZoneId(zoneId);
    fogOpacities[zoneId].setValue(1);

    Animated.timing(fogOpacities[zoneId], {
      toValue: 0,
      duration: 1800,
      useNativeDriver: true,
    }).start(() => {
      setRevealingZoneId(null);
      setRevealBanner({ id: zone.id, name: zone.name, emoji: zone.emoji });
      setTimeout(() => setRevealBanner(null), 3500);
    });
  };

  const dismissBanner = () => setRevealBanner(null);

  return {
    fogOpacities,
    revealingZoneId,
    revealBanner,
    dismissBanner,
  };
};
