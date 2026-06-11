/**
 * Baldur's Gate monster presets (BG / BG:EE combat stats).
 * Sources: Baldur's Gate Wiki, IESDP / summoned creature tables.
 */

const MONSTER_PRESETS = {
  wolf: {
    label: 'Wolf',
    name: 'Wolf',
    thac0: 17,
    apr: 1,
    a: 1,
    b: 4,
    c: 2,
    d: 0,
    ac: 7,
    helmet: false,
  },
  gibberling: {
    label: 'Gibberling',
    name: 'Gibberling',
    thac0: 19,
    apr: 1,
    a: 1,
    b: 6,
    c: 1,
    d: 0,
    ac: 5,
    helmet: false,
  },
  dreadWolf: {
    label: 'Dread Wolf',
    name: 'Dread Wolf',
    thac0: 15,
    apr: 1,
    a: 1,
    b: 10,
    c: 0,
    d: 0,
    ac: 6,
    helmet: false,
  },
  ghoul: {
    label: 'Ghoul',
    name: 'Ghoul',
    thac0: 17,
    apr: 3,
    a: 1,
    b: 6,
    c: 0,
    d: 0,
    ac: 6,
    helmet: false,
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MONSTER_PRESETS };
}
