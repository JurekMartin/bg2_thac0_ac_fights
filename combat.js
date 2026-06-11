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

function attackRollHits(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 20) return true;
  return roll >= threshold;
}

/**
 * Expected damage per attack roll (d20), accounting for which rolls hit
 * and that only a natural 20 is a critical hit.
 * D is not doubled on critical; helmet negates crit bonus damage.
 */
function expectedDamagePerAttack(thac0, ac, a, b, c, d, defenderHasHelmet) {
  const weapon = expectedWeaponDamage(a, b, c);
  const flat = Number(d) || 0;
  const normalDamage = weapon + flat;
  const critDamage = defenderHasHelmet ? normalDamage : 2 * weapon + flat;
  const threshold = thac0 - ac;
  let total = 0;
  for (let roll = 1; roll <= 20; roll++) {
    if (!attackRollHits(roll, threshold)) continue;
    const damage = roll === 20 ? critDamage : normalDamage;
    total += damage / 20;
  }
  return total;
}

/**
 * Average damage per round for one attacker vs one defender.
 */
function damagePerRound(attacker, defender) {
  const hitPct = hitProbability(attacker.thac0, defender.ac);
  const expectedPerAttack = expectedDamagePerAttack(
    attacker.thac0,
    defender.ac,
    attacker.a,
    attacker.b,
    attacker.c,
    attacker.d,
    defender.helmet
  );
  const apr = Math.max(0, Number(attacker.apr) || 0);
  return {
    hitProbability: hitPct,
    damagePerHit: hitPct > 0 ? expectedPerAttack / hitPct : 0,
    damagePerRound: apr * expectedPerAttack,
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
  const base = {
    thac0: Number(char.thac0) || 0,
    apr: Number(char.apr) || 0,
    a: Number(char.a) || 0,
    b: Number(char.b) || 1,
    c: Number(char.c) || 0,
    d: Number(char.d) || 0,
    ac: Number(char.ac) || 0,
    helmet: Boolean(char.helmet),
  };
  if (!useCompare || !char.compareActive) return base;

  const cmp = char.compare;
  return {
    thac0: compareFieldDiffers(base.thac0, cmp.thac0) ? Number(cmp.thac0) : base.thac0,
    apr: compareFieldDiffers(base.apr, cmp.apr) ? Number(cmp.apr) : base.apr,
    a: compareFieldDiffers(base.a, cmp.a) ? Number(cmp.a) : base.a,
    b: compareFieldDiffers(base.b, cmp.b) ? Number(cmp.b) : base.b,
    c: compareFieldDiffers(base.c, cmp.c) ? Number(cmp.c) : base.c,
    d: compareFieldDiffers(base.d, cmp.d) ? Number(cmp.d) : base.d,
    ac: compareFieldDiffers(base.ac, cmp.ac) ? Number(cmp.ac) : base.ac,
    helmet: (cmp.helmet !== null && cmp.helmet !== base.helmet) ? cmp.helmet : base.helmet,
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
    expectedDamagePerAttack,
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
