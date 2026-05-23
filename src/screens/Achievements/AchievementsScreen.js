import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { ACHIEVEMENTS } from '../../constants/achievements';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const getProgress = (condition, profile) => {
  if (!profile) return null;
  switch (condition.type) {
    case 'totalPomodoros':
      return { current: profile.totalPomodoros ?? 0, max: condition.value };
    case 'zonesDiscovered':
      return { current: profile.discoveredZones?.length ?? 0, max: condition.value };
    case 'zonesRestored':
      return { current: profile.zonesRestoredCount ?? 0, max: condition.value };
    case 'coopSessions':
      return { current: profile.coopSessionsCount ?? 0, max: condition.value };
    case 'streak':
      return { current: profile.currentStreak ?? 0, max: condition.value };
    case 'nightSessions':
      return { current: profile.nightSessionsCount ?? 0, max: condition.value };
    case 'morningSessions':
      return { current: profile.morningSessionsCount ?? 0, max: condition.value };
    case 'shields':
      return { current: profile.shieldCount ?? 0, max: condition.value };
    default:
      return null;
  }
};

const AchievementCard = ({ achievement, isUnlocked, profile }) => {
  const progress = getProgress(achievement.condition, profile);
  const pct = progress ? Math.min(1, progress.current / progress.max) : (isUnlocked ? 1 : 0);

  return (
    <View style={[styles.card, isUnlocked && styles.cardUnlocked]}>
      <View style={[styles.iconWrap, isUnlocked && styles.iconWrapUnlocked]}>
        <Text style={[styles.icon, !isUnlocked && styles.iconLocked]}>
          {isUnlocked ? achievement.icon : '🔒'}
        </Text>
      </View>

      <Text style={[styles.cardTitle, !isUnlocked && styles.cardTitleLocked]} numberOfLines={1}>
        {achievement.title}
      </Text>

      <Text style={styles.cardDesc} numberOfLines={2}>
        {isUnlocked ? achievement.description : '???'}
      </Text>

      {/* Progress bar */}
      {progress && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {Math.min(progress.current, progress.max)}/{progress.max}
          </Text>
        </View>
      )}

      {isUnlocked && (
        <View style={styles.unlockedBadge}>
          <Text style={styles.unlockedText}>✓</Text>
        </View>
      )}
    </View>
  );
};

const AchievementsScreen = () => {
  const navigation = useNavigation();
  const { profile } = useAuth();

  const unlockedSet = new Set(profile?.unlockedAchievements ?? []);
  const unlockedCount = unlockedSet.size;

  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    const au = unlockedSet.has(a.id) ? 0 : 1;
    const bu = unlockedSet.has(b.id) ? 0 : 1;
    return au - bu;
  });

  const renderItem = ({ item }) => (
    <AchievementCard
      achievement={item}
      isUnlocked={unlockedSet.has(item.id)}
      profile={profile}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Achievements</Text>
          <Text style={styles.headerSub}>
            {unlockedCount} / {ACHIEVEMENTS.length} unlocked
          </Text>
        </View>
      </View>

      {/* Overall progress */}
      <View style={styles.overallProgress}>
        <View style={styles.overallTrack}>
          <View
            style={[
              styles.overallFill,
              { width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  overallProgress: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  overallTrack: {
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  overallFill: {
    height: '100%',
    backgroundColor: COLORS.waveComplete,
    borderRadius: 2,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  row: { gap: 12, marginBottom: 12 },
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 6,
  },
  cardUnlocked: {
    borderColor: `${COLORS.waveComplete}66`,
    backgroundColor: `${COLORS.waveComplete}08`,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapUnlocked: {
    backgroundColor: `${COLORS.waveComplete}22`,
    borderWidth: 1,
    borderColor: `${COLORS.waveComplete}44`,
  },
  icon: { fontSize: 24 },
  iconLocked: { opacity: 0.4 },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  cardTitleLocked: { color: COLORS.textMuted },
  cardDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  progressWrap: { marginTop: 4, gap: 3 },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.waveActive,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  unlockedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.waveComplete,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '900',
  },
});

export default AchievementsScreen;
