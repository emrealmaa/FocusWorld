import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback,
} from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useAuth } from './AuthContext';
import {
  sendCoopInvite, cancelCoopInvite, declineCoopInvite, acceptCoopInvite,
  listenForInvites, listenCoopSession, updateCoopProgress, endCoopSession, getSessionId,
} from '../services/coopService';
import { COLORS } from '../constants/colors';

const CoopSessionContext = createContext(null);
const { width } = Dimensions.get('window');

export const CoopSessionProvider = ({ children }) => {
  const { user, profile } = useAuth();

  const [incomingInvite, setIncomingInvite] = useState(null);
  const [sentInvite, setSentInvite] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);

  const sessionUnsubRef = useRef(null);

  const subscribeToSession = useCallback((sessionId, partnerId) => {
    sessionUnsubRef.current?.();
    const unsub = listenCoopSession(sessionId, (session) => {
      if (!session) {
        setActiveSession(null);
        setPartnerProfile(null);
        sessionUnsubRef.current = null;
        return;
      }
      const partnerProgress = session.progress?.[partnerId] ?? null;
      setActiveSession({ sessionId, partnerId, partnerProgress });
    });
    sessionUnsubRef.current = unsub;
  }, []);

  // Listen for incoming invites
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenForInvites(user.uid, setIncomingInvite);
    return () => unsub();
  }, [user?.uid]);

  // Host side: watch for guest accepting (session becomes active)
  useEffect(() => {
    if (!sentInvite || !user?.uid) return;
    const { toUserId, toUsername, toAvatarId } = sentInvite;
    const sessionId = getSessionId(user.uid, toUserId);
    const unsub = listenCoopSession(sessionId, (session) => {
      if (session?.status === 'active') {
        setSentInvite(null);
        setPartnerProfile({ uid: toUserId, username: toUsername, avatarId: toAvatarId });
        subscribeToSession(sessionId, toUserId);
      }
    });
    return () => unsub();
  }, [sentInvite?.toUserId, user?.uid, subscribeToSession]);

  // Clean up on sign out
  useEffect(() => {
    if (!user) {
      sessionUnsubRef.current?.();
      sessionUnsubRef.current = null;
      setActiveSession(null);
      setIncomingInvite(null);
      setSentInvite(null);
      setPartnerProfile(null);
    }
  }, [user]);

  const sendInvite = useCallback(async (toUserId, toUsername, toAvatarId) => {
    if (!user?.uid || !profile) return;
    setSentInvite({ toUserId, toUsername, toAvatarId });
    await sendCoopInvite(user.uid, profile.username, profile.avatarId, toUserId);
  }, [user?.uid, profile]);

  const cancelInvite = useCallback(async () => {
    if (!sentInvite || !user?.uid) return;
    const { toUserId } = sentInvite;
    setSentInvite(null);
    await cancelCoopInvite(user.uid, toUserId).catch(() => {});
  }, [sentInvite, user?.uid]);

  const acceptInvite = useCallback(async () => {
    if (!incomingInvite || !user?.uid) return;
    const { fromUserId, fromUsername, fromAvatarId } = incomingInvite;
    setIncomingInvite(null);
    const sessionId = await acceptCoopInvite(fromUserId, user.uid);
    setPartnerProfile({ uid: fromUserId, username: fromUsername, avatarId: fromAvatarId });
    subscribeToSession(sessionId, fromUserId);
  }, [incomingInvite, user?.uid, subscribeToSession]);

  const declineInvite = useCallback(async () => {
    if (!incomingInvite || !user?.uid) return;
    const { fromUserId } = incomingInvite;
    setIncomingInvite(null);
    await declineCoopInvite(fromUserId, user.uid).catch(() => {});
  }, [incomingInvite, user?.uid]);

  const leaveSession = useCallback(async () => {
    if (!activeSession) return;
    const { sessionId } = activeSession;
    sessionUnsubRef.current?.();
    sessionUnsubRef.current = null;
    setActiveSession(null);
    setPartnerProfile(null);
    await endCoopSession(sessionId).catch(() => {});
  }, [activeSession]);

  const updateProgress = useCallback((progress) => {
    if (!activeSession?.sessionId || !user?.uid) return;
    updateCoopProgress(activeSession.sessionId, user.uid, progress).catch(() => {});
  }, [activeSession?.sessionId, user?.uid]);

  return (
    <CoopSessionContext.Provider
      value={{
        incomingInvite, sentInvite, activeSession, partnerProfile,
        sendInvite, cancelInvite, acceptInvite, declineInvite, leaveSession, updateProgress,
      }}
    >
      {children}

      {/* Global co-op invite modal */}
      <Modal transparent animationType="fade" visible={!!incomingInvite} onRequestClose={declineInvite}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.avatar}>{incomingInvite?.fromAvatarId ?? '🧭'}</Text>
            <Text style={modalStyles.title}>{incomingInvite?.fromUsername}</Text>
            <Text style={modalStyles.sub}>wants to focus together!</Text>
            <Text style={modalStyles.hint}>Start your timer once you accept.</Text>
            <View style={modalStyles.actions}>
              <TouchableOpacity style={modalStyles.declineBtn} onPress={declineInvite}>
                <Text style={modalStyles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.acceptBtn} onPress={acceptInvite}>
                <Text style={modalStyles.acceptBtnText}>Accept 🤝</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </CoopSessionContext.Provider>
  );
};

export const useCoopSession = () => {
  const ctx = useContext(CoopSessionContext);
  if (!ctx) throw new Error('useCoopSession must be inside CoopSessionProvider');
  return ctx;
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width - 64,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.waveActive,
  },
  avatar: { fontSize: 52, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sub: { fontSize: 15, color: COLORS.textMuted, marginBottom: 4 },
  hint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 24, opacity: 0.7 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  declineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  declineBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 15 },
  acceptBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: COLORS.waveActive,
  },
  acceptBtnText: { color: COLORS.background, fontWeight: '900', fontSize: 15 },
});
