const MAX_MEMBERS = 6;

function emptyCompare() {
  return {
    thac0: '',
    apr: '',
    a: '',
    b: '',
    c: '',
    d: '',
    ac: '',
    helmet: null,
  };
}

function populateCompareFromChar(char) {
  char.compare = {
    thac0: char.thac0,
    apr: char.apr,
    a: char.a,
    b: char.b,
    c: char.c,
    d: char.d,
    ac: char.ac,
    helmet: char.helmet,
  };
}

function defaultCharacter(name, isTop = false) {
  return {
    id: crypto.randomUUID(),
    name,
    thac0: 20,
    apr: 1,
    a: 1,
    b: 6,
    c: 0,
    d: 0,
    ac: 5,
    helmet: false,
    resultsExpanded: false,
    compareActive: false,
    compareExpanded: true,
    compare: emptyCompare(),
  };
}

const state = {
  teamA: [defaultCharacter('Character 1', true)],
  teamB: [defaultCharacter('Character 1', true)],
};

function getTeam(teamKey) {
  return teamKey === 'a' ? state.teamA : state.teamB;
}

function getEnemyTeam(teamKey) {
  return teamKey === 'a' ? state.teamB : state.teamA;
}

function findCharacter(teamKey, id) {
  return getTeam(teamKey).find((c) => c.id === id);
}

function getBattleResults() {
  const base = computeBattle(state.teamA, state.teamB, false);
  const compareActive = anyCompareActive(state.teamA, state.teamB);
  const compare = compareActive
    ? computeBattle(state.teamA, state.teamB, true)
    : null;
  return { base, compare, compareActive };
}

function render() {
  renderTeam('a', state.teamA);
  renderTeam('b', state.teamB);
}

function updateResults() {
  const { base, compare, compareActive } = getBattleResults();
  ['a', 'b'].forEach((teamKey) => {
    const members = getTeam(teamKey);
    const teamBase = teamKey === 'a' ? base.teamA : base.teamB;
    const teamCmp = compare ? (teamKey === 'a' ? compare.teamA : compare.teamB) : null;

    members.forEach((char, index) => {
      const el = document.querySelector(`[data-char-id="${char.id}"] .results-body`);
      if (el) {
        el.innerHTML = buildResultsHtml(
          char,
          index === 0,
          teamBase.members[index],
          teamCmp?.members[index],
          compareActive
        );
      }
    });

    document.getElementById(`team-${teamKey}-stats`).innerHTML = renderTeamStats(
      teamKey,
      teamBase,
      teamCmp
    );
  });
}

function renderTeam(teamKey, members) {
  const container = document.getElementById(`team-${teamKey}-members`);
  const { base, compare } = getBattleResults();

  container.innerHTML = members
    .map((char, index) => renderCharacterCard(teamKey, char, index, base, compare))
    .join('');

  document.getElementById(`team-${teamKey}-stats`).innerHTML = renderTeamStats(
    teamKey,
    teamKey === 'a' ? base.teamA : base.teamB,
    compare ? (teamKey === 'a' ? compare.teamA : compare.teamB) : null
  );

  const addBtn = document.querySelector(`[data-action="add"][data-team="${teamKey}"]`);
  addBtn.disabled = members.length >= MAX_MEMBERS;
}

function compareOffenseDiffers(stats, cmpStats) {
  return (
    cmpStats.offense.hitProbability !== stats.offense.hitProbability ||
    cmpStats.offense.damagePerRound !== stats.offense.damagePerRound
  );
}

function compareDefenseDiffers(stats, cmpStats) {
  return cmpStats.defenseTaken !== stats.defenseTaken;
}

function buildResultsHtml(char, isTop, stats, cmpStats, compareActive) {
  const offenseHtml = `
    <div class="result-line">
      <span class="label">Hit chance vs. enemy lead</span>
      <span class="value">${formatPct(stats.offense.hitProbability)}</span>
    </div>
    <div class="result-line">
      <span class="label">Avg. damage / round</span>
      <span class="value">${formatDmg(stats.offense.damagePerRound)}</span>
    </div>
    <div class="result-line">
      <span class="label">Team damage share</span>
      <span class="value">${formatPct(stats.damageContribution)}</span>
    </div>
  `;

  const defenseHtml = isTop
    ? `<div class="result-line">
        <span class="label">Damage taken / round</span>
        <span class="value">${formatDmg(stats.defenseTaken)}</span>
      </div>`
    : '';

  const compareOffenseHtml =
    compareActive && cmpStats && compareOffenseDiffers(stats, cmpStats)
      ? `<div class="compare-line">
          <div class="result-line">
            <span class="label">→ Hit chance (comparison)</span>
            <span class="value">${formatPct(cmpStats.offense.hitProbability)}
              <span class="delta ${deltaClass(cmpStats.offense.hitProbability - stats.offense.hitProbability)}">(${formatPctChange(pctChange(stats.offense.hitProbability, cmpStats.offense.hitProbability))})</span>
            </span>
          </div>
          <div class="result-line">
            <span class="label">→ Damage / round (comparison)</span>
            <span class="value">${formatDmg(cmpStats.offense.damagePerRound)}
              <span class="delta ${deltaClass(cmpStats.offense.damagePerRound - stats.offense.damagePerRound)}">(${formatPctChange(pctChange(stats.offense.damagePerRound, cmpStats.offense.damagePerRound))})</span>
            </span>
          </div>
        </div>`
      : '';

  const teamShareCompareHtml =
    compareActive && cmpStats && cmpStats.damageContribution !== stats.damageContribution
      ? `<div class="compare-line">
          <div class="result-line">
            <span class="label">→ Team damage share (comparison)</span>
            <span class="value">${formatPct(cmpStats.damageContribution)}
              <span class="delta ${deltaClass(cmpStats.damageContribution - stats.damageContribution)}">(${formatPctChange(pctChange(stats.damageContribution, cmpStats.damageContribution))})</span>
            </span>
          </div>
        </div>`
      : '';

  const compareDefenseHtml =
    compareActive && isTop && cmpStats && cmpStats.defenseTaken !== null && compareDefenseDiffers(stats, cmpStats)
      ? `<div class="compare-line">
          <div class="result-line">
            <span class="label">→ Damage taken (comparison)</span>
            <span class="value">${formatDmg(cmpStats.defenseTaken)}
              <span class="delta ${deltaClass(cmpStats.defenseTaken - stats.defenseTaken, true)}">(${formatPctChange(pctChange(stats.defenseTaken, cmpStats.defenseTaken))})</span>
            </span>
          </div>
        </div>`
      : '';

  return offenseHtml + defenseHtml + compareOffenseHtml + compareDefenseHtml + teamShareCompareHtml;
}

function renderCharacterCard(teamKey, char, index, base, compare) {
  const isTop = index === 0;
  const teamBase = teamKey === 'a' ? base.teamA : base.teamB;
  const teamCmp = compare ? (teamKey === 'a' ? compare.teamA : compare.teamB) : null;
  const stats = teamBase.members[index];
  const cmpStats = teamCmp ? teamCmp.members[index] : null;
  const resultsHtml = buildResultsHtml(char, isTop, stats, cmpStats, Boolean(compare));

  const acField = isTop
    ? `<div class="field">
        <label for="${char.id}-ac">AC</label>
        <input type="number" id="${char.id}-ac" data-team="${teamKey}" data-id="${char.id}" data-field="ac" value="${char.ac}">
      </div>`
    : '';

  const helmetField = isTop
    ? `<label class="checkbox-field helmet-row">
        <input type="checkbox" data-team="${teamKey}" data-id="${char.id}" data-field="helmet" ${char.helmet ? 'checked' : ''}>
          Helmet (when defending)
        </label>`
    : '';

  const compareAcField = isTop
    ? `<div class="field">
        <label>AC</label>
        <input type="number" placeholder="${char.ac}" data-team="${teamKey}" data-id="${char.id}" data-compare="ac" value="${char.compare.ac}">
      </div>`
    : '';

  const compareHelmetField = isTop
    ? `<div class="helmet-compare helmet-row">
        <span class="helmet-label">Helmet:</span>
        <label><input type="radio" name="cmp-helmet-${char.id}" data-team="${teamKey}" data-id="${char.id}" data-compare-helmet="" ${char.compare.helmet === null ? 'checked' : ''}> Unchanged</label>
        <label><input type="radio" name="cmp-helmet-${char.id}" data-team="${teamKey}" data-id="${char.id}" data-compare-helmet="1" ${char.compare.helmet === true ? 'checked' : ''}> Yes</label>
        <label><input type="radio" name="cmp-helmet-${char.id}" data-team="${teamKey}" data-id="${char.id}" data-compare-helmet="0" ${char.compare.helmet === false ? 'checked' : ''}> No</label>
      </div>`
    : '';

  const canRemove = getTeam(teamKey).length > 1;
  const monsterOptions = Object.entries(MONSTER_PRESETS)
    .map(([key, preset]) => `<option value="${key}">${preset.label}</option>`)
    .join('');

  return `
    <article class="character-card ${isTop ? 'is-top' : ''}" data-char-id="${char.id}">
      <div class="card-header">
        <div class="card-title">
          ${isTop ? '<span class="badge-top">Lead</span>' : ''}
          <input type="text" data-team="${teamKey}" data-id="${char.id}" data-field="name" value="${escapeHtml(char.name)}" aria-label="Character name">
        </div>
        <div class="card-actions">
          <select class="monster-select" data-team="${teamKey}" data-id="${char.id}" aria-label="Load monster preset">
            <option value="" selected>Monster…</option>
            ${monsterOptions}
          </select>
          ${canRemove ? `<button type="button" class="btn btn-remove" data-action="remove" data-team="${teamKey}" data-id="${char.id}">Remove</button>` : ''}
        </div>
      </div>
      <div class="card-body">
        <div class="stats-grid ${isTop ? '' : 'cols-2'}">
          <div class="field">
            <label for="${char.id}-thac0">THAC0</label>
            <input type="number" id="${char.id}-thac0" data-team="${teamKey}" data-id="${char.id}" data-field="thac0" value="${char.thac0}">
          </div>
          <div class="field">
            <label for="${char.id}-apr">APR</label>
            <input type="number" id="${char.id}-apr" min="0" step="0.5" data-team="${teamKey}" data-id="${char.id}" data-field="apr" value="${char.apr}">
          </div>
          ${acField}
        </div>
        ${helmetField}
        <div class="damage-row">
          <div class="damage-fields">
            <div class="field">
              <label>A (dice)</label>
              <input type="number" min="0" data-team="${teamKey}" data-id="${char.id}" data-field="a" value="${char.a}">
            </div>
            <div class="field">
              <label>B (sides)</label>
              <input type="number" min="1" data-team="${teamKey}" data-id="${char.id}" data-field="b" value="${char.b}">
            </div>
            <div class="field">
              <label>+C</label>
              <input type="number" data-team="${teamKey}" data-id="${char.id}" data-field="c" value="${char.c}">
            </div>
            <div class="field">
              <label>+D (NO CRIT)</label>
              <input type="number" data-team="${teamKey}" data-id="${char.id}" data-field="d" value="${char.d}">
            </div>
          </div>
        </div>
        <div class="compare-section">
          <div class="compare-header">
            <div class="compare-toggle">
              <input type="checkbox" data-team="${teamKey}" data-id="${char.id}" data-action="toggle-compare" ${char.compareActive ? 'checked' : ''}>
              <span class="compare-toggle-label">Compare changes</span>
            </div>
            ${char.compareActive ? `
            <button type="button" class="compare-caret-btn" data-action="toggle-compare-expanded" data-team="${teamKey}" data-id="${char.id}" aria-expanded="${char.compareExpanded}" aria-label="Toggle comparison fields">
              <span class="compare-caret ${char.compareExpanded ? 'is-open' : ''}" aria-hidden="true">▸</span>
            </button>` : ''}
          </div>
          ${char.compareActive && char.compareExpanded ? `
          <div class="compare-fields">
            <p class="hint">Values match current stats. Change any field to compare.</p>
            <div class="stats-grid ${isTop ? '' : 'cols-2'}">
              <div class="field">
                <label>THAC0</label>
                <input type="number" placeholder="${char.thac0}" data-team="${teamKey}" data-id="${char.id}" data-compare="thac0" value="${char.compare.thac0}">
              </div>
              <div class="field">
                <label>APR</label>
                <input type="number" min="0" step="0.5" placeholder="${char.apr}" data-team="${teamKey}" data-id="${char.id}" data-compare="apr" value="${char.compare.apr}">
              </div>
              ${compareAcField}
            </div>
            ${compareHelmetField}
            <div class="damage-row">
              <label>Damage (comparison)</label>
              <div class="damage-fields">
                <div class="field">
                  <label>A</label>
                  <input type="number" min="0" placeholder="${char.a}" data-team="${teamKey}" data-id="${char.id}" data-compare="a" value="${char.compare.a}">
                </div>
                <div class="field">
                  <label>B</label>
                  <input type="number" min="1" placeholder="${char.b}" data-team="${teamKey}" data-id="${char.id}" data-compare="b" value="${char.compare.b}">
                </div>
                <div class="field">
                  <label>+C</label>
                  <input type="number" placeholder="${char.c}" data-team="${teamKey}" data-id="${char.id}" data-compare="c" value="${char.compare.c}">
                </div>
                <div class="field">
                  <label>+D (NO CRIT)</label>
                  <input type="number" placeholder="${char.d}" data-team="${teamKey}" data-id="${char.id}" data-compare="d" value="${char.compare.d}">
                </div>
              </div>
            </div>
          </div>` : ''}
        </div>
        <details class="results-panel" data-team="${teamKey}" data-id="${char.id}" ${char.resultsExpanded ? 'open' : ''}>
          <summary class="results-summary">Results</summary>
          <div class="results-body">${resultsHtml}</div>
        </details>
      </div>
    </article>
  `;
}

function renderTeamStats(teamKey, stats, cmpStats) {
  const compareBlock =
    cmpStats
      ? `<div class="compare-block">
          <div class="stat-line">
            <span>Total damage (comparison)</span>
            <span>${formatDmg(cmpStats.totalDamageDealt)}
              <span class="delta ${deltaClass(cmpStats.totalDamageDealt - stats.totalDamageDealt)}">(${formatPctChange(pctChange(stats.totalDamageDealt, cmpStats.totalDamageDealt))})</span>
            </span>
          </div>
          <div class="stat-line">
            <span>Lead damage taken (comparison)</span>
            <span>${formatDmg(cmpStats.topDamageTaken)}
              <span class="delta ${deltaClass(cmpStats.topDamageTaken - stats.topDamageTaken, true)}">(${formatPctChange(pctChange(stats.topDamageTaken, cmpStats.topDamageTaken))})</span>
            </span>
          </div>
        </div>`
      : '';

  return `
    <h3>Team statistics</h3>
    <div class="stat-line">
      <span>Total damage / round</span>
      <span class="value">${formatDmg(stats.totalDamageDealt)}</span>
    </div>
    <div class="stat-line">
      <span>Lead damage taken / round</span>
      <span class="value">${formatDmg(stats.topDamageTaken)}</span>
    </div>
    ${compareBlock}
  `;
}

function deltaClass(delta, invert = false) {
  const positive = invert ? delta < 0 : delta > 0;
  const negative = invert ? delta > 0 : delta < 0;
  if (positive) return '';
  if (negative) return 'negative';
  return '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addCharacter(teamKey) {
  const team = getTeam(teamKey);
  if (team.length >= MAX_MEMBERS) return;
  team.push(defaultCharacter(`Character ${team.length + 1}`, false));
  render();
}

function removeCharacter(teamKey, id) {
  const team = getTeam(teamKey);
  if (team.length <= 1) return;
  const idx = team.findIndex((c) => c.id === id);
  if (idx === -1) return;
  team.splice(idx, 1);
  render();
}

function syncCompareFieldFromBase(char, field) {
  if (!char.compareActive) return;
  if (field === 'helmet') {
    char.compare.helmet = char.helmet;
    return;
  }
  if (field in char.compare) char.compare[field] = char[field];
}

function updateField(teamKey, id, field, value) {
  const char = findCharacter(teamKey, id);
  if (!char) return;
  if (field === 'name') {
    char.name = value;
    return;
  }
  if (field === 'helmet') {
    char.helmet = value === true;
    syncCompareFieldFromBase(char, 'helmet');
    render();
    return;
  }
  const num = value === '' ? 0 : Number(value);
  char[field] = Number.isNaN(num) ? char[field] : num;
  syncCompareFieldFromBase(char, field);
  updateResults();
}

function updateCompare(teamKey, id, field, value) {
  const char = findCharacter(teamKey, id);
  if (!char) return;
  char.compare[field] = value;
  if (field === 'helmet') render();
  else updateResults();
}

function toggleCompare(teamKey, id, active) {
  const char = findCharacter(teamKey, id);
  if (!char) return;
  char.compareActive = active;
  if (active) {
    populateCompareFromChar(char);
    char.compareExpanded = true;
  } else {
    char.compare = emptyCompare();
  }
  render();
}

function toggleCompareExpanded(teamKey, id) {
  const char = findCharacter(teamKey, id);
  if (!char || !char.compareActive) return;
  char.compareExpanded = !char.compareExpanded;
  render();
}

function applyMonsterPreset(teamKey, id, presetKey) {
  const preset = MONSTER_PRESETS[presetKey];
  const char = findCharacter(teamKey, id);
  if (!preset || !char) return;

  char.name = preset.name;
  char.thac0 = preset.thac0;
  char.apr = preset.apr;
  char.a = preset.a;
  char.b = preset.b;
  char.c = preset.c;
  char.d = preset.d;
  char.ac = preset.ac;
  char.helmet = preset.helmet;
  render();
}

document.addEventListener('toggle', (e) => {
  const resultsPanel = e.target.closest('.results-panel');
  if (resultsPanel) {
    const char = findCharacter(resultsPanel.dataset.team, resultsPanel.dataset.id);
    if (char) char.resultsExpanded = resultsPanel.open;
    return;
  }

});

document.addEventListener('click', (e) => {
  const addBtn = e.target.closest('[data-action="add"]');
  if (addBtn) {
    addCharacter(addBtn.dataset.team);
    return;
  }

  const removeBtn = e.target.closest('[data-action="remove"]');
  if (removeBtn) {
    removeCharacter(removeBtn.dataset.team, removeBtn.dataset.id);
    return;
  }

  const compareCaretBtn = e.target.closest('[data-action="toggle-compare-expanded"]');
  if (compareCaretBtn) {
    toggleCompareExpanded(compareCaretBtn.dataset.team, compareCaretBtn.dataset.id);
  }
});

document.addEventListener('change', (e) => {
  const target = e.target;

  if (target.matches('[data-action="toggle-compare"]')) {
    toggleCompare(target.dataset.team, target.dataset.id, target.checked);
    return;
  }

  if (target.matches('.monster-select')) {
    if (target.value) {
      applyMonsterPreset(target.dataset.team, target.dataset.id, target.value);
    }
    return;
  }

  if (target.matches('[data-compare-helmet]')) {
    const val = target.getAttribute('data-compare-helmet');
    const helmet = val === '' ? null : val === '1';
    updateCompare(target.dataset.team, target.dataset.id, 'helmet', helmet);
    return;
  }

  if (target.matches('[data-field="helmet"]')) {
    updateField(target.dataset.team, target.dataset.id, 'helmet', target.checked);
    return;
  }

  if (target.matches('[data-field]')) {
    updateField(target.dataset.team, target.dataset.id, target.dataset.field, target.value);
    return;
  }

  if (target.matches('[data-compare]')) {
    updateCompare(target.dataset.team, target.dataset.id, target.dataset.compare, target.value);
  }
});

document.addEventListener('input', (e) => {
  const target = e.target;

  if (target.matches('[data-field="name"]')) {
    updateField(target.dataset.team, target.dataset.id, 'name', target.value);
    return;
  }

  if (target.matches('[data-field]:not([data-field="name"]):not([type="checkbox"])')) {
    updateField(target.dataset.team, target.dataset.id, target.dataset.field, target.value);
    return;
  }

  if (target.matches('[data-compare]')) {
    updateCompare(target.dataset.team, target.dataset.id, target.dataset.compare, target.value);
  }
});

render();
