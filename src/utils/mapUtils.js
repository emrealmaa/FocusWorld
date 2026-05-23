import { ZONE_STATE } from '../constants/zones';

export const getZoneState = (zoneId, userDiscoveredZones = [], zoneData = null) => {
  if (!userDiscoveredZones.includes(zoneId)) return ZONE_STATE.HIDDEN;
  if (zoneData?.isRestored) return ZONE_STATE.RESTORED;
  return ZONE_STATE.DISCOVERED;
};

export const getZoneProgressPercent = (currentPomodoros, required) => {
  if (!required || required === 0) return 100;
  return Math.min(100, Math.floor((currentPomodoros / required) * 100));
};

export const getNextRevealableZone = (zones, userDiscoveredZones) => {
  const hidden = zones.filter((z) => !userDiscoveredZones.includes(z.id));
  if (hidden.length === 0) return null;
  return hidden[Math.floor(Math.random() * hidden.length)];
};

export const getExplorationPercent = (userDiscoveredZones, totalZones) => {
  if (!totalZones || totalZones === 0) return 0;
  return Math.floor((userDiscoveredZones.length / totalZones) * 100);
};

export const hitTestZone = (zones, mapX, mapY) =>
  zones.find((z) => {
    const dx = mapX - z.x;
    const dy = mapY - z.y;
    return Math.sqrt(dx * dx + dy * dy) <= (z.radius ?? 40) + 8;
  }) ?? null;
