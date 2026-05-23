/**
 * Firestore Zone Seeder
 *
 * Usage:
 *   1. Download your service account key:
 *      Firebase Console → Project Settings → Service accounts → Generate new private key
 *      Save the JSON file as: scripts/serviceAccountKey.json
 *
 *   2. Run from the FocusWorld directory:
 *      node scripts/seedZones.js
 *
 *   The script is idempotent — running it again resets zones to 0 progress.
 *   Pass --skip-existing to leave already-created zones untouched:
 *      node scripts/seedZones.js --skip-existing
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ── Config ──────────────────────────────────────────────────────────────────

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const SKIP_EXISTING = process.argv.includes('--skip-existing');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('\n❌  Service account key not found.');
  console.error('    Expected path:', SERVICE_ACCOUNT_PATH);
  console.error('\n    Steps to get it:');
  console.error('    1. Go to https://console.firebase.google.com');
  console.error('    2. Open your project → Project Settings → Service accounts');
  console.error('    3. Click "Generate new private key" → save as scripts/serviceAccountKey.json\n');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://focusworld-47097-default-rtdb.europe-west1.firebasedatabase.app',
});

const db = admin.firestore();

// ── Zone data (mirrors src/constants/zones.js) ───────────────────────────────

const ZONES = [
  {
    id: 'zone_1',
    type: 'forest_trail',
    name: 'Whisperwood Trail',
    emoji: '🌲',
    lore: 'A winding path through ancient trees. Moss-covered stones hint at travelers long past. The air smells of pine and secrets.',
    totalPomodorosRequired: 2,
    groupRequired: false,
    groupRecommended: false,
    seasonal: false,
  },
  {
    id: 'zone_2',
    type: 'forest_trail',
    name: 'Moonlit Grove',
    emoji: '🌲',
    lore: 'Bioluminescent fungi light this hidden grove at night. Something watches from the shadows, patient and old.',
    totalPomodorosRequired: 3,
    groupRequired: false,
    groupRecommended: false,
    seasonal: false,
  },
  {
    id: 'zone_3',
    type: 'abandoned_cottage',
    name: "Miller's Rest",
    emoji: '🏡',
    lore: "A stone cottage with a collapsed roof. A faded family portrait still hangs on the wall. The hearth holds cold ash.",
    totalPomodorosRequired: 5,
    groupRequired: false,
    groupRecommended: false,
    seasonal: false,
  },
  {
    id: 'zone_4',
    type: 'old_farmland',
    name: 'The Fallow Fields',
    emoji: '🌾',
    lore: 'Once fertile farmland now reclaimed by weeds. Ancient irrigation channels still run faint beneath the soil.',
    totalPomodorosRequired: 8,
    groupRequired: false,
    groupRecommended: false,
    seasonal: false,
  },
  {
    id: 'zone_5',
    type: 'ruined_village',
    name: 'Ashvale',
    emoji: '🏚️',
    lore: 'What was once a bustling trading post. The central well still holds clear water. Thirteen hearths, all cold.',
    totalPomodorosRequired: 15,
    groupRequired: false,
    groupRecommended: true,
    seasonal: false,
  },
  {
    id: 'zone_6',
    type: 'collapsed_church',
    name: 'The Hollow Spire',
    emoji: '⛪',
    lore: 'A cathedral of forgotten faith. Its bell tower collapsed inward, yet the stained glass survived every storm.',
    totalPomodorosRequired: 30,
    groupRequired: true,
    groupRecommended: false,
    seasonal: false,
  },
  {
    id: 'zone_7',
    type: 'ancient_castle',
    name: 'Ironmere Keep',
    emoji: '🏰',
    lore: 'A fortress that held against three sieges. Its dungeons are said to be bottomless. The throne is still warm.',
    totalPomodorosRequired: 60,
    groupRequired: true,
    groupRecommended: false,
    seasonal: false,
  },
  {
    id: 'zone_8',
    type: 'volcanic_summit',
    name: 'The Smoldering Crown',
    emoji: '🌋',
    lore: 'At the peak of the world, where fire meets sky. Legends say a god sleeps beneath. The ground trembles with each breath.',
    totalPomodorosRequired: 150,
    groupRequired: true,
    groupRecommended: false,
    seasonal: true,
  },
];

// ── Seeder ───────────────────────────────────────────────────────────────────

async function seedZones() {
  console.log('\n🌍  FocusWorld — Zone Seeder');
  console.log('─'.repeat(42));
  console.log(`Mode: ${SKIP_EXISTING ? 'skip existing docs' : 'overwrite all'}\n`);

  const batch = db.batch();
  let queued = 0;
  let skipped = 0;

  for (const zone of ZONES) {
    const ref = db.collection('zones').doc(zone.id);

    if (SKIP_EXISTING) {
      const snap = await ref.get();
      if (snap.exists) {
        console.log(`  ⏭   Skipped  ${zone.id}  (${zone.name})`);
        skipped++;
        continue;
      }
    }

    const doc = {
      name: zone.name,
      type: zone.type,
      emoji: zone.emoji,
      lore: zone.lore,
      totalPomodorosRequired: zone.totalPomodorosRequired,
      currentTotalPomodoros: 0,
      contributors: {},
      isRestored: false,
      groupRequired: zone.groupRequired,
      groupRecommended: zone.groupRecommended,
      seasonal: zone.seasonal,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(ref, doc);
    console.log(`  ✏️   Queued   ${zone.id}  (${zone.name})`);
    queued++;
  }

  if (queued === 0) {
    console.log('\n✅  Nothing to write — all zones already exist.\n');
    process.exit(0);
  }

  console.log(`\n  Committing ${queued} document${queued !== 1 ? 's' : ''}…`);
  await batch.commit();

  console.log('\n✅  Done!');
  if (skipped > 0) console.log(`    ${skipped} zone${skipped !== 1 ? 's' : ''} skipped (already existed).`);
  console.log(`    ${queued} zone${queued !== 1 ? 's' : ''} written to Firestore.\n`);
}

seedZones().catch((err) => {
  console.error('\n❌  Seeder failed:', err.message);
  process.exit(1);
});
