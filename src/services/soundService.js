import { createAudioPlayer } from 'expo-audio';

// Place real .mp3 files in assets/sounds/ to activate sounds.
// All calls fail silently — missing or invalid files won't crash the app.
const SOURCES = {
  session_complete: require('../../assets/sounds/session_complete.mp3'),
  level_up:         require('../../assets/sounds/level_up.mp3'),
  achievement:      require('../../assets/sounds/achievement.mp3'),
  zone_discover:    require('../../assets/sounds/zone_discover.mp3'),
  coop_start:       require('../../assets/sounds/coop_start.mp3'),
};

// Cache player instances so we can seek-and-replay without reloading
const players = {};

const play = (key) => {
  try {
    if (players[key]) {
      players[key].seekTo(0);
      players[key].play();
      return;
    }
    const player = createAudioPlayer(SOURCES[key]);
    players[key] = player;
    player.play();
  } catch {}
};

export const playSessionComplete = () => play('session_complete');
export const playLevelUp         = () => play('level_up');
export const playAchievement     = () => play('achievement');
export const playZoneDiscover    = () => play('zone_discover');
export const playCoopStart       = () => play('coop_start');

// No-op — expo-audio handles audio session automatically
export const configureAudio = async () => {};
