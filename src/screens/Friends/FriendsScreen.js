import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getDoc, doc } from 'firebase/firestore';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useCoopSession } from '../../context/CoopSessionContext';
import { useFriendStatus } from '../../hooks/useFriendStatus';
import { useMapFog } from '../../hooks/useMapFog';
import FriendCard from '../../components/FriendCard';
import FogMap from '../../components/FogMap';
import {
  sendFriendRequest,
  respondToFriendRequest,
  getPendingRequests,
  searchUsersByUsername,
  getFriendProfiles,
  hasPendingRequestBetween,
} from '../../services/friendService';
import { db } from '../../services/firebase';
import { calculateLevel } from '../../utils/xpUtils';
import { getExplorationPercent } from '../../utils/mapUtils';
import { ZONES } from '../../constants/zones';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TABS = ['Friends', 'Requests', 'Search'];

// ── Friend map modal ─────────────────────────────────────────────────────────

const FriendMapModal = ({ friend, onClose }) => {
  const { fogOpacities } = useMapFog(friend?.discoveredZones ?? []);
  const explorationPct = getExplorationPercent(friend?.discoveredZones ?? [], ZONES.length);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={mapStyles.container}>
        <View style={mapStyles.header}>
          <View style={mapStyles.headerLeft}>
            <Text style={mapStyles.avatar}>{friend?.avatarId ?? '🧭'}</Text>
            <View>
              <Text style={mapStyles.name}>{friend?.username}'s Map</Text>
              <Text style={mapStyles.sub}>{explorationPct}% explored · read-only</Text>
            </View>
          </View>
          <TouchableOpacity style={mapStyles.closeBtn} onPress={onClose}>
            <Text style={mapStyles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={mapStyles.explorationBar}>
          <View style={[mapStyles.explorationFill, { width: `${explorationPct}%` }]} />
        </View>

        <View style={mapStyles.mapWrap}>
          <FogMap
            fogOpacities={fogOpacities}
            discoveredZones={friend?.discoveredZones ?? []}
            zoneFirestoreData={{}}
            revealingZoneId={null}
            onZonePress={null}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ── Request card ─────────────────────────────────────────────────────────────

const RequestCard = ({ request, onAccept, onDecline }) => {
  const [loading, setLoading] = useState(false);
  const p = request.senderProfile;

  const handle = async (accepted) => {
    setLoading(true);
    await (accepted ? onAccept(request) : onDecline(request));
    setLoading(false);
  };

  return (
    <View style={reqStyles.card}>
      <View style={reqStyles.avatar}>
        <Text style={reqStyles.avatarEmoji}>{p?.avatarId ?? '🧭'}</Text>
      </View>
      <View style={reqStyles.info}>
        <Text style={reqStyles.username}>{p?.username ?? 'Unknown'}</Text>
        <Text style={reqStyles.sub}>Lv.{calculateLevel(p?.xp ?? 0)} · 🔥{p?.currentStreak ?? 0}d</Text>
      </View>
      <View style={reqStyles.actions}>
        <TouchableOpacity
          style={reqStyles.acceptBtn}
          onPress={() => handle(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={reqStyles.acceptText}>✓</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={reqStyles.declineBtn}
          onPress={() => handle(false)}
          disabled={loading}
        >
          <Text style={reqStyles.declineText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Search result card ───────────────────────────────────────────────────────

const SearchResultCard = ({ result, isFriend, hasPending, onAdd }) => {
  const [sent, setSent] = useState(hasPending);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    await onAdd(result);
    setSent(true);
    setLoading(false);
  };

  return (
    <View style={srStyles.card}>
      <View style={srStyles.avatar}>
        <Text style={srStyles.avatarEmoji}>{result?.avatarId ?? '🧭'}</Text>
      </View>
      <View style={srStyles.info}>
        <Text style={srStyles.username}>{result.username}</Text>
        <Text style={srStyles.sub}>
          Lv.{calculateLevel(result?.xp ?? 0)} · {getExplorationPercent(result?.discoveredZones ?? [], ZONES.length)}% explored
        </Text>
      </View>
      {isFriend ? (
        <View style={srStyles.alreadyFriend}>
          <Text style={srStyles.alreadyFriendText}>Friends ✓</Text>
        </View>
      ) : sent ? (
        <View style={srStyles.pendingBadge}>
          <Text style={srStyles.pendingText}>Pending…</Text>
        </View>
      ) : (
        <TouchableOpacity style={srStyles.addBtn} onPress={handleAdd} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={srStyles.addText}>+ Add</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Main screen ──────────────────────────────────────────────────────────────

const FriendsScreen = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { sendInvite } = useCoopSession();

  const [activeTab, setActiveTab] = useState('Friends');
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [searching, setSearching] = useState(false);
  const [viewingFriend, setViewingFriend] = useState(null);
  const [requestCount, setRequestCount] = useState(0);

  const friendIds = profile?.friendIds ?? [];
  const statuses = useFriendStatus(friendIds);

  // Load friend profiles
  useEffect(() => {
    if (friendIds.length === 0) {
      setFriendProfiles([]);
      return;
    }
    setLoadingFriends(true);
    getFriendProfiles(friendIds)
      .then(setFriendProfiles)
      .finally(() => setLoadingFriends(false));
  }, [friendIds.join(',')]);

  // Load pending requests (reload when switching to Requests tab)
  const loadRequests = useCallback(async () => {
    if (!user?.uid) return;
    setLoadingRequests(true);
    try {
      const requests = await getPendingRequests(user.uid);
      setRequestCount(requests.length);
      const withProfiles = await Promise.all(
        requests.map(async (req) => {
          const snap = await getDoc(doc(db, 'users', req.fromUserId));
          return { ...req, senderProfile: snap.exists() ? snap.data() : null };
        }),
      );
      setPendingRequests(withProfiles);
    } finally {
      setLoadingRequests(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (activeTab === 'Requests') loadRequests();
  }, [activeTab]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const results = await searchUsersByUsername(q);
      const filtered = results.filter((u) => u.uid !== user.uid);
      // Check pending status for non-friends
      const withPending = await Promise.all(
        filtered.map(async (u) => ({
          ...u,
          _hasPending: await hasPendingRequestBetween(user.uid, u.uid),
        })),
      );
      setSearchResults(withPending);
    } catch (e) {
      Alert.alert('Search error', 'Could not search users. Try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (target) => {
    const { alreadySent } = await sendFriendRequest(user.uid, target.uid);
    if (alreadySent) Alert.alert('Already sent', 'You already sent this person a friend request.');
  };

  const handleAccept = async (request) => {
    await respondToFriendRequest(request.id, true, request.fromUserId, user.uid);
    await Promise.all([loadRequests(), refreshProfile()]);
  };

  const handleDecline = async (request) => {
    await respondToFriendRequest(request.id, false, request.fromUserId, user.uid);
    await loadRequests();
  };

  // Sort friends: focusing first, then online, then offline
  const sortedFriends = [...friendProfiles].sort((a, b) => {
    const order = { focusing: 0, online: 1, offline: 2 };
    const sa = order[statuses[a.uid]?.status ?? 'offline'];
    const sb = order[statuses[b.uid]?.status ?? 'offline'];
    return sa - sb;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
        <Text style={styles.headerSub}>{friendIds.length} friend{friendIds.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {tab === 'Requests' && requestCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{requestCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── FRIENDS TAB ── */}
      {activeTab === 'Friends' && (
        loadingFriends ? (
          <ActivityIndicator color={COLORS.waveActive} style={styles.loader} />
        ) : sortedFriends.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptySub}>Search for users by username to add them</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setActiveTab('Search')}
            >
              <Text style={styles.emptyBtnText}>Find Friends</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={sortedFriends}
            keyExtractor={(item) => item.uid}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <FriendCard
                profile={item}
                status={statuses[item.uid]}
                onViewMap={() => setViewingFriend(item)}
                onFocusTogether={() => {
                  sendInvite(item.uid, item.username, item.avatarId);
                  Alert.alert(
                    'Invite sent!',
                    `${item.username} will be notified. Head to the Focus tab to start your session when they accept.`,
                  );
                }}
              />
            )}
          />
        )
      )}

      {/* ── REQUESTS TAB ── */}
      {activeTab === 'Requests' && (
        loadingRequests ? (
          <ActivityIndicator color={COLORS.waveActive} style={styles.loader} />
        ) : pendingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📬</Text>
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.emptySub}>Friend requests you receive will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={pendingRequests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <RequestCard
                request={item}
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            )}
          />
        )
      )}

      {/* ── SEARCH TAB ── */}
      {activeTab === 'Search' && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Enter exact username…"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <Text style={styles.searchBtnText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

          {searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.uid}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) => (
                <SearchResultCard
                  result={item}
                  isFriend={friendIds.includes(item.uid)}
                  hasPending={item._hasPending}
                  onAdd={handleSendRequest}
                />
              )}
            />
          )}

          {!searching && searchQuery.length > 0 && searchResults.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySub}>
                Make sure the username is spelled exactly as written — usernames are case-sensitive.
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {/* Friend map modal */}
      {viewingFriend && (
        <FriendMapModal
          friend={viewingFriend}
          onClose={() => setViewingFriend(null)}
        />
      )}
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textMuted },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  tabActive: { backgroundColor: COLORS.surfaceLight },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.text, fontWeight: '800' },
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  loader: { marginTop: 60 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 8,
    marginTop: -40,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: COLORS.waveActive,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyBtnText: { color: COLORS.background, fontWeight: '800', fontSize: 14 },
  searchBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: COLORS.waveActive,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.6 },
  searchBtnText: { color: COLORS.background, fontWeight: '800', fontSize: 14 },
});

const mapStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080D1A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { fontSize: 32 },
  name: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '700' },
  explorationBar: {
    height: 3,
    backgroundColor: COLORS.surfaceLight,
    marginHorizontal: 18,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  explorationFill: {
    height: '100%',
    backgroundColor: COLORS.waveActive,
    borderRadius: 2,
  },
  mapWrap: { flex: 1 },
});

const reqStyles = StyleSheet.create({
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 22 },
  info: { flex: 1 },
  username: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 14 },
});

const srStyles = StyleSheet.create({
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 22 },
  info: { flex: 1 },
  username: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  addBtn: {
    backgroundColor: COLORS.waveActive,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addText: { color: COLORS.background, fontWeight: '800', fontSize: 13 },
  pendingBadge: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  alreadyFriend: {
    backgroundColor: `${COLORS.success}22`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  alreadyFriendText: { color: COLORS.success, fontSize: 12, fontWeight: '700' },
});

export default FriendsScreen;
