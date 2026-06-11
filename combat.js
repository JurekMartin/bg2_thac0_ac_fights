/**
 * Baldur's Gate combat calculations (AD&D 2e / BG engine).
 */

const CRIT_CHANCE = 1 / 20;

/**
 * Probability to hit on d20: nat 1 always misses, nat 20 always hits.
 * Otherwise hit when roll >= THAC0 - AC.
 */
function hitProbability(thac0, ac) {
  const threshold = thac0 - ac;
  if (threshold > 20) return CRIT_CHANCE;
  if (threshold <= 1) return 19 / 20;
  return (20 - threshold + 1) / 20;
}

/** Expected value of AdB dice sum. */
function expectedDice(a, b) {
  const dice = Math.max(0, Number(a) || 0);
  const sides = Math.max(1, Number(b) || 1);
  return dice * (sides + 1) / 2;
}

/** Expected weapon portion AdB + C (the part that crits can double). */
function expectedWeaponDamage(a, b, c) {
  return expectedDice(a, b) + (Number(c) || 0);
}

/**
 * Average damage on a successful hit.
 * D is not doubled on critical; helmet negates crit bonus damage.
 */
function averageDamagePerHit(a, b, c, d, defenderHasHelmet) {
  const weapon = expectedWeaponDamage(a, b, c);
  const flat = Number(d) || 0;
  const critBonus = defenderHasHelmet ? 0 : CRIT_CHANCE * weapon;
  return weapon + flat + critBonus;
}

/**
 * Average damage per round for one attacker vs one defender.
 */
function damagePerRound(attacker, defender) {
  const hitPct = hitProbability(attacker.thac0, defender.ac);
  const dmgPerHit = averageDamagePerHit(
    attacker.a, attacker.b, attacker.c, attacker.d,
    defender.helmet
  );
  const apr = Math.max(0, Number(attacker.apr) || 0);
  return {
    hitProbability: hitPct,
    damagePerHit: dmgPerHit,
    damagePerRound: apr * hitPct * dmgPerHit,
  };
}

function pctChange(before, after) {
  if (before === 0) {
    if (after === 0) return 0;
    return Infinity;
  }
  return ((after - before) / before) * 100;
}

function formatPct(value) {
  return (value * 100).toFixed(1) + '%';
}

function formatDmg(value) {
  return value.toFixed(2);
}

function formatPctChange(value) {
  if (!Number.isFinite(value)) return value > 0 ? '+∞%' : '—';
  const sign = value > 0 ? '+' : '';
  return sign + value.toFixed(1) + '%';
}

function resolveChar(char, useCompare) {
  if (!useCompare || !char.compareActive) {
    return {
      thac0: Number(char.thac0) || 0,
      apr: Number(char.apr) || 0,
      a: Number(char.a) || 0,
      b: Number(char.b) || 1,
      c: Number(char.c) || 0,
      d: Number(char.d) || 0,
      ac: Number(char.ac) || 0,
      helmet: Boolean(char.helmet),
    };
  }
  const cmp = char.compare;
  return {
    thac0: cmp.thac0 !== '' ? Number(cmp.thac0) : Number(char.thac0) || 0,
    apr: cmp.apr !== '' ? Number(cmp.apr) : Number(char.apr) || 0,
    a: cmp.a !== '' ? Number(cmp.a) : Number(char.a) || 0,
    b: cmp.b !== '' ? Number(cmp.b) : Number(char.b) || 1,
    c: cmp.c !== '' ? Number(cmp.c) : Number(char.c) || 0,
    d: cmp.d !== '' ? Number(cmp.d) : Number(char.d) || 0,
    ac: cmp.ac !== '' ? Number(cmp.ac) : Number(char.ac) || 0,
    helmet: cmp.helmet !== null ? cmp.helmet : Boolean(char.helmet),
  };
}

function compareFieldDiffers(base, compareValue) {
  return compareValue !== '' && Number(compareValue) !== Number(base);
}

function hasCompareOverride(char) {
  if (!char.compareActive) return false;
  const cmp = char.compare;
  return (
    compareFieldDiffers(char.thac0, cmp.thac0) ||
    compareFieldDiffers(char.apr, cmp.apr) ||
    compareFieldDiffers(char.a, cmp.a) ||
    compareFieldDiffers(char.b, cmp.b) ||
    compareFieldDiffers(char.c, cmp.c) ||
    compareFieldDiffers(char.d, cmp.d) ||
    compareFieldDiffers(char.ac, cmp.ac) ||
    (cmp.helmet !== null && cmp.helmet !== Boolean(char.helmet))
  );
}

function anyCompareActive(charsA, charsB) {
  return [...charsA, ...charsB].some(hasCompareOverride);
}

function computeBattle(charsA, charsB, useCompare = false) {
  const teamA = charsA.map((c) => resolveChar(c, useCompare));
  const teamB = charsB.map((c) => resolveChar(c, useCompare));

  const defenderA = teamA[0];
  const defenderB = teamB[0];

  const attackersOnA = teamB.map((attacker, i) => {
    const r = damagePerRound(attacker, defenderA);
    return { index: i, ...r };
  });

  const attackersOnB = teamA.map((attacker, i) => {
    const r = damagePerRound(attacker, defenderB);
    return { index: i, ...r };
  });

  const damageTakenA = attackersOnA.reduce((s, x) => s + x.damagePerRound, 0);
  const damageTakenB = attackersOnB.reduce((s, x) => s + x.damagePerRound, 0);

  const memberStatsA = teamA.map((attacker, i) => {
    const off = damagePerRound(attacker, defenderB);
    const isTop = i === 0;
    return {
      index: i,
      isTop,
      offense: off,
      defenseTaken: isTop ? damageTakenA : null,
      damageContribution: damageTakenB > 0 ? off.damagePerRound / damageTakenB : 0,
    };
  });

  const memberStatsB = teamB.map((attacker, i) => {
    const off = damagePerRound(attacker, defenderA);
    const isTop = i === 0;
    return {
      index: i,
      isTop,
      offense: off,
      defenseTaken: isTop ? damageTakenB : null,
      damageContribution: damageTakenA > 0 ? off.damagePerRound / damageTakenA : 0,
    };
  });

  return {
    teamA: {
      members: memberStatsA,
      totalDamageDealt: damageTakenB,
      topDamageTaken: damageTakenA,
    },
    teamB: {
      members: memberStatsB,
      totalDamageDealt: damageTakenA,
      topDamageTaken: damageTakenB,
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hitProbability,
    damagePerRound,
    computeBattle,
    pctChange,
    formatPct,
    formatDmg,
    formatPctChange,
    hasCompareOverride,
    anyCompareActive,
  };
}
