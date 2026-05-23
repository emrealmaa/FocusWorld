import { Audio } from 'expo-av';

// Place .mp3 files in assets/sounds/ to activate each sound.
// All operations fail silently — missing files won't crash the app.
const SOUND_MAP = {
  session_complete: require('../../assets/sounds/session_complete.mp3'),
  level_up:         require('../../assets/sounds/level_up.mp3'),
  achievement:      require('../../assets/sounds/achievement.mp3'),
  zone_discover:    require('../../assets/sounds/zone_discover.mp3'),
  coop_start:       require('../../assets/sounds/coop_start.mp3'),
};

// Cache loaded Sound objects to avoid reloading on every play
const cache = {};

const loadAndPlay = async (key) => {
  try {
    if (!SOUND_MAP[key]) return;

    // Reuse cached instance when possible
    if (cache[key]) {
      await cache[key].setPositionAsync(0);
      await cache[key].playAsync();
      return;
    }

    const { sound } = await Audio.Sound.createAsync(SOUND_MAP[key], { shouldPlay: true });
    cache[key] = sound;

    // Auto-unload after playback to free memory if we start accumulating
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish && !status.isLooping) {
        // keep in cache for next play — don't unload
      }
    });
  } catch {
    // Missing file or audio session error — ignore
  }
};

export const playSessionComplete = () => loadAndPlay('session_complete');
export const playLevelUp         = () => loadAndPlay('level_up');
export const playAchievement     = () => loadAndPlay('achievement');
export const playZoneDiscover    = () => loadAndPlay('zone_discover');
export const playCoopStart       = () => loadAndPlay('coop_start');

export const configureAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
    });
  } catch {}
};
