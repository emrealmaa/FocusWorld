export const ZONE_TYPES = {
  FOREST_TRAIL: 'forest_trail',
  ABANDONED_COTTAGE: 'abandoned_cottage',
  OLD_FARMLAND: 'old_farmland',
  RUINED_VILLAGE: 'ruined_village',
  COLLAPSED_CHURCH: 'collapsed_church',
  ANCIENT_CASTLE: 'ancient_castle',
  VOLCANIC_SUMMIT: 'volcanic_summit',
};

export const ZONE_COLORS = {
  forest_trail: '#1A4731',
  abandoned_cottage: '#3D2B1F',
  old_farmland: '#3D3016',
  ruined_village: '#2A2A3D',
  collapsed_church: '#2D1A3D',
  ancient_castle: '#1A1A2E',
  volcanic_summit: '#3D1A0A',
};

export const ZONE_ACCENT_COLORS = {
  forest_trail: '#4CAF50',
  abandoned_cottage: '#A0522D',
  old_farmland: '#C9A84C',
  ruined_village: '#7986CB',
  collapsed_church: '#AB47BC',
  ancient_castle: '#5C6BC0',
  volcanic_summit: '#FF5722',
};

export const ZONES = [
  {
    id: 'zone_1',
    type: ZONE_TYPES.FOREST_TRAIL,
    name: 'Whisperwood Trail',
    emoji: '🌲',
    lore: 'A winding path through ancient trees. Moss-covered stones hint at travelers long past. The air smells of pine and secrets.',
    pomodorosRequired: 2,
    x: 100, y: 180,
    radius: 44,
    groupRequired: false,
  },
  {
    id: 'zone_2',
    type: ZONE_TYPES.FOREST_TRAIL,
    name: 'Moonlit Grove',
    emoji: '🌲',
    lore: 'Bioluminescent fungi light this hidden grove at night. Something watches from the shadows, patient and old.',
    pomodorosRequired: 3,
    x: 245, y: 130,
    radius: 44,
    groupRequired: false,
  },
  {
    id: 'zone_3',
    type: ZONE_TYPES.ABANDONED_COTTAGE,
    name: "Miller's Rest",
    emoji: '🏡',
    lore: "A stone cottage with a collapsed roof. A faded family portrait still hangs on the wall. The hearth holds cold ash.",
    pomodorosRequired: 5,
    x: 160, y: 310,
    radius: 48,
    groupRequired: false,
  },
  {
    id: 'zone_4',
    type: ZONE_TYPES.OLD_FARMLAND,
    name: 'The Fallow Fields',
    emoji: '🌾',
    lore: 'Once fertile farmland now reclaimed by weeds. Ancient irrigation channels still run faint beneath the soil.',
    pomodorosRequired: 8,
    x: 370, y: 230,
    radius: 52,
    groupRequired: false,
  },
  {
    id: 'zone_5',
    type: ZONE_TYPES.RUINED_VILLAGE,
    name: 'Ashvale',
    emoji: '🏚️',
    lore: 'What was once a bustling trading post. The central well still holds clear water. Thirteen hearths, all cold.',
    pomodorosRequired: 15,
    x: 290, y: 400,
    radius: 58,
    groupRequired: false,
    groupRecommended: true,
  },
  {
    id: 'zone_6',
    type: ZONE_TYPES.COLLAPSED_CHURCH,
    name: 'The Hollow Spire',
    emoji: '⛪',
    lore: 'A cathedral of forgotten faith. Its bell tower collapsed inward, yet the stained glass survived every storm.',
    pomodorosRequired: 30,
    x: 470, y: 360,
    radius: 62,
    groupRequired: true,
  },
  {
    id: 'zone_7',
    type: ZONE_TYPES.ANCIENT_CASTLE,
    name: 'Ironmere Keep',
    emoji: '🏰',
    lore: 'A fortress that held against three sieges. Its dungeons are said to be bottomless. The throne is still warm.',
    pomodorosRequired: 60,
    x: 550, y: 165,
    radius: 72,
    groupRequired: true,
  },
  {
    id: 'zone_8',
    type: ZONE_TYPES.VOLCANIC_SUMMIT,
    name: 'The Smoldering Crown',
    emoji: '🌋',
    lore: 'At the peak of the world, where fire meets sky. Legends say a god sleeps beneath. The ground trembles with each breath.',
    pomodorosRequired: 150,
    x: 660, y: 60,
    radius: 82,
    groupRequired: true,
    seasonal: true,
  },
];

// Decorative path connections between zones
export const ZONE_CONNECTIONS = [
  ['zone_1', 'zone_2'],
  ['zone_1', 'zone_3'],
  ['zone_2', 'zone_4'],
  ['zone_3', 'zone_5'],
  ['zone_4', 'zone_5'],
  ['zone_4', 'zone_6'],
  ['zone_5', 'zone_6'],
  ['zone_6', 'zone_7'],
  ['zone_7', 'zone_8'],
];

export const ZONE_STATE = {
  HIDDEN: 'hidden',
  DISCOVERED: 'discovered',
  RESTORED: 'restored',
};

export const MAP_WIDTH = 820;
export const MAP_HEIGHT = 620;
