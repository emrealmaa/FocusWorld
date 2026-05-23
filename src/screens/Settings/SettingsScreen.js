import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import {
  loadSettings,
  saveSettings,
  requestPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
  scheduleStreakSaver,
  cancelStreakSaver,
} from '../../services/notificationService';
import { logoutUser, resetPassword } from '../../services/authService';

const { width } = Dimensions.get('window');

// ── Time presets ──────────────────────────────────────────────────────────────
const TIME_PRESETS = [
  { hour: 5,  minute: 0 }, { hour: 6,  minute: 0 }, { hour: 7,  minute: 0 },
  { hour: 8,  minute: 0 }, { hour: 9,  minute: 0 }, { hour: 10, minute: 0 },
  { hour: 11, minute: 0 }, { hour: 12, minute: 0 }, { hour: 13, minute: 0 },
  { hour: 14, minute: 0 }, { hour: 15, minute: 0 }, { hour: 16, minute: 0 },
  { hour: 17, minute: 0 }, { hour: 18, minute: 0 }, { hour: 19, minute: 0 },
  { hour: 20, minute: 0 }, { hour: 21, minute: 0 }, { hour: 22, minute: 0 },
];

const formatTime = (hour, minute) => {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${suffix}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionHeader = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const SettingRow = ({ icon, label, sub, right, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.row, disabled && styles.rowDisabled]}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress || disabled}
  >
    <View style={styles.rowLeft}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
    </View>
    {right}
  </TouchableOpacity>
);

const Divider = () => <View style={styles.divider} />;

// ── Time picker modal ─────────────────────────────────────────────────────────

const TimePicker = ({ visible, current, onSelect, onClose }) => (
  <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
    <View style={pickerStyles.overlay}>
      <View style={pickerStyles.sheet}>
        <Text style={pickerStyles.title}>Reminder Time</Text>
        <View style={pickerStyles.grid}>
          {TIME_PRESETS.map((t) => {
            const isActive = t.hour === current.hour && t.minute === current.minute;
            return (
              <TouchableOpacity
                key={`${t.hour}:${t.minute}`}
                style={[pickerStyles.cell, isActive && pickerStyles.cellActive]}
                onPress={() => onSelect(t)}
                activeOpacity={0.75}
              >
                <Text style={[pickerStyles.cellText, isActive && pickerStyles.cellTextActive]}>
                  {formatTime(t.hour, t.minute)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={pickerStyles.closeBtn} onPress={onClose}>
          <Text style={pickerStyles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ── Main screen ───────────────────────────────────────────────────────────────

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { user, profile } = useAuth();

  const [settings, setSettings] = useState(null);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const applySettings = useCallback(async (next) => {
    setSettings(next);
    await saveSettings(next);
  }, []);

  const ensurePermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(
        'Permission required',
        'Please enable notifications for FocusWorld in your device settings.',
      );
    }
    return granted;
  };

  // ── Toggle daily reminder ──────────────────────────────────────────────────
  const handleDailyToggle = async (value) => {
    if (value) {
      const granted = await ensurePermission();
      if (!granted) return;
      setSaving(true);
      try {
        await scheduleDailyReminder(settings.dailyReminderHour, settings.dailyReminderMinute);
        await applySettings({ ...settings, dailyReminderEnabled: true });
      } finally {
        setSaving(false);
      }
    } else {
      await cancelDailyReminder();
      await applySettings({ ...settings, dailyReminderEnabled: false });
    }
  };

  // ── Change reminder time ───────────────────────────────────────────────────
  const handleTimeSelect = async (t) => {
    setTimePickerVisible(false);
    const next = { ...settings, dailyReminderHour: t.hour, dailyReminderMinute: t.minute };
    await applySettings(next);
    if (next.dailyReminderEnabled) {
      await scheduleDailyReminder(t.hour, t.minute);
    }
  };

  // ── Toggle streak saver ────────────────────────────────────────────────────
  const handleStreakSaverToggle = async (value) => {
    if (value) {
      const granted = await ensurePermission();
      if (!granted) return;
      setSaving(true);
      try {
        await scheduleStreakSaver();
        await applySettings({ ...settings, streakSaverEnabled: true });
      } finally {
        setSaving(false);
      }
    } else {
      await cancelStreakSaver();
      await applySettings({ ...settings, streakSaverEnabled: false });
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = () => {
    Alert.alert(
      'Reset password',
      `We'll send a reset link to ${user?.email}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send link',
          onPress: () =>
            resetPassword(user.email)
              .then(() => Alert.alert('Email sent', 'Check your inbox for the reset link.'))
              .catch(() => Alert.alert('Error', 'Could not send email. Try again later.')),
        },
      ],
    );
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logoutUser().catch(() => {}) },
    ]);
  };

  if (!settings) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={COLORS.waveActive} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const reminderTimeStr = formatTime(settings.dailyReminderHour, settings.dailyReminderMinute);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Notifications ── */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <SettingRow
            icon="⏰"
            label="Daily Focus Reminder"
            sub="Get reminded to start a session"
            right={
              <Switch
                value={settings.dailyReminderEnabled}
                onValueChange={handleDailyToggle}
                trackColor={{ false: COLORS.surfaceLight, true: COLORS.waveActive }}
                thumbColor={COLORS.text}
                disabled={saving}
              />
            }
          />
          {settings.dailyReminderEnabled && (
            <>
              <Divider />
              <SettingRow
                icon="🕐"
                label="Reminder time"
                sub={reminderTimeStr}
                onPress={() => setTimePickerVisible(true)}
                right={<Text style={styles.chevron}>›</Text>}
              />
            </>
          )}

          <Divider />

          <SettingRow
            icon="🔥"
            label="Streak Saver"
            sub="Remind at 9 PM if you haven't focused"
            right={
              <Switch
                value={settings.streakSaverEnabled}
                onValueChange={handleStreakSaverToggle}
                trackColor={{ false: COLORS.surfaceLight, true: COLORS.waveActive }}
                thumbColor={COLORS.text}
                disabled={saving}
              />
            }
          />
        </View>

        {/* ── Account ── */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <SettingRow
            icon="👤"
            label={profile?.username ?? 'Explorer'}
            sub={user?.email}
          />

          <Divider />

          <SettingRow
            icon="🔑"
            label="Change password"
            sub="Send reset link to your email"
            onPress={handleChangePassword}
            right={<Text style={styles.chevron}>›</Text>}
          />

          <Divider />

          <SettingRow
            icon="🚪"
            label="Sign out"
            onPress={handleLogout}
            right={<Text style={[styles.chevron, { color: COLORS.error }]}>›</Text>}
          />
        </View>

        {/* ── About ── */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <SettingRow icon="🌍" label="FocusWorld" sub="Version 1.0.0" />
          <Divider />
          <SettingRow
            icon="🏆"
            label="Achievements"
            onPress={() => navigation.navigate('Achievements')}
            right={<Text style={styles.chevron}>›</Text>}
          />
        </View>

      </ScrollView>

      <TimePicker
        visible={timePickerVisible}
        current={{ hour: settings.dailyReminderHour, minute: settings.dailyReminderMinute }}
        onSelect={handleTimeSelect}
        onClose={() => setTimePickerVisible(false)}
      />
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
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
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 6,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  rowDisabled: { opacity: 0.5 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowLabelDisabled: { color: COLORS.textMuted },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 56,
  },
  chevron: {
    fontSize: 22,
    color: COLORS.textMuted,
    fontWeight: '300',
    marginLeft: 8,
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
    textAlign: 'center',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  cell: {
    width: (width - 80) / 4 - 6,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cellActive: {
    backgroundColor: `${COLORS.waveActive}22`,
    borderColor: COLORS.waveActive,
  },
  cellText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  cellTextActive: { color: COLORS.waveActive, fontWeight: '800' },
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

export default SettingsScreen;
