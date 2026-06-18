const express = require('express');
const cors = require('cors');
const { faker: fakerEn } = require('@faker-js/faker/locale/en');
const { faker: fakerDe } = require('@faker-js/faker/locale/de');
const { faker: fakerUk } = require('@faker-js/faker/locale/uk');
const fs = require('fs');
const path = require('path');

const app = express();
// allow requests from any device on the local network (phone, tablet, etc.)
app.use(cors({ origin: '*' }));
app.use(express.json());


// load locale config from external file
const localesConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'locales.json'), 'utf8')
);

const fakers = {
  en: fakerEn,
  de: fakerDe,
  uk: fakerUk,
};

function getFakerInstance(localeCode) {
  const config = localesConfig[localeCode];
  if (!config) return fakerEn;
  return fakers[config.fakerLocale] || fakerEn;
}

// capitalizes the first letter of a word
function cap(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// deterministic random number generator using LCG
function createRng(seed) {
  let h = Math.abs(seed) % 2147483647;
  if (h === 0) h = 1;
  return function () {
    h = (h * 16807) % 2147483647;
    return (h - 1) / 2147483646;
  };
}

// converts a string seed to a 32-bit integer
function hashStringToInt(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// scrambles a number for better avalanche effect (MurmurHash3 fmix32)
function scramble(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// common chord progressions
const CHORD_PROGRESSIONS = [
  [0, 4, 5, 3],     // I-V-vi-IV
  [0, 3, 4, 4],     // I-IV-V-V
  [0, 5, 3, 4],     // I-vi-IV-V
  [0, 3, 0, 4],     // I-IV-I-V
  [0, 2, 3, 4],     // I-iii-IV-V
  [5, 3, 0, 4],     // vi-IV-I-V
  [0, 4, 3, 5],     // I-V-IV-vi
  [0, 3, 5, 4],     // I-IV-vi-V
];

const SCALE_TYPES = [
  { name: 'major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { name: 'minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { name: 'pentatonic', intervals: [0, 2, 4, 7, 9] },
  { name: 'blues', intervals: [0, 3, 5, 6, 7, 10] },
  { name: 'dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
];

const ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const RHYTHM_PATTERNS = [
  [1, 0, 1, 0, 1, 0, 1, 0],           // straight quarter
  [1, 0, 0, 1, 0, 0, 1, 0],           // syncopated
  [1, 1, 0, 1, 1, 0, 1, 0],           // driving
  [1, 0, 1, 1, 0, 1, 0, 1],           // funky
  [1, 0, 0, 0, 1, 0, 0, 0],           // half notes
  [1, 1, 1, 0, 1, 1, 1, 0],           // dense
];

const INSTRUMENT_TYPES = ['sine', 'triangle', 'square', 'sawtooth'];

// locale-specific word lists because faker.word.* falls back to English for de/uk
const LOCALE_WORDS = {
  en: {
    adj:  ['Silent', 'Golden', 'Broken', 'Wild', 'Electric', 'Burning', 'Lost', 'Dark', 'Sweet', 'Hollow', 'Frozen', 'Neon', 'Endless', 'Faded', 'Velvet'],
    noun: ['Road', 'Heart', 'Sky', 'Dream', 'Fire', 'Soul', 'Rain', 'Light', 'Wave', 'Storm', 'Night', 'Ghost', 'River', 'City', 'Shadow'],
    verb: ['Run', 'Fall', 'Rise', 'Chase', 'Burn', 'Fade', 'Fly', 'Break', 'Float', 'Drift', 'Shine', 'Bleed', 'Breathe', 'Howl', 'Scream'],
    prep: ['Through', 'Beyond', 'Beneath', 'Within', 'Under', 'Above', 'Across', 'Into'],
    album: ['Midnight Echoes', 'Broken Wings', 'Golden Hour', 'Neon Dreams', 'Silent Storm', 'Endless Sky', 'Dark Horizon', 'Velvet Thunder', 'Lost Signals', 'Electric Soul'],
  },
  de: {
    adj:  ['Stille', 'Goldene', 'Gebrochene', 'Wilde', 'Brennende', 'Verlorene', 'Dunkle', 'Süße', 'Ewige', 'Gefrorene', 'Leuchtende', 'Ferne', 'Tiefe', 'Blaue', 'Rote'],
    noun: ['Straße', 'Herz', 'Himmel', 'Traum', 'Feuer', 'Seele', 'Regen', 'Licht', 'Welle', 'Sturm', 'Nacht', 'Geist', 'Fluss', 'Stadt', 'Schatten'],
    verb: ['Laufen', 'Fallen', 'Steigen', 'Jagen', 'Brennen', 'Verblassen', 'Fliegen', 'Brechen', 'Treiben', 'Leuchten', 'Schreien', 'Atmen', 'Tanzen', 'Weinen', 'Träumen'],
    prep: ['Durch', 'Jenseits', 'Unter', 'Über', 'Innerhalb', 'Entlang', 'Zwischen', 'Hinter'],
    album: ['Mitternacht', 'Gebrochene Flügel', 'Goldene Stunde', 'Neon Träume', 'Stiller Sturm', 'Endloser Himmel', 'Dunkler Horizont', 'Samtiger Donner', 'Verlorene Signale', 'Elektrische Seele'],
  },
  uk: {
    adj:  ['Тиха', 'Золота', 'Зламана', 'Дика', 'Палаюча', 'Загублена', 'Темна', 'Солодка', 'Вічна', 'Крижана', 'Яскрава', 'Далека', 'Глибока', 'Синя', 'Червона'],
    noun: ['Дорога', 'Серце', 'Небо', 'Мрія', 'Вогонь', 'Душа', 'Дощ', 'Світло', 'Хвиля', 'Буря', 'Ніч', 'Привид', 'Річка', 'Місто', 'Тінь'],
    verb: ['Бігти', 'Падати', 'Підніматись', 'Горіти', 'Зникати', 'Летіти', 'Ламати', 'Сяяти', 'Кричати', 'Дихати', 'Танцювати', 'Плакати', 'Мріяти', 'Шукати', 'Йти'],
    prep: ['Через', 'За', 'Під', 'Над', 'Між', 'Крізь', 'Вздовж', 'Поза'],
    album: ['Опівніч', 'Зламані крила', 'Золота година', 'Неонові мрії', 'Тиха буря', 'Нескінченне небо', 'Темний горизонт', 'Оксамитовий грім', 'Загублені сигнали', 'Електрична душа'],
  },
};

// picks a random element from an array using our deterministic rng
function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

// builds a locale-aware song title
function makeSongTitle(words, rng) {
  const pattern = Math.floor(rng() * 4);
  if (pattern === 0) return `${pick(words.adj, rng)} ${pick(words.noun, rng)}`;
  if (pattern === 1) return `${pick(words.verb, rng)} ${pick(words.noun, rng)}`;
  if (pattern === 2) return `${pick(words.noun, rng)} ${pick(words.prep, rng)} ${pick(words.noun, rng)}`;
  return `${pick(words.adj, rng)} ${pick(words.noun, rng)} ${pick(words.noun, rng)}`;
}

// available visual styles for cover art
const COVER_STYLES = [
  'vinyl',
  'geometric',
  'waves',
  'mosaic',
  'starburst',
  'organic',
  'retro',
  'minimal',
];

// returns list of supported locales
app.get('/api/locales', (req, res) => {
  const result = {};
  for (const [code, config] of Object.entries(localesConfig)) {
    result[code] = config.name;
  }
  res.json(result);
});

// returns a page of generated songs
app.get('/api/songs', (req, res) => {
  const localeParam = req.query.locale || 'en';
  const userSeedStr = req.query.seed || '12345';
  const page = Number(req.query.page) || 1;
  const likesParam = Number(req.query.likes) || 0;

  const fakerInstance = getFakerInstance(localeParam);
  const itemsPerPage = 10;
  const startIndex = (page - 1) * itemsPerPage + 1;
  const responseSongs = [];

  const numericUserSeed = hashStringToInt(userSeedStr);

  for (let i = 0; i < itemsPerPage; i++) {
    const currentId = startIndex + i;

    // content seed depends on user seed + item index (not likes)
    const contentSeed = ((numericUserSeed * 1103515245 + currentId * 12345) & 0x7fffffff) || 1;

    // likes seed is a separate branch so likes don't affect song content
    const likesSeed = scramble((numericUserSeed ^ currentId) & 0x7fffffff) || 1;

    const contentRng = createRng(contentSeed);
    const likesRng = createRng(likesSeed);

    // seed faker for this song
    fakerInstance.seed(contentSeed);

    // use locale-specific word lists for title, band name, album
    const localeKey = localesConfig[localeParam]?.fakerLocale || 'en';
    const words = LOCALE_WORDS[localeKey] || LOCALE_WORDS.en;

    // song title from locale word list
    const songTitle = makeSongTitle(words, contentRng);

    // genres are international terms so we keep them in English
    const genre = fakerInstance.music.genre();

    // artist: either a locale-specific full name or a locale word-based band name
    const personalName = fakerInstance.person.fullName();
    const bandName = `${pick(words.adj, contentRng)} ${pick(words.noun, contentRng)}s`;
    const artist = contentRng() > 0.5 ? personalName : bandName;

    // album: either 'Single' or a locale-specific album phrase
    const isSingle = contentRng() > 0.6;
    const album = isSingle ? 'Single' : pick(words.album, contentRng);

    // probabilistic likes: fractional part decides if we round up
    let finalLikes = Math.floor(likesParam);
    const fractionalPart = likesParam - finalLikes;
    if (likesRng() < fractionalPart) {
      finalLikes += 1;
    }

    // audio metadata using music theory
    const tempo = 70 + Math.floor(contentRng() * 90); // 70–160 BPM
    const rootNoteIdx = Math.floor(contentRng() * ROOT_NOTES.length);
    const rootNote = ROOT_NOTES[rootNoteIdx];
    const scaleType = SCALE_TYPES[Math.floor(contentRng() * SCALE_TYPES.length)];
    const progression = CHORD_PROGRESSIONS[Math.floor(contentRng() * CHORD_PROGRESSIONS.length)];
    const rhythmPattern = RHYTHM_PATTERNS[Math.floor(contentRng() * RHYTHM_PATTERNS.length)];

    const melodyInstrument = INSTRUMENT_TYPES[Math.floor(contentRng() * INSTRUMENT_TYPES.length)];
    const bassInstrument = INSTRUMENT_TYPES[Math.floor(contentRng() * 2)]; // sine or triangle for bass
    const padInstrument = INSTRUMENT_TYPES[Math.floor(contentRng() * INSTRUMENT_TYPES.length)];

    // melody note sequence (16–32 notes)
    const melodyLength = 16 + Math.floor(contentRng() * 16);
    const melodyNotes = [];
    for (let n = 0; n < melodyLength; n++) {
      const degree = Math.floor(contentRng() * scaleType.intervals.length);
      const octaveShift = Math.floor(contentRng() * 2);
      melodyNotes.push({
        degree,
        octave: octaveShift,
        duration: contentRng() > 0.7 ? 2 : 1,
        velocity: 0.3 + contentRng() * 0.5,
      });
    }

    // bass note sequence
    const bassNotes = [];
    for (let b = 0; b < 8; b++) {
      bassNotes.push({
        chordIdx: b % progression.length,
        octave: -1,
        duration: contentRng() > 0.5 ? 2 : 1,
      });
    }

    const numBars = 4 + Math.floor(contentRng() * 4); // 4–8 bars
    const timeSignature = contentRng() > 0.85 ? 3 : 4; // mostly 4/4, occasionally 3/4
    const swing = contentRng() > 0.6 ? 0.1 + contentRng() * 0.15 : 0;

    // cover art metadata
    const coverStyle = COVER_STYLES[Math.floor(contentRng() * COVER_STYLES.length)];
    const hue1 = Math.floor(contentRng() * 360);
    const hue2 = (hue1 + 30 + Math.floor(contentRng() * 120)) % 360;
    const hue3 = (hue1 + 180 + Math.floor(contentRng() * 60)) % 360;
    const saturation = 50 + Math.floor(contentRng() * 40);
    const lightness = 25 + Math.floor(contentRng() * 30);
    const gradientAngle = Math.floor(contentRng() * 360);
    const patternDensity = 3 + Math.floor(contentRng() * 8);
    const shapeCount = 4 + Math.floor(contentRng() * 12);

    // extra shape descriptors for the canvas renderer
    const shapes = [];
    for (let s = 0; s < shapeCount; s++) {
      shapes.push({
        type: ['circle', 'rect', 'triangle', 'arc', 'line', 'ellipse'][Math.floor(contentRng() * 6)],
        x: contentRng(),
        y: contentRng(),
        size: 0.05 + contentRng() * 0.3,
        rotation: contentRng() * Math.PI * 2,
        hueOffset: Math.floor(contentRng() * 60) - 30,
        opacity: 0.1 + contentRng() * 0.6,
      });
    }

    // review text using a slightly shifted seed
    fakerInstance.seed(contentSeed + 9999);
    const reviewSentences = [];
    const sentenceCount = 2 + Math.floor(contentRng() * 3);
    for (let s = 0; s < sentenceCount; s++) {
      reviewSentences.push(fakerInstance.lorem.sentence({ min: 6, max: 14 }));
    }
    const reviewText = reviewSentences.join(' ');
    const reviewRating = 2 + Math.floor(contentRng() * 4); // 2–5 stars

    // lyrics built from fixed phrase pools
    const lyricLines1 = [
      "Neon lights are callin'",
      "Walking in the shadows",
      "Hear the music playing",
      "Lost inside the system",
      "Golden rays are shining",
      "Through the misty morning"
    ];
    const lyricLines2 = [
      "Down this empty road",
      "Underneath the sky",
      "To a different beat",
      "Search for something real",
      "Warmth begins to grow",
      "Whispers in the dark"
    ];
    const lyricLines3 = [
      "City dreams are fallin'",
      "Time is moving backwards",
      "No one is around us",
      "Looking for an answer",
      "Every second counts now",
      "Memories are calling"
    ];
    const lyricLines4 = [
      "Like a heavy load",
      "Running out of time",
      "We will find a way",
      "Never looking back",
      "Rising from the dust",
      "Into the unknown"
    ];

    const idx1 = Math.floor(contentRng() * lyricLines1.length);
    const idx2 = Math.floor(contentRng() * lyricLines2.length);
    const idx3 = Math.floor(contentRng() * lyricLines3.length);
    const idx4 = Math.floor(contentRng() * lyricLines4.length);

    const lyricsText = `${lyricLines1[idx1]}\n${lyricLines2[idx2]}\n${lyricLines3[idx3]}\n${lyricLines4[idx4]}\n\n${songTitle}\nNowhere to hide\nWe're just ghosts\nIn the ${genre.toLowerCase()} glow`;

    responseSongs.push({
      index: currentId,
      title: songTitle,
      artist: artist,
      album: album,
      genre: genre,
      likes: finalLikes,
      lyrics: lyricsText,
      review: {
        text: reviewText,
        rating: reviewRating,
      },
      audioMeta: {
        seed: contentSeed,
        tempo,
        rootNote,
        rootNoteIdx,
        scale: scaleType.name,
        scaleIntervals: scaleType.intervals,
        progression,
        rhythmPattern,
        melodyInstrument,
        bassInstrument,
        padInstrument,
        melodyNotes,
        bassNotes,
        numBars,
        timeSignature,
        swing,
      },
      coverMeta: {
        seed: contentSeed,
        style: coverStyle,
        hue1,
        hue2,
        hue3,
        saturation,
        lightness,
        gradientAngle,
        patternDensity,
        shapeCount,
        shapes,
      },
    });
  }

  return res.json(responseSongs);
});

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback to index.html for all other routes (for React frontend routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SoundStore Backend running on port ${PORT}`);
});