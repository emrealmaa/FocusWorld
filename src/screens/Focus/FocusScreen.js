import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useCoopSession } from '../../context/CoopSessionContext';
import { usePomodoro } from '../../hooks/usePomodoro';
import PomodoroTimer from '../../components/PomodoroTimer';
import WaveAnimation from '../../components/WaveAnimation';
import XPPopup from '../../components/XPPopup';
import CoopBanner from '../../components/CoopBanner';
import LevelUpModal from '../../components/LevelUpModal';
import AchievementToast from '../../components/AchievementToast';
import { startSession, completeSession } from '../../services/sessionService';
import { updateUserAfterSession, updateStreak } from '../../services/userService';
import { trackSessionStats, trackZoneRestored, checkAndUnlockAchievements } from '../../services/achievementService';
import { discoverZone, contributeToZone } from '../../services/zoneService';
import { setFocusStatus } from '../../services/friendService';
import { isAfterMidnight, isBeforeSeven } from '../../utils/timeUtils';
import { ZONES } from '../../constants/zones';
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticWarning } from '../../services/hapticService';
import { playSessionComplete, playZoneDiscover } from '../../services/soundService';

const { width, height } = Dimensions.get('window');

const MODES = ['25/5', '50/10', 'custom'];

const FocusScreen = ({ route }) => {
  const { user, profile, refreshProfile } = useAuth();
  const { sentInvite, activeSession, partnerProfile, cancelInvite, leaveSession, updateProgress } =
    useCoopSession();

  // Optional: pre-selected zone from Map screen "Contribute" button
  const contributingZoneId = route?.params?.contributingZoneId ?? null;
  const contributingZoneName = route?.params?.contributingZoneName ?? null;

  const [selectedMode, setSelectedMode] = useState('25/5');
  const [customWork, setCustomWork] = useState(25);
  const [customBreak, setCustomBreak] = useState(5);
  const [taskName, setTaskName] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [xpPopup, setXpPopup] = useState({ visible: false, xp: 0, coins: 0, earnedShield: false });
  const [levelUpInfo, setLevelUpInfo] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);

  const sessionIdRef = useRef(null);
  const timeLeftRef = useRef(0);
  const sessionStartTimeRef = useRef(null);
  const isStartingRef = useRef(false);

  const handleSessionComplete = useCallback(
    async ({ disturbanceCount, durationMinutes }) => {
      try {
        if (sessionIdRef.current) {
          await completeSession(sessionIdRef.current, disturbanceCount);
          sessionIdRef.current = null;
        }

        const isCoop = !!activeSession;
        const startTime = sessionStartTimeRef.current ?? new Date();
        const isNight = isAfterMidnight(startTime);
        const isMorning = isBeforeSeven(startTime);

        const coopFriendCount = isCoop ? 1 : 0;
        const rewards = await updateUserAfterSession(user.uid, { durationMinutes, coopFriendCount });
        const streakResult = await updateStreak(user.uid);

        await trackSessionStats(user.uid, { isNight, isMorning, isCoop });

        // Reveal a random hidden zone
        const currentDiscovered = profile?.discoveredZones ?? [];
        const hiddenZones = ZONES.filter((z) => !currentDiscovered.includes(z.id));
        if (hiddenZones.length > 0) {
          const pick = hiddenZones[Math.floor(Math.random() * hiddenZones.length)];
          await discoverZone(user.uid, pick.id);
          playZoneDiscover();
        }

        // Contribute to a specific zone and check if it becomes fully restored
        if (contributingZoneId) {
          const isRestored = await contributeToZone(contributingZoneId, user.uid);
          if (isRestored) await trackZoneRestored(user.uid);
        }

        // Check for newly unlocked achievements
        const newAchievements = await checkAndUnlockAchievements(user.uid, { durationMinutes });

        await refreshProfile();
        setFocusStatus(user.uid, false).catch(() => {});

        playSessionComplete();
        hapticHeavy();

        const earnedShield = streakResult?.earnedShield ?? false;
        setXpPopup({ visible: true, xp: rewards.xpGained, coins: rewards.coinsGained, earnedShield });

        if (rewards.leveledUp) {
          setTimeout(() => setLevelUpInfo({ newLevel: rewards.newLevel }), 2200);
        }
        if (newAchievements.length > 0) {
          setTimeout(() => {
            hapticSuccess();
            setAchievementQueue((q) => [...q, ...newAchievements]);
          }, rewards.leveledUp ? 4000 : 2400);
        }
      } catch (e) {
        console.warn('Session save error:', e);
      }
    },
    [user?.uid, profile?.discoveredZones, contributingZoneId, refreshProfile, activeSession],
  );

  const {
    phase,
    timeLeft,
    isRunning,
    sessionCount,
    disturbanceCount,
    waveState,
    progress,
    totalDuration,
    start,
    pause,
    resume,
    reset,
  } = usePomodoro({
    mode: selectedMode,
    customWork,
    customBreak,
    onSessionComplete: handleSessionComplete,
  });

  // Keep ref in sync for progress updates (avoids stale closure in interval)
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // Broadcast progress to co-op partner every 15 seconds and on phase changes
  useEffect(() => {
    if (!activeSession?.sessionId) return;
    updateProgress({ phase, timeLeft: timeLeftRef.current, sessionCount });
    const interval = setInterval(() => {
      updateProgress({ phase, timeLeft: timeLeftRef.current, sessionCount });
    }, 15000);
    return () => clearInterval(interval);
  }, [activeSession?.sessionId, phase, sessionCount, updateProgress]);

  const handleStart = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    hapticMedium();
    sessionStartTimeRef.current = new Date();
    try {
      const workMins = selectedMode === 'custom' ? customWork : selectedMode === '50/10' ? 50 : 25;
      const id = await startSession(user.uid, workMins, null, false);
      sessionIdRef.current = id;
    } catch (e) {
      console.warn('Session start error:', e);
    }
    setFocusStatus(user.uid, true).catch(() => {});
    start();
    isStartingRef.current = false;
  };

  const handleReset = () => {
    if (phase !== 'idle' && isRunning) {
      hapticWarning();
      Alert.alert('Cancel session?', 'Your current session progress will be lost.', [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Cancel session',
          style: 'destructive',
          onPress: () => {
            sessionIdRef.current = null;
            setFocusStatus(user.uid, false).catch(() => {});
            if (activeSession) leaveSession();
            reset();
          },
        },
      ]);
    } else {
      sessionIdRef.current = null;
      if (activeSession) leaveSession();
      reset();
    }
  };

  const canChangeMode = phase === 'idle';
  const isComplete = waveState === 'complete';

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
      {/* Header: mode selector */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Focus</Text>
        {sessionCount > 0 && (
          <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>Session {sessionCount}</Text>
          </View>
        )}
      </View>

      {/* Mode tabs */}
      <View style={styles.modeTabs}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.modeTab,
              selectedMode === m && styles.modeTabActive,
              !canChangeMode && styles.modeTabDisabled,
            ]}
            onPress={() => {
              if (!canChangeMode) return;
              hapticLight();
              setSelectedMode(m);
              setShowCustom(m === 'custom');
            }}
            disabled={!canChangeMode}
          >
            <Text
              style={[styles.modeTabText, selectedMode === m && styles.modeTabTextActive]}
            >
              {m === 'custom' ? '⚙️ Custom' : m}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom duration inputs */}
      {showCustom && canChangeMode && (
        <View style={styles.customRow}>
          <View style={styles.customInput}>
            <Text style={styles.customLabel}>Work (min)</Text>
            <TextInput
              style={styles.customField}
              keyboardType="numeric"
              value={String(customWork)}
              onChangeText={(t) => setCustomWork(Math.max(1, Math.min(120, parseInt(t) || 1)))}
              maxLength={3}
            />
          </View>
          <Text style={styles.customSep}>/</Text>
          <View style={styles.customInput}>
            <Text style={styles.customLabel}>Break (min)</Text>
            <TextInput
              style={styles.customField}
              keyboardType="numeric"
              value={String(customBreak)}
              onChangeText={(t) => setCustomBreak(Math.max(1, Math.min(60, parseInt(t) || 1)))}
              maxLength={2}
            />
          </View>
        </View>
      )}

      {/* Task name */}
      {phase === 'idle' && (
        <View style={styles.taskRow}>
          <TextInput
            style={styles.taskInput}
            value={taskName}
            onChangeText={setTaskName}
            placeholder="What are you working on? (optional)"
            placeholderTextColor={COLORS.textMuted}
            maxLength={60}
          />
        </View>
      )}

      {phase !== 'idle' && taskName.length > 0 && (
        <View style={styles.taskChip}>
          <Text style={styles.taskChipText} numberOfLines={1}>📌 {taskName}</Text>
        </View>
      )}

      {contributingZoneId && (
        <View style={styles.zoneContribChip}>
          <Text style={styles.zoneContribText} numberOfLines={1}>
            🗺️ Contributing to: {contributingZoneName}
          </Text>
        </View>
      )}

      {/* Co-op session banner */}
      <CoopBanner
        sentInvite={sentInvite}
        activeSession={activeSession}
        partnerProfile={partnerProfile}
        onCancelInvite={cancelInvite}
        onLeaveSession={leaveSession}
      />

      {/* Disturbance warning */}
      {waveState === 'disturbed' && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚡ You left the app — stay focused!</Text>
        </View>
      )}

      {/* XP popup */}
      <View style={styles.xpAnchor}>
        <XPPopup
          xp={xpPopup.xp}
          coins={xpPopup.coins}
          earnedShield={xpPopup.earnedShield}
          visible={xpPopup.visible}
          onDone={() => setXpPopup((p) => ({ ...p, visible: false }))}
        />
      </View>

      {/* Level-up celebration */}
      <LevelUpModal
        visible={!!levelUpInfo}
        newLevel={levelUpInfo?.newLevel}
        onDismiss={() => setLevelUpInfo(null)}
      />

      {/* Achievement toast queue */}
      <AchievementToast
        achievement={achievementQueue[0] ?? null}
        onDismiss={() => setAchievementQueue((q) => q.slice(1))}
      />

      {/* Timer */}
      <View style={styles.timerArea}>
        <PomodoroTimer
          timeLeft={timeLeft}
          totalDuration={totalDuration}
          phase={phase}
          progress={progress}
          disturbanceCount={disturbanceCount}
        />
      </View>

      {/* CTA buttons */}
      <View style={styles.controls}>
        {phase === 'idle' && (
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>Start Focus</Text>
          </TouchableOpacity>
        )}

        {phase === 'work' && !isComplete && (
          <View style={styles.runningControls}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleReset}>
              <Text style={styles.secondaryBtnText}>✕ Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, isRunning ? styles.pauseBtn : styles.resumeBtn]}
              onPress={() => { hapticLight(); isRunning ? pause() : resume(); }}
            >
              <Text style={styles.primaryBtnText}>{isRunning ? '⏸ Pause' : '▶ Resume'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'break' && (
          <View style={styles.runningControls}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => { hapticLight(); reset(); }}>
              <Text style={styles.secondaryBtnText}>Skip Break</Text>
            </TouchableOpacity>
            <View style={styles.breakLabel}>
              <Text style={styles.breakLabelText}>Take a break 🍃</Text>
            </View>
          </View>
        )}
      </View>

      {/* Wave animation */}
      <View style={styles.waveContainer} pointerEvents="none">
        <WaveAnimation
          state={waveState}
          progress={progress}
          width={width}
          height={220}
        />
      </View>

      {/* Bottom status bar */}
      {phase !== 'idle' && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {phase === 'work' ? `Session ${sessionCount + 1}` : 'Break time'}
          </Text>
          <Text style={styles.statusText}>
            {profile?.username ?? ''}
          </Text>
        </View>
      )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  sessionBadge: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionBadgeText: {
    color: COLORS.waveActive,
    fontSize: 11,
    fontWeight: '700',
  },
  modeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  modeTabActive: {
    borderColor: COLORS.waveActive,
    backgroundColor: `${COLORS.waveActive}22`,
  },
  modeTabDisabled: {
    opacity: 0.4,
  },
  modeTabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: COLORS.waveActive,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  customInput: {
    flex: 1,
    alignItems: 'center',
  },
  customLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customField: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  customSep: {
    color: COLORS.textMuted,
    fontSize: 20,
    fontWeight: '300',
    marginTop: 18,
  },
  taskRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  taskInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  taskChip: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  taskChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  zoneContribChip: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: `${COLORS.accent}22`,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignSelf: 'flex-start',
  },
  zoneContribText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  warningBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: `${COLORS.waveDisturbed}22`,
    borderWidth: 1,
    borderColor: COLORS.waveDisturbed,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  warningText: {
    color: COLORS.waveDisturbed,
    fontSize: 13,
    fontWeight: '700',
  },
  xpAnchor: {
    position: 'absolute',
    top: height * 0.35,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'none',
  },
  timerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  controls: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
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
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  runningControls: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  pauseBtn: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resumeBtn: {
    backgroundColor: COLORS.waveActive,
  },
  primaryBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  breakLabel: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakLabelText: {
    color: COLORS.success,
    fontSize: 15,
    fontWeight: '700',
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    opacity: 0.35,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 10,
  },
  statusText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FocusScreen;
