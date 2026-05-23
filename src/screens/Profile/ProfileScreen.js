import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useStreak } from '../../hooks/useStreak';
import { calculateLevel, xpToNextLevel, XP_PER_LEVEL } from '../../utils/xpUtils';
import { minutesToHoursString, formatRelativeTime } from '../../utils/timeUtils';
import { getExplorationPercent } from '../../utils/mapUtils';
import { updateAvatarId } from '../../services/userService';
import { logoutUser } from '../../services/authService';
import { hapticLight, hapticWarning } from '../../services/hapticService';
import { ZONES } from '../../constants/zones';
import WaveAnimation from '../../components/WaveAnimation';
import { ACHIEVEMENTS } from '../../constants/achievements';

const { width } = Dimensions.get('window');

const AVATARS = [
  '🧭','🌊','🔥','⚡','🌙','⭐',
  '🦅','🐉','🌿','🏔️','✨','🧠',
  '🎯','🛡️','🗺️','🌅','🦁','🌋',
];

// ── Stat cell ────────────────────────────────────────────────────────────────
const StatCell = ({ value, label, accent }) => (
  <View style={styles.statCell}>
    <Text style={[styles.statValue, accent && { color: accent }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── Section card ─────────────────────────────────────────────────────────────
const Card = ({ title, children, onPress, action }) => (
  <View style={styles.card}>
    {(title || action) && (
      <View style={styles.cardHeader}>
        {title && <Text style={styles.cardTitle}>{title}</Text>}
        {action && (
          <TouchableOpacity onPress={onPress}>
            <Text style={styles.cardAction}>{action}</Text>
          </TouchableOpacity>
        )}
      </View>
    )}
    {children}
  </View>
);

// ── Avatar picker modal ───────────────────────────────────────────────────────
const AvatarPicker = ({ visible, current, onSelect, onClose }) => (
  <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
    <View style={pickerStyles.overlay}>
      <View style={pickerStyles.sheet}>
        <Text style={pickerStyles.title}>Choose Avatar</Text>
        <View style={pickerStyles.grid}>
          {AVATARS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[
                pickerStyles.cell,
                current === emoji && pickerStyles.cellActive,
              ]}
              onPress={() => onSelect(emoji)}
              activeOpacity={0.7}
            >
              <Text style={pickerStyles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={pickerStyles.closeBtn} onPress={onClose}>
          <Text style={pickerStyles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ── Main screen ───────────────────────────────────────────────────────────────
const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, profile, refreshProfile } = useAuth();
  const { streak, longestStreak, shieldCount } = useStreak(profile);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const xp = profile?.xp ?? 0;
  const level = calculateLevel(xp);
  const xpInLevel = xpToNextLevel(xp);
  const xpPercent = (xpInLevel / XP_PER_LEVEL) * 100;

  const totalPomodoros = profile?.totalPomodoros ?? 0;
  const totalMinutes = profile?.totalFocusMinutes ?? 0;
  const discoveredZones = profile?.discoveredZones ?? [];
  const explorationPct = getExplorationPercent(discoveredZones, ZONES.length);
  const unlockedCount = profile?.unlockedAchievements?.length ?? 0;
  const friendCount = profile?.friendIds?.length ?? 0;
  const coopSessions = profile?.coopSessionsCount ?? 0;
  const nightSessions = profile?.nightSessionsCount ?? 0;
  const morningSessions = profile?.morningSessionsCount ?? 0;
  const zonesRestored = profile?.zonesRestoredCount ?? 0;

  const avgSessionMins = totalPomodoros > 0 ? Math.round(totalMinutes / totalPomodoros) : 0;

  const handleSelectAvatar = async (emoji) => {
    if (savingAvatar || emoji === profile?.avatarId) {
      setPickerVisible(false);
      return;
    }
    setSavingAvatar(true);
    try {
      await updateAvatarId(user.uid, emoji);
      await refreshProfile();
    } catch {
      Alert.alert('Error', 'Could not update avatar.');
    } finally {
      setSavingAvatar(false);
      setPickerVisible(false);
    }
  };

  const handleLogout = () => {
    hapticWarning();
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => logoutUser().catch(() => {}),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          {/* Wave decoration */}
          <View style={styles.heroWave} pointerEvents="none">
            <WaveAnimation state="calm" width={width} height={120} progress={0.4} />
          </View>

          {/* Avatar */}
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarEmoji}>{profile?.avatarId ?? '🧭'}</Text>
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>✏️</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.username}>{profile?.username ?? 'Explorer'}</Text>

          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Level {level}</Text>
            </View>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakBadgeText}>🔥 {streak}d</Text>
              </View>
            )}
          </View>

          {/* XP bar */}
          <View style={styles.xpBarWrap}>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
            </View>
            <Text style={styles.xpLabel}>{xpInLevel} / {XP_PER_LEVEL} XP</Text>
          </View>
        </View>

        {/* ── Quick stats ── */}
        <View style={styles.quickStats}>
          <StatCell value={totalPomodoros} label="Pomodoros" accent={COLORS.waveActive} />
          <View style={styles.statDivider} />
          <StatCell value={minutesToHoursString(totalMinutes)} label="Focus time" />
          <View style={styles.statDivider} />
          <StatCell value={`${explorationPct}%`} label="Explored" accent={COLORS.accent} />
        </View>

        {/* ── Focus stats ── */}
        <Card title="Focus Stats">
          <View style={styles.statGrid}>
            <View style={styles.statRow}>
              <StatCell value={totalPomodoros} label="Total sessions" />
              <StatCell value={minutesToHoursString(totalMinutes)} label="Total focus" />
            </View>
            <View style={[styles.statRow, styles.statRowBorder]}>
              <StatCell value={`${avgSessionMins}m`} label="Avg session" />
              <StatCell value={profile?.coins ?? 0} label="🪙 Coins" accent={COLORS.gold} />
            </View>
            <View style={[styles.statRow, styles.statRowBorder]}>
              <StatCell value={nightSessions} label="🌙 Night sessions" />
              <StatCell value={morningSessions} label="🌅 Morning sessions" />
            </View>
          </View>
        </Card>

        {/* ── Streak ── */}
        <Card title="Streak">
          <View style={styles.statGrid}>
            <View style={styles.statRow}>
              <StatCell value={`${streak}d`} label="Current streak" accent={COLORS.warning} />
              <StatCell value={`${longestStreak}d`} label="Longest streak" />
            </View>
            <View style={[styles.statRow, styles.statRowBorder]}>
              <StatCell value={shieldCount} label="🛡️ Shields" accent={COLORS.waveActive} />
              <View style={styles.statCell}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {profile?.lastFocusDate
                    ? formatRelativeTime(
                        profile.lastFocusDate?.toDate?.()?.getTime?.() ??
                        new Date(profile.lastFocusDate).getTime(),
                      )
                    : 'Never'}
                </Text>
                <Text style={styles.statLabel}>Last session</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* ── World ── */}
        <Card title="World">
          <View style={styles.statGrid}>
            <View style={styles.statRow}>
              <StatCell
                value={`${discoveredZones.length}/${ZONES.length}`}
                label="Zones discovered"
                accent={COLORS.accent}
              />
              <StatCell value={zonesRestored} label="Zones restored" />
            </View>
            <View style={[styles.statRow, styles.statRowBorder]}>
              <StatCell value={`${explorationPct}%`} label="Map explored" />
              <StatCell value={coopSessions} label="🤝 Co-op sessions" />
            </View>
          </View>
        </Card>

        {/* ── Achievements ── */}
        <Card
          title="Achievements"
          action={`${unlockedCount}/10 →`}
          onPress={() => navigation.navigate('Achievements')}
        >
          <View style={styles.achievementRow}>
            {(profile?.unlockedAchievements ?? []).slice(0, 6).map((id) => {
              const a = ACHIEVEMENTS.find((x) => x.id === id);
              return a ? (
                <View key={id} style={styles.achievementChip}>
                  <Text style={styles.achievementChipIcon}>{a.icon}</Text>
                </View>
              ) : null;
            })}
            {unlockedCount === 0 && (
              <Text style={styles.achievementEmpty}>Complete sessions to unlock achievements</Text>
            )}
          </View>
        </Card>

        {/* ── Social ── */}
        <Card title="Social">
          <View style={styles.statRow}>
            <StatCell value={friendCount} label="Friends" accent={COLORS.success} />
            <StatCell value={coopSessions} label="Co-op done" />
          </View>
        </Card>

        {/* ── Actions ── */}
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => { hapticLight(); navigation.navigate('Settings'); }}
          activeOpacity={0.8}
        >
          <Text style={styles.settingsBtnText}>⚙️  Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <AvatarPicker
        visible={pickerVisible}
        current={profile?.avatarId}
        onSelect={handleSelectAvatar}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 40,
    gap: 14,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    marginHorizontal: -20,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 4,
  },
  heroWave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    opacity: 0.18,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.waveActive,
    marginBottom: 12,
  },
  avatarEmoji: { fontSize: 44 },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.waveActive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  editBadgeText: { fontSize: 12 },
  username: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  levelBadge: {
    backgroundColor: `${COLORS.accent}22`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  levelText: { fontSize: 13, fontWeight: '800', color: COLORS.accent },
  streakBadge: {
    backgroundColor: `${COLORS.warning}22`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  streakBadgeText: { fontSize: 13, fontWeight: '700', color: COLORS.warning },
  xpBarWrap: {
    width: width - 80,
    gap: 5,
  },
  xpTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  xpLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Quick stats row
  quickStats: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    paddingVertical: 16,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardAction: {
    fontSize: 13,
    color: COLORS.waveActive,
    fontWeight: '600',
  },

  // Stat cells
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  statGrid: { gap: 0 },
  statRow: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  statRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Achievements
  achievementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 44,
    alignItems: 'center',
  },
  achievementChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.waveComplete}22`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.waveComplete}44`,
  },
  achievementChipIcon: { fontSize: 20 },
  achievementEmpty: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  // Settings
  settingsBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  settingsBtnText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 15,
  },

  // Sign out
  logoutBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: '700',
    fontSize: 15,
  },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
  },
  cell: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cellActive: {
    borderColor: COLORS.waveActive,
    backgroundColor: `${COLORS.waveActive}22`,
  },
  emoji: { fontSize: 28 },
  closeBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 15 },
});

export default ProfileScreen;
