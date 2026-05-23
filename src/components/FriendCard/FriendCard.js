import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { ZONES } from '../../constants/zones';
import { calculateLevel } from '../../utils/xpUtils';
import { getExplorationPercent } from '../../utils/mapUtils';
import WaveAnimation from '../WaveAnimation';

const STATUS_DOT = {
  focusing: COLORS.waveComplete,
  online: COLORS.success,
  offline: COLORS.textMuted,
};

const FriendCard = ({ profile, status, onViewMap, onFocusTogether, style }) => {
  const isFocusing = status?.status === 'focusing';
  const isOnline = status?.status === 'online';
  const dotColor = STATUS_DOT[status?.status ?? 'offline'];

  const level = calculateLevel(profile?.xp ?? 0);
  const explorationPct = getExplorationPercent(profile?.discoveredZones ?? [], ZONES.length);
  const streak = profile?.currentStreak ?? 0;

  return (
    <View style={[styles.card, style]}>
      {/* Avatar + status dot */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{profile?.avatarId ?? '🧭'}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
      </View>

      {/* Main info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.username} numberOfLines={1}>{profile?.username ?? 'Explorer'}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv.{level}</Text>
          </View>
        </View>

        {/* Live status */}
        <View style={styles.statusRow}>
          {isFocusing && (
            <WaveAnimation state="calm" width={50} height={18} progress={0.5} style={styles.miniWave} />
          )}
          <Text style={[
            styles.statusText,
            isFocusing && styles.statusFocusing,
            isOnline && styles.statusOnline,
          ]}>
            {status?.label ?? 'Offline'}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {streak > 0 && (
            <Text style={styles.statChip}>🔥 {streak}d</Text>
          )}
          <Text style={styles.statChip}>🗺️ {explorationPct}%</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.viewMapBtn} onPress={onViewMap}>
          <Text style={styles.viewMapText}>Map</Text>
        </TouchableOpacity>
        {(isFocusing || isOnline) && (
          <TouchableOpacity style={styles.joinBtn} onPress={onFocusTogether}>
            <Text style={styles.joinText}>{isFocusing ? 'Join' : 'Invite'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
  },
  levelBadge: {
    backgroundColor: `${COLORS.accent}22`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  levelText: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniWave: {
    borderRadius: 4,
    overflow: 'hidden',
    opacity: 0.7,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  statusFocusing: {
    color: COLORS.waveComplete,
    fontWeight: '700',
  },
  statusOnline: {
    color: COLORS.success,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  statChip: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  actions: {
    gap: 6,
  },
  viewMapBtn: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  viewMapText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  joinBtn: {
    backgroundColor: `${COLORS.waveComplete}22`,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.waveComplete,
    alignItems: 'center',
  },
  joinText: {
    fontSize: 11,
    color: COLORS.waveComplete,
    fontWeight: '700',
  },
});

export default FriendCard;
