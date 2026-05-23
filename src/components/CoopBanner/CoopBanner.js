import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';
import { formatTime } from '../../utils/timeUtils';
import WaveAnimation from '../WaveAnimation';

const CoopBanner = ({
  sentInvite,
  activeSession,
  partnerProfile,
  onCancelInvite,
  onLeaveSession,
}) => {
  if (sentInvite) {
    return (
      <View style={styles.banner}>
        <View style={styles.row}>
          <ActivityIndicator size="small" color={COLORS.waveActive} />
          <View style={styles.textGroup}>
            <Text style={styles.title} numberOfLines={1}>
              Waiting for {sentInvite.toUsername}…
            </Text>
            <Text style={styles.sub}>Focus together invite sent</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={onCancelInvite}>
          <Text style={styles.actionBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (activeSession && partnerProfile) {
    const progress = activeSession.partnerProgress;
    const phase = progress?.phase ?? 'idle';
    const timeLeft = progress?.timeLeft ?? 0;

    const phaseLabel =
      phase === 'work' ? `Focusing · ${formatTime(timeLeft)}` :
      phase === 'break' ? 'On break 🍃' : 'Idle';

    return (
      <View style={[styles.banner, styles.activeBanner]}>
        <View style={styles.row}>
          <View style={styles.partnerAvatar}>
            <Text style={styles.avatarEmoji}>{partnerProfile.avatarId ?? '🧭'}</Text>
            {phase === 'work' && (
              <View style={styles.waveOverlay}>
                <WaveAnimation state="calm" width={40} height={14} progress={0.5} />
              </View>
            )}
          </View>
          <View style={styles.textGroup}>
            <View style={styles.nameRow}>
              <Text style={styles.title} numberOfLines={1}>{partnerProfile.username}</Text>
              <View style={styles.coopChip}>
                <Text style={styles.coopChipText}>Co-op 🤝</Text>
              </View>
            </View>
            <Text style={[styles.sub, phase === 'work' && styles.subFocusing]}>
              {phaseLabel}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={onLeaveSession}>
          <Text style={styles.actionBtnText}>Leave</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeBanner: {
    borderColor: COLORS.waveActive,
    backgroundColor: `${COLORS.waveActive}0D`,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textGroup: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  subFocusing: { color: COLORS.waveActive },
  coopChip: {
    backgroundColor: `${COLORS.waveActive}22`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.waveActive,
  },
  coopChipText: { fontSize: 9, color: COLORS.waveActive, fontWeight: '700' },
  partnerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.waveActive,
  },
  avatarEmoji: { fontSize: 20, position: 'absolute' },
  waveOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.55,
  },
  actionBtn: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
});

export default CoopBanner;
