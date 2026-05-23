import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { ZONE_ACCENT_COLORS, ZONE_STATE } from '../../constants/zones';
import { getZoneProgressPercent } from '../../utils/mapUtils';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_H * 0.55;

const ZoneCard = ({ zone, zoneData, userDiscoveredZones = [], userId, onClose, onContribute }) => {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  };

  if (!zone) return null;

  const isDiscovered = userDiscoveredZones.includes(zone.id);
  const isRestored = zoneData?.isRestored ?? false;
  const zoneState = isRestored
    ? ZONE_STATE.RESTORED
    : isDiscovered
    ? ZONE_STATE.DISCOVERED
    : ZONE_STATE.HIDDEN;

  const currentPomodoros = zoneData?.currentTotalPomodoros ?? 0;
  const required = zone.pomodorosRequired;
  const progressPct = getZoneProgressPercent(currentPomodoros, required);
  const accentColor = ZONE_ACCENT_COLORS[zone.type] ?? COLORS.waveActive;
  const userContribution = zoneData?.contributors?.[userId] ?? 0;

  const topContributors = Object.entries(zoneData?.contributors ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>{zone.emoji}</Text>
            <View style={styles.headerText}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.typeBadge, { backgroundColor: `${accentColor}22`, borderColor: accentColor }]}>
                  <Text style={[styles.typeBadgeText, { color: accentColor }]}>
                    {zone.type.replace(/_/g, ' ')}
                  </Text>
                </View>
                {zone.groupRequired && (
                  <View style={styles.groupBadge}>
                    <Text style={styles.groupBadgeText}>👥 Group</Text>
                  </View>
                )}
                {zone.groupRecommended && !zone.groupRequired && (
                  <View style={styles.groupBadge}>
                    <Text style={styles.groupBadgeText}>👥 Recommended</Text>
                  </View>
                )}
                {zone.seasonal && (
                  <View style={[styles.groupBadge, { backgroundColor: '#FF572222', borderColor: '#FF5722' }]}>
                    <Text style={[styles.groupBadgeText, { color: '#FF5722' }]}>🌋 Seasonal</Text>
                  </View>
                )}
              </View>
            </View>

            {/* State indicator */}
            <View style={[
              styles.stateIcon,
              zoneState === ZONE_STATE.RESTORED && styles.stateRestored,
              zoneState === ZONE_STATE.DISCOVERED && styles.stateDiscovered,
              zoneState === ZONE_STATE.HIDDEN && styles.stateHidden,
            ]}>
              <Text style={styles.stateEmoji}>
                {zoneState === ZONE_STATE.RESTORED ? '✨' : zoneState === ZONE_STATE.DISCOVERED ? '🔍' : '🌫️'}
              </Text>
            </View>
          </View>

          {/* Lore */}
          <Text style={styles.lore}>{zone.lore}</Text>

          {/* Restoration Progress */}
          <View style={styles.section}>
            <View style={styles.progressHeader}>
              <Text style={styles.sectionTitle}>
                {isRestored ? '✓ Fully Restored' : 'Restoration Progress'}
              </Text>
              <Text style={styles.progressCount}>
                {currentPomodoros} / {required}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPct}%`,
                    backgroundColor: isRestored ? COLORS.waveComplete : accentColor,
                  },
                ]}
              />
            </View>
            {userContribution > 0 && (
              <Text style={styles.yourContribution}>
                Your contribution: {userContribution} pomodoro{userContribution !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* Top contributors */}
          {topContributors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Contributors</Text>
              {topContributors.map(([uid, count], i) => (
                <View key={uid} style={styles.contributorRow}>
                  <Text style={styles.contributorRank}>#{i + 1}</Text>
                  <View style={styles.contributorAvatar}>
                    <Text style={styles.contributorAvatarText}>
                      {uid === userId ? '⭐' : '👤'}
                    </Text>
                  </View>
                  <Text style={styles.contributorName}>
                    {uid === userId ? 'You' : uid.substring(0, 8) + '...'}
                  </Text>
                  <Text style={styles.contributorCount}>{count} 🍅</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {!isRestored && (
              <TouchableOpacity
                style={[styles.contributeBtn, { backgroundColor: accentColor }]}
                onPress={() => { handleClose(); onContribute?.(zone); }}
              >
                <Text style={styles.contributeBtnText}>⏱  Contribute Focus Session</Text>
              </TouchableOpacity>
            )}
            {isRestored && (
              <View style={styles.restoredBanner}>
                <Text style={styles.restoredBannerText}>
                  ✨ This landmark has been fully restored by the community!
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  emoji: {
    fontSize: 42,
  },
  headerText: {
    flex: 1,
  },
  zoneName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  groupBadge: {
    backgroundColor: `${COLORS.textMuted}22`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupBadgeText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  stateIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateRestored: { backgroundColor: `${COLORS.waveComplete}33` },
  stateDiscovered: { backgroundColor: `${COLORS.waveActive}22` },
  stateHidden: { backgroundColor: `${COLORS.textMuted}22` },
  stateEmoji: { fontSize: 18 },
  lore: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  yourContribution: {
    fontSize: 12,
    color: COLORS.waveActive,
    marginTop: 6,
    fontWeight: '600',
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contributorRank: {
    width: 24,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  contributorAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributorAvatarText: { fontSize: 14 },
  contributorName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  contributorCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  contributeBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  contributeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  restoredBanner: {
    backgroundColor: `${COLORS.waveComplete}22`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.waveComplete,
    alignItems: 'center',
  },
  restoredBannerText: {
    color: COLORS.waveComplete,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  closeBtn: {
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ZoneCard;
