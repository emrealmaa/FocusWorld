import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { onSnapshot, doc, collection, query, where } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { ZONES } from '../../constants/zones';
import { useAuth } from '../../context/AuthContext';
import { useMapFog } from '../../hooks/useMapFog';
import FogMap from '../../components/FogMap';
import ZoneCard from '../../components/ZoneCard';
import { db } from '../../services/firebase';
import { getExplorationPercent } from '../../utils/mapUtils';

const { width: SCREEN_W } = Dimensions.get('window');

const DiscoveryBanner = ({ zone, onDismiss }) => {
  const slideY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideY, { toValue: -80, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start(onDismiss);
    }, 3200);

    return () => clearTimeout(timer);
  }, [zone?.id]);

  if (!zone) return null;

  return (
    <Animated.View
      style={[styles.discoveryBanner, { transform: [{ translateY: slideY }], opacity }]}
    >
      <Text style={styles.bannerFlag}>⚑</Text>
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle}>New Area Discovered!</Text>
        <Text style={styles.bannerZone}>
          {zone.emoji} {zone.name}
        </Text>
      </View>
      <TouchableOpacity onPress={onDismiss}>
        <Text style={styles.bannerClose}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const MapScreen = () => {
  const navigation = useNavigation();
  const { user, profile } = useAuth();

  const [discoveredZones, setDiscoveredZones] = useState(profile?.discoveredZones ?? []);
  const [zoneFirestoreData, setZoneFirestoreData] = useState({});
  const [selectedZone, setSelectedZone] = useState(null);
  const [loading, setLoading] = useState(true);

  const { fogOpacities, revealingZoneId, revealBanner, dismissBanner } = useMapFog(discoveredZones);

  // Listen to user document for discoveredZones changes
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setDiscoveredZones(snap.data().discoveredZones ?? []);
      }
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  // Listen to zone documents for live progress
  useEffect(() => {
    const zoneIds = ZONES.map((z) => z.id);
    const unsubscribers = zoneIds.map((zoneId) =>
      onSnapshot(doc(db, 'zones', zoneId), (snap) => {
        if (snap.exists()) {
          setZoneFirestoreData((prev) => ({ ...prev, [zoneId]: snap.data() }));
        }
      }),
    );
    return () => unsubscribers.forEach((u) => u());
  }, []);

  const handleZonePress = useCallback((zone) => {
    setSelectedZone(zone);
  }, []);

  const handleContribute = useCallback(
    (zone) => {
      navigation.navigate('Focus', { contributingZoneId: zone.id, contributingZoneName: zone.name });
    },
    [navigation],
  );

  const explorationPct = getExplorationPercent(discoveredZones, ZONES.length);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>World Map</Text>
          <Text style={styles.headerSub}>
            {discoveredZones.length} / {ZONES.length} zones discovered
          </Text>
        </View>
        <View style={styles.explorationBadge}>
          <Text style={styles.explorationPct}>{explorationPct}%</Text>
          <Text style={styles.explorationLabel}>explored</Text>
        </View>
      </View>

      {/* Exploration bar */}
      <View style={styles.explorationBarTrack}>
        <View style={[styles.explorationBarFill, { width: `${explorationPct}%` }]} />
      </View>

      {/* Discovery banner */}
      <DiscoveryBanner zone={revealBanner} onDismiss={dismissBanner} />

      {/* Map */}
      <View style={styles.mapContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.waveActive} style={styles.loader} />
        ) : (
          <FogMap
            fogOpacities={fogOpacities}
            discoveredZones={discoveredZones}
            zoneFirestoreData={zoneFirestoreData}
            revealingZoneId={revealingZoneId}
            onZonePress={handleZonePress}
          />
        )}
      </View>

      {/* Hint for empty state */}
      {!loading && discoveredZones.length === 0 && (
        <View style={styles.emptyHint} pointerEvents="none">
          <Text style={styles.emptyHintText}>
            🌫️ Complete focus sessions to lift the fog
          </Text>
        </View>
      )}

      {/* Zone legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.fog }]} />
          <Text style={styles.legendText}>Hidden</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.waveActive }]} />
          <Text style={styles.legendText}>Discovered</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.waveComplete }]} />
          <Text style={styles.legendText}>Restored</Text>
        </View>
        <Text style={styles.legendHint}>Pinch to zoom · Drag to pan</Text>
      </View>

      {/* Zone card */}
      {selectedZone && (
        <ZoneCard
          zone={selectedZone}
          zoneData={zoneFirestoreData[selectedZone.id]}
          userDiscoveredZones={discoveredZones}
          userId={user?.uid}
          onClose={() => setSelectedZone(null)}
          onContribute={handleContribute}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080D1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  explorationBadge: {
    alignItems: 'flex-end',
  },
  explorationPct: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.waveActive,
    fontVariant: ['tabular-nums'],
  },
  explorationLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  explorationBarTrack: {
    height: 3,
    backgroundColor: COLORS.surfaceLight,
    marginHorizontal: 18,
    borderRadius: 2,
    marginBottom: 0,
    overflow: 'hidden',
  },
  explorationBarFill: {
    height: '100%',
    backgroundColor: COLORS.waveActive,
    borderRadius: 2,
  },
  mapContainer: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignSelf: 'center',
    marginTop: 100,
  },
  emptyHint: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyHintText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: `${COLORS.surface}CC`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: `${COLORS.surface}EE`,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  legendHint: {
    flex: 1,
    textAlign: 'right',
    fontSize: 10,
    color: COLORS.textMuted,
    opacity: 0.6,
  },
  discoveryBanner: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.waveActive,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: COLORS.waveActive,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  bannerFlag: {
    fontSize: 22,
    color: COLORS.waveActive,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 12,
    color: COLORS.waveActive,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bannerZone: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '800',
    marginTop: 2,
  },
  bannerClose: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '600',
    padding: 4,
  },
});

export default MapScreen;
