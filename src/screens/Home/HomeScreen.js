import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useStreak } from '../../hooks/useStreak';
import { useFriendStatus } from '../../hooks/useFriendStatus';
import { getTodaysSessions } from '../../services/sessionService';
import { getDailyGoal, setDailyGoal, buyShield } from '../../services/userService';
import { getFriendProfiles } from '../../services/friendService';
import { minutesToHoursString } from '../../utils/timeUtils';
import { calculateLevel, xpProgressPercent } from '../../utils/xpUtils';
import WaveAnimation from '../../components/WaveAnimation';
import { hapticLight, hapticMedium } from '../../services/hapticService';

const { width } = Dimensions.get('window');

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user, profile, refreshProfile } = useAuth();
  const { streak, shieldCount } = useStreak(profile);

  const [todayPomodoros, setTodayPomodoros] = useState(0);
  const [dailyGoal, setDailyGoalState] = useState(4);
  const [goalInputVisible, setGoalInputVisible] = useState(false);
  const [goalDraft, setGoalDraft] = useState('4');
  const [refreshing, setRefreshing] = useState(false);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [shopVisible, setShopVisible] = useState(false);
  const [buyingShield, setBuyingShield] = useState(false);

  const friendIds = profile?.friendIds ?? [];
  const friendStatuses = useFriendStatus(friendIds);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [sessions, goal] = await Promise.all([
        getTodaysSessions(user.uid),
        getDailyGoal(user.uid),
      ]);
      setTodayPomodoros(sessions.length);
      setDailyGoalState(goal);
      setGoalDraft(String(goal));
    } catch (e) {
      console.warn('Home load error:', e);
    }
  }, [user?.uid]);

  // Load friend profiles for the focusing-now section
  useEffect(() => {
    if (friendIds.length === 0) { setFriendProfiles([]); return; }
    getFriendProfiles(friendIds).then(setFriendProfiles).catch(() => {});
  }, [friendIds.join(',')]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshProfile()]);
    setRefreshing(false);
  };

  const saveGoal = async () => {
    const parsed = Math.max(1, Math.min(20, parseInt(goalDraft) || 4));
    setDailyGoalState(parsed);
    setGoalInputVisible(false);
    await setDailyGoal(user.uid, parsed);
  };

  const handleBuyShield = async () => {
    setBuyingShield(true);
    try {
      await buyShield(user.uid);
      await refreshProfile();
      setShopVisible(false);
    } catch (e) {
      Alert.alert('Not enough coins', 'You need 50 🪙 to buy a streak shield.');
    } finally {
      setBuyingShield(false);
    }
  };

  const level = calculateLevel(profile?.xp ?? 0);
  const xpPercent = xpProgressPercent(profile?.xp ?? 0);
  const goalProgress = dailyGoal > 0 ? Math.min(1, todayPomodoros / dailyGoal) : 0;
  const totalFocusToday = todayPomodoros * 25;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.waveActive}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.username}>{profile?.username ?? 'Explorer'}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv. {level}</Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
            </View>
          </View>
        </View>

        {/* Streak card */}
        <View style={styles.streakCard}>
          <View style={styles.streakLeft}>
            <Text style={styles.streakIcon}>🔥</Text>
            <View>
              <Text style={styles.streakCount}>{streak} day streak</Text>
              <Text style={styles.streakSub}>
                {streak === 0 ? 'Start your streak today!' : 'Keep it going!'}
              </Text>
            </View>
          </View>
          {shieldCount > 0 && (
            <View style={styles.shieldBadge}>
              <Text style={styles.shieldText}>🛡️ {shieldCount}</Text>
            </View>
          )}
          <WaveAnimation
            state="calm"
            width={120}
            height={50}
            progress={streak / 30}
            style={styles.streakWave}
          />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{todayPomodoros}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{minutesToHoursString(totalFocusToday)}</Text>
            <Text style={styles.statLabel}>Focus time</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.totalPomodoros ?? 0}</Text>
            <Text style={styles.statLabel}>All time</Text>
          </View>
        </View>

        {/* Daily goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>Daily Goal</Text>
            <TouchableOpacity onPress={() => setGoalInputVisible(true)}>
              <Text style={styles.goalEdit}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.goalProgressRow}>
            <Text style={styles.goalProgressText}>
              {todayPomodoros} / {dailyGoal} pomodoros
            </Text>
            {todayPomodoros >= dailyGoal && (
              <Text style={styles.goalCompleteText}>✓ Done!</Text>
            )}
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${goalProgress * 100}%`,
                  backgroundColor:
                    goalProgress >= 1 ? COLORS.success : COLORS.waveActive,
                },
              ]}
            />
          </View>
          {/* Individual dots for each pomodoro */}
          <View style={styles.dotsRow}>
            {Array.from({ length: dailyGoal }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < todayPomodoros && styles.dotFilled,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Start Focus CTA */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => { hapticMedium(); navigation.navigate('Focus'); }}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>⏱  Start Focus Session</Text>
        </TouchableOpacity>

        {/* Quick stats bottom */}
        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryStatValue}>
              {minutesToHoursString(profile?.totalFocusMinutes ?? 0)}
            </Text>
            <Text style={styles.secondaryStatLabel}>Total focus time</Text>
          </View>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryStatValue}>
              {profile?.discoveredZones?.length ?? 0}
            </Text>
            <Text style={styles.secondaryStatLabel}>Zones discovered</Text>
          </View>
          <TouchableOpacity style={styles.secondaryStat} onPress={() => setShopVisible(true)}>
            <Text style={styles.secondaryStatValue}>{profile?.coins ?? 0} 🪙</Text>
            <Text style={[styles.secondaryStatLabel, styles.shopHint]}>Coins · Shop</Text>
          </TouchableOpacity>
        </View>

        {/* Achievements quick-nav */}
        <TouchableOpacity
          style={styles.achievementsRow}
          onPress={() => navigation.navigate('Achievements')}
          activeOpacity={0.8}
        >
          <View style={styles.achievementsLeft}>
            <Text style={styles.achievementsIcon}>🏆</Text>
            <View>
              <Text style={styles.achievementsTitle}>Achievements</Text>
              <Text style={styles.achievementsSub}>
                {profile?.unlockedAchievements?.length ?? 0} / 10 unlocked
              </Text>
            </View>
          </View>
          <Text style={styles.achievementsArrow}>→</Text>
        </TouchableOpacity>

        {/* Friends focusing now — live via RTDB */}
        <View style={styles.friendsSection}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Friends focusing now</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Friends')}>
              <Text style={styles.sectionLink}>See all →</Text>
            </TouchableOpacity>
          </View>
          {(() => {
            const focusing = friendProfiles.filter(
              (f) => friendStatuses[f.uid]?.status === 'focusing',
            );
            if (friendIds.length === 0) {
              return (
                <View style={styles.friendsEmpty}>
                  <Text style={styles.friendsEmptyText}>
                    Add friends to see their live focus status
                  </Text>
                </View>
              );
            }
            if (focusing.length === 0) {
              return (
                <View style={styles.friendsEmpty}>
                  <Text style={styles.friendsEmptyText}>No friends focusing right now</Text>
                </View>
              );
            }
            return (
              <View style={styles.focusingRow}>
                {focusing.map((f) => (
                  <View key={f.uid} style={styles.focusingBubble}>
                    <View style={styles.focusingAvatarWrap}>
                      <Text style={styles.focusingAvatar}>{f.avatarId ?? '🧭'}</Text>
                      <View style={styles.focusingWave}>
                        <WaveAnimation state="calm" width={48} height={16} progress={0.5} />
                      </View>
                    </View>
                    <Text style={styles.focusingName} numberOfLines={1}>{f.username}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
        </View>
      </ScrollView>
      </Animated.View>

      {/* Goal input modal */}
      <Modal transparent visible={goalInputVisible} animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setGoalInputVisible(false)}
        >
          <View
            style={styles.modalBox}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Set Daily Goal</Text>
            <Text style={styles.modalSub}>How many pomodoros today?</Text>
            <TextInput
              style={styles.modalInput}
              value={goalDraft}
              onChangeText={setGoalDraft}
              keyboardType="numeric"
              maxLength={2}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setGoalInputVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveGoal}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Coins shop modal */}
      <Modal transparent visible={shopVisible} animationType="fade" onRequestClose={() => setShopVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShopVisible(false)}
        >
          <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>🪙 Coins Shop</Text>
            <Text style={styles.modalSub}>Balance: {profile?.coins ?? 0} coins</Text>

            {/* Shop item: Streak Shield */}
            <View style={styles.shopItem}>
              <View style={styles.shopItemLeft}>
                <Text style={styles.shopItemIcon}>🛡️</Text>
                <View>
                  <Text style={styles.shopItemName}>Streak Shield</Text>
                  <Text style={styles.shopItemDesc}>Protects your streak for one missed day</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.shopBuyBtn,
                  (profile?.coins ?? 0) < 50 && styles.shopBuyBtnDisabled,
                ]}
                onPress={handleBuyShield}
                disabled={buyingShield || (profile?.coins ?? 0) < 50}
              >
                {buyingShield ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.shopBuyBtnText}>50 🪙</Text>
                )}
              </TouchableOpacity>
            </View>

            {(profile?.shieldCount ?? 0) > 0 && (
              <Text style={styles.shieldBalance}>
                You have {profile.shieldCount} shield{profile.shieldCount !== 1 ? 's' : ''}
              </Text>
            )}

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShopVisible(false)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  username: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  levelBadge: {
    alignItems: 'flex-end',
  },
  levelText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  xpBar: {
    width: 80,
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  streakCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  streakIcon: {
    fontSize: 36,
  },
  streakCount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  streakSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  shieldBadge: {
    backgroundColor: `${COLORS.waveActive}22`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  shieldText: {
    fontSize: 12,
    color: COLORS.waveActive,
    fontWeight: '700',
  },
  streakWave: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    opacity: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  goalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  goalEdit: {
    fontSize: 13,
    color: COLORS.waveActive,
    fontWeight: '600',
  },
  goalProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalProgressText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  goalCompleteText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dotFilled: {
    backgroundColor: COLORS.waveActive,
    borderColor: COLORS.waveActive,
  },
  startBtn: {
    backgroundColor: COLORS.waveActive,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.waveActive,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  startBtnText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  secondaryStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
  },
  secondaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  secondaryStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  secondaryStatLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  friendsSection: {
    marginTop: 4,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionLink: {
    fontSize: 13,
    color: COLORS.waveActive,
    fontWeight: '600',
  },
  friendsEmpty: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  friendsEmptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  focusingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  focusingBubble: {
    alignItems: 'center',
    gap: 5,
    width: 64,
  },
  focusingAvatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.waveActive,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  focusingAvatar: {
    fontSize: 26,
    position: 'absolute',
  },
  focusingWave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.5,
  },
  focusingName: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: width - 64,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.waveActive,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modalSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.waveActive,
  },
  modalSaveText: {
    color: COLORS.background,
    fontWeight: '800',
  },
  shopHint: {
    color: COLORS.waveActive,
  },
  achievementsRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  achievementsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  achievementsIcon: { fontSize: 28 },
  achievementsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  achievementsSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  achievementsArrow: { color: COLORS.textMuted, fontSize: 16, fontWeight: '700' },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    gap: 10,
  },
  shopItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shopItemIcon: { fontSize: 28 },
  shopItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  shopItemDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  shopBuyBtn: {
    backgroundColor: COLORS.waveActive,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 60,
    alignItems: 'center',
  },
  shopBuyBtnDisabled: {
    opacity: 0.4,
  },
  shopBuyBtnText: {
    color: COLORS.background,
    fontWeight: '800',
    fontSize: 13,
  },
  shieldBalance: {
    fontSize: 12,
    color: COLORS.waveActive,
    fontWeight: '600',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
});

export default HomeScreen;
