const STORAGE_KEY = 'shinyhunt.baseline.hunts';
const FALLBACK_IMAGE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/0.png';
const POKEDEX_INDEX_URL = 'https://pokeapi.co/api/v2/pokemon?limit=1025';

const ODDS_DATA = {
  'Gold / Silver / Crystal': {
    'Random Encounter': { base: 8192, charmRolls: 0 },
    'Soft Reset': { base: 8192, charmRolls: 0 },
    'Gen II Shiny Breeding': { base: 64, charmRolls: 0 },
  },
  'Ruby / Sapphire / Emerald': {
    'Random Encounter': { base: 8192, charmRolls: 0 },
    'Soft Reset': { base: 8192, charmRolls: 0 },
  },
  'Diamond / Pearl / Platinum': {
    'Random Encounter': { base: 8192, charmRolls: 0 },
    'Masuda Method': { base: 1639, charmRolls: 0 },
    'Pokeradar Chain': { base: 8192, charmRolls: 0, chainBonusRolls: 0.25, chainCap: 40 },
    'Soft Reset': { base: 8192, charmRolls: 0 },
    'Cute Charm Glitch': { base: 5, charmRolls: 0 },
  },
  'HeartGold / SoulSilver': {
    'Random Encounter': { base: 8192, charmRolls: 0 },
    'Masuda Method': { base: 1639, charmRolls: 0 },
    'Soft Reset': { base: 8192, charmRolls: 0 },
    'Cute Charm Glitch': { base: 5, charmRolls: 0 },
  },
  'Scarlet / Violet': {
    'Random Encounter': { base: 4096, charmRolls: 2 },
    'Masuda Method': { base: 683, charmRolls: 2 },
    'Soft Reset': { base: 4096, charmRolls: 2 },
  },
  'Sword / Shield': {
    'Random Encounter': { base: 4096, charmRolls: 2 },
    'Masuda Method': { base: 683, charmRolls: 2 },
    'Soft Reset': { base: 4096, charmRolls: 2 },
    'Dynamax Adventures': { base: 300, charmRolls: 0 },
  },
  'Brilliant Diamond / Shining Pearl': {
    'Random Encounter': { base: 4096, charmRolls: 0 },
    'Masuda Method': { base: 683, charmRolls: 2 },
    'Radar Chain': { base: 4096, charmRolls: 2, chainBonusRolls: 0.4, chainCap: 40 },
  },
  'Legends: Arceus': {
    'Random Encounter': { base: 4096, charmRolls: 2 },
    'Mass Outbreak': { base: 158, charmRolls: 0 },
    'Soft Reset': { base: 4096, charmRolls: 2 },
  },
};

const GAME_GROUP_TO_VERSIONS = {
  'Gold / Silver / Crystal': ['gold', 'silver', 'crystal'],
  'Ruby / Sapphire / Emerald': ['ruby', 'sapphire', 'emerald'],
  'Diamond / Pearl / Platinum': ['diamond', 'pearl', 'platinum'],
  'HeartGold / SoulSilver': ['heartgold', 'soulsilver'],
  'Scarlet / Violet': ['scarlet', 'violet'],
  'Sword / Shield': ['sword', 'shield'],
  'Brilliant Diamond / Shining Pearl': ['brilliant-diamond', 'shining-pearl'],
  'Legends: Arceus': ['legends-arceus'],
};

const GLITCH_METHODS = [
  {
    name: 'Gen II shiny breeding',
    games: ['Gold', 'Silver', 'Crystal'],
    note: 'High DV inheritance line breeding trick (Gen II mechanic).',
    isPotentiallyApplicable: (generation) => generation <= 2,
  },
  {
    name: 'Cute Charm glitch',
    games: ['Diamond', 'Pearl', 'Platinum', 'HeartGold', 'SoulSilver'],
    note: 'RNG manipulation can force high shiny rates for matching gender ratios.',
    isPotentiallyApplicable: (generation) => generation <= 4,
  },
];

const form = document.querySelector('#hunt-form');
const huntsList = document.querySelector('#hunts-list');
const huntTemplate = document.querySelector('#hunt-template');
const clearDataButton = document.querySelector('#clear-data');
const statusFilter = document.querySelector('#filter-status');
const sortBy = document.querySelector('#sort-by');
const searchInput = document.querySelector('#search');
const summary = document.querySelector('#summary');
const gameSelect = document.querySelector('#game');
const methodSelect = document.querySelector('#method');
const chainGroup = document.querySelector('#chain-group');
const chainCountInput = document.querySelector('#chain-count');
const shinyCharmInput = document.querySelector('#shiny-charm');
const oddsPreview = document.querySelector('#odds-preview');
const pokemonInput = document.querySelector('#pokemon');
const pokemonPicker = document.querySelector('#pokemon-picker');
const pokemonPickerGrid = document.querySelector('#pokemon-picker-grid');
const dexSearch = document.querySelector('#dex-search');
const dexGrid = document.querySelector('#dex-grid');
const dexDetails = document.querySelector('#dex-details');
const menuItems = document.querySelectorAll('.menu-item');
const pages = document.querySelectorAll('.page');

let allPokemon = [];
let allPokemonByName = new Map();
let encounterCache = new Map();
let speciesVersionsCache = new Map();
let hunts = loadHunts();

populateGames();
updateMethods();
updateOddsPreview();
render();
loadPokemonIndex();
setInterval(updateStopwatchDisplays, 1000);

menuItems.forEach((button) => button.addEventListener('click', () => setActivePage(button.dataset.page)));

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const pokemon = pokemonInput.value.trim();
  const game = String(gameSelect.value);
  const method = String(methodSelect.value);
  const nowIso = new Date().toISOString();

  if (!pokemon || !game || !method) return;

  const newHunt = {
    id: crypto.randomUUID(),
    pokemon,
    method,
    game,
    encounters: 0,
    phase: 1,
    complete: false,
    createdAt: nowIso,
    imageUrl: await fetchPokemonImage(pokemon),
    shinyCharm: shinyCharmInput.checked,
    chainCount: Number(chainCountInput.value) || 0,
    totalResetSeconds: 0,
    lastResetAt: nowIso,
  };

  hunts.unshift(newHunt);
  saveHunts();
  render();
  form.reset();
  gameSelect.selectedIndex = 0;
  updateMethods();
  updateOddsPreview();
  hidePokemonPicker();
});

clearDataButton.addEventListener('click', () => {
  if (!window.confirm('Delete all hunts and history?')) return;
  hunts = [];
  saveHunts();
  render();
});

gameSelect.addEventListener('change', () => {
  updateMethods();
  updateOddsPreview();
});
methodSelect.addEventListener('change', updateOddsPreview);
chainCountInput.addEventListener('input', updateOddsPreview);
shinyCharmInput.addEventListener('change', updateOddsPreview);
statusFilter.addEventListener('change', render);
sortBy.addEventListener('change', render);
searchInput.addEventListener('input', render);
pokemonInput.addEventListener('input', () => renderPokemonPicker(pokemonInput.value));
pokemonInput.addEventListener('focus', () => renderPokemonPicker(pokemonInput.value));
dexSearch.addEventListener('input', () => renderDexGrid(dexSearch.value));
window.addEventListener('click', (event) => {
  if (!event.target.closest('.pokemon-field')) hidePokemonPicker();
});

function setActivePage(pageName) {
  menuItems.forEach((item) => item.classList.toggle('active', item.dataset.page === pageName));
  pages.forEach((page) => page.classList.toggle('active', page.dataset.page === pageName));
}

function render() {
  huntsList.innerHTML = '';
  const visibleHunts = getVisibleHunts();
  renderSummary(visibleHunts);

  if (visibleHunts.length === 0) {
    huntsList.innerHTML = '<p class="muted">No hunts match your current filters.</p>';
    return;
  }

  for (const hunt of visibleHunts) {
    const fragment = huntTemplate.content.cloneNode(true);
    const article = fragment.querySelector('.hunt-item');
    const odds = calculateHuntOdds(hunt);

    article.dataset.huntId = hunt.id;
    article.querySelector('.hunt-sprite').src = hunt.imageUrl || FALLBACK_IMAGE;
    article.querySelector('.hunt-sprite').alt = `${hunt.pokemon} artwork`;
    article.querySelector('.hunt-name').textContent = hunt.pokemon;
    article.querySelector('.hunt-status').textContent = hunt.complete ? 'Complete' : 'Active';
    article.querySelector('.hunt-status').classList.toggle('complete', hunt.complete);
    article.querySelector('.hunt-meta').textContent = `${hunt.game} • ${hunt.method} • ${hunt.shinyCharm ? 'Charm' : 'No charm'} • Chain ${hunt.chainCount}`;
    article.querySelector('.encounters').textContent = hunt.encounters.toLocaleString();
    article.querySelector('.phase').textContent = hunt.phase.toLocaleString();
    article.querySelector('.stopwatch').textContent = getStopwatchText(hunt);
    article.querySelector('.odds').textContent = formatOdds(odds.denominator);
    article.querySelector('.chance').textContent = formatChanceByNow(hunt.encounters, odds.probability);

    article.querySelector('.add-reset').addEventListener('click', () => mutateHunt(hunt.id, addReset));
    article.querySelector('.add-encounter').addEventListener('click', () => mutateHunt(hunt.id, (item) => addEncounters(item, 1)));
    article.querySelector('.add-encounter-10').addEventListener('click', () => mutateHunt(hunt.id, (item) => addEncounters(item, 10)));
    article.querySelector('.remove-encounter').addEventListener('click', () => mutateHunt(hunt.id, (item) => addEncounters(item, -1)));
    article.querySelector('.remove-encounter-10').addEventListener('click', () => mutateHunt(hunt.id, (item) => addEncounters(item, -10)));

    article.querySelector('.add-phase').addEventListener('click', () => mutateHunt(hunt.id, (item) => {
      item.phase += 1;
      item.encounters = 0;
      item.chainCount = 0;
      item.lastResetAt = new Date().toISOString();
    }));

    const chainReset = article.querySelector('.chain-reset');
    chainReset.disabled = !isChainMethod(hunt.game, hunt.method);
    chainReset.addEventListener('click', () => mutateHunt(hunt.id, (item) => { item.chainCount = 0; }));

    article.querySelector('.toggle-complete').textContent = hunt.complete ? 'Mark Active' : 'Mark Complete';
    article.querySelector('.toggle-complete').addEventListener('click', () => mutateHunt(hunt.id, (item) => {
      item.complete = !item.complete;
      item.lastResetAt = new Date().toISOString();
    }));

    article.querySelector('.delete').addEventListener('click', () => {
      hunts = hunts.filter((item) => item.id !== hunt.id);
      saveHunts();
      render();
    });

    huntsList.append(article);
  }
}

function updateStopwatchDisplays() {
  document.querySelectorAll('.hunt-item').forEach((card) => {
    const hunt = hunts.find((item) => item.id === card.dataset.huntId);
    if (!hunt) return;
    card.querySelector('.stopwatch').textContent = getStopwatchText(hunt);
  });
}

function getVisibleHunts() {
  const status = statusFilter.value;
  const sort = sortBy.value;
  const query = searchInput.value.trim().toLowerCase();

  const filtered = hunts.filter((hunt) => {
    if (status === 'active' && hunt.complete) return false;
    if (status === 'complete' && !hunt.complete) return false;
    if (!query) return true;
    return `${hunt.pokemon} ${hunt.game}`.toLowerCase().includes(query);
  });

  filtered.sort((a, b) => {
    if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sort === 'encounters') return b.encounters - a.encounters;
    if (sort === 'chance') {
      const aOdds = calculateHuntOdds(a);
      const bOdds = calculateHuntOdds(b);
      return chanceByNow(b.encounters, bOdds.probability) - chanceByNow(a.encounters, aOdds.probability);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return filtered;
}

function renderSummary(visibleHunts) {
  const activeCount = hunts.filter((hunt) => !hunt.complete).length;
  const totalEncounters = hunts.reduce((sum, hunt) => sum + hunt.encounters, 0);

  summary.innerHTML = [
    `All: ${hunts.length}`,
    `Active: ${activeCount}`,
    `Visible: ${visibleHunts.length}`,
    `Encounters: ${totalEncounters.toLocaleString()}`,
  ].map((item) => `<span class="pill">${item}</span>`).join('');
}

function mutateHunt(id, updater) {
  hunts = hunts.map((hunt) => {
    if (hunt.id !== id) return hunt;
    const copy = { ...hunt };
    updater(copy);
    return copy;
  });
  saveHunts();
  render();
}

function addReset(hunt) {
  const now = Date.now();
  const last = new Date(hunt.lastResetAt || hunt.createdAt).getTime();
  hunt.totalResetSeconds += Math.max(0, Math.round((now - last) / 1000));
  hunt.lastResetAt = new Date(now).toISOString();
  addEncounters(hunt, 1);
}

function addEncounters(hunt, amount) {
  const currentEncounters = Number(hunt.encounters) || 0;
  const delta = Math.max(-currentEncounters, amount);
  hunt.encounters = currentEncounters + delta;

  if (!isChainMethod(hunt.game, hunt.method)) return;

  const rules = getMethodRules(hunt.game, hunt.method);
  const currentChain = Number(hunt.chainCount) || 0;
  hunt.chainCount = Math.max(0, Math.min(rules.chainCap || Infinity, currentChain + delta));
}

function populateGames() {
  gameSelect.innerHTML = '';
  Object.keys(ODDS_DATA).forEach((game) => {
    const option = document.createElement('option');
    option.value = game;
    option.textContent = game;
    gameSelect.append(option);
  });
}

function updateMethods() {
  const methods = Object.keys(ODDS_DATA[gameSelect.value] || {});
  const existing = methodSelect.value;
  methodSelect.innerHTML = '';

  methods.forEach((method) => {
    const option = document.createElement('option');
    option.value = method;
    option.textContent = method;
    methodSelect.append(option);
  });

  if (methods.includes(existing)) methodSelect.value = existing;

  const chainEnabled = isChainMethod(gameSelect.value, methodSelect.value);
  chainGroup.style.display = chainEnabled ? 'grid' : 'none';
  if (!chainEnabled) chainCountInput.value = '0';
}

function updateOddsPreview() {
  const chainCount = Number(chainCountInput.value) || 0;
  const odds = calculateEncounterOdds(gameSelect.value, methodSelect.value, shinyCharmInput.checked, chainCount);
  oddsPreview.textContent = `Per-encounter odds: ${formatOdds(odds.denominator)}`;
}

function getMethodRules(game, method) {
  return ODDS_DATA[game]?.[method] || { base: 4096, charmRolls: 0 };
}

function isChainMethod(game, method) {
  const rules = getMethodRules(game, method);
  return Number.isFinite(rules.chainBonusRolls);
}

function calculateEncounterOdds(game, method, shinyCharm, chainCount) {
  const rules = getMethodRules(game, method);
  const baseProbability = 1 / rules.base;
  let totalRolls = 1 + (shinyCharm ? (rules.charmRolls || 0) : 0);

  if (isChainMethod(game, method)) {
    const appliedChain = Math.min(Math.max(0, chainCount), rules.chainCap);
    totalRolls += appliedChain * (rules.chainBonusRolls || 0);
  }

  const probability = 1 - (1 - baseProbability) ** totalRolls;
  return { probability, denominator: Math.max(1, Math.round(1 / probability)) };
}

function calculateHuntOdds(hunt) {
  return calculateEncounterOdds(hunt.game, hunt.method, Boolean(hunt.shinyCharm), Number(hunt.chainCount) || 0);
}

function chanceByNow(encounters, encounterProbability) {
  if (encounters < 1) return 0;
  return 1 - (1 - encounterProbability) ** encounters;
}

function formatChanceByNow(encounters, encounterProbability) {
  return `${(chanceByNow(encounters, encounterProbability) * 100).toFixed(2)}%`;
}

function formatOdds(denominator) {
  return `1/${denominator.toLocaleString()}`;
}

function getStopwatchText(hunt) {
  const base = Number(hunt.totalResetSeconds) || 0;
  const running = hunt.complete
    ? 0
    : Math.max(0, Math.floor((Date.now() - new Date(hunt.lastResetAt || hunt.createdAt).getTime()) / 1000));
  return formatDuration(base + running);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':');
}

async function loadPokemonIndex() {
  try {
    const response = await fetch(POKEDEX_INDEX_URL);
    if (!response.ok) return;
    const data = await response.json();

    allPokemon = (data.results || []).map((entry, index) => ({
      name: entry.name,
      id: index + 1,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${index + 1}.png`,
    }));

    allPokemonByName = new Map(allPokemon.map((item) => [item.name, item]));
    renderPokemonPicker('');
    renderDexGrid('');
  } catch {
    allPokemon = [];
  }
}

function renderPokemonPicker(query) {
  if (allPokemon.length === 0) return;
  const normalized = query.trim().toLowerCase();
  const visible = allPokemon.filter((item) => item.name.includes(normalized)).slice(0, 80);

  pokemonPickerGrid.innerHTML = '';
  visible.forEach((pokemon) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'picker-card';
    button.innerHTML = `<img src="${pokemon.image}" alt="${pokemon.name}" /><span>${toTitleCase(pokemon.name.replace(/-/g, ' '))}</span>`;
    button.addEventListener('click', () => {
      pokemonInput.value = toTitleCase(pokemon.name.replace(/-/g, ' '));
      hidePokemonPicker();
    });
    pokemonPickerGrid.append(button);
  });

  pokemonPicker.hidden = false;
}

function hidePokemonPicker() {
  pokemonPicker.hidden = true;
}

function renderDexGrid(query) {
  const normalized = query.trim().toLowerCase();
  const visible = allPokemon.filter((item) => item.name.includes(normalized));
  dexGrid.innerHTML = '';

  visible.forEach((pokemon) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'picker-card';
    button.innerHTML = `<img src="${pokemon.image}" alt="${pokemon.name}" /><span>${toTitleCase(pokemon.name.replace(/-/g, ' '))}</span>`;
    button.addEventListener('click', () => {
      renderDexDetails(pokemon);
    });
    dexGrid.append(button);
  });
}

async function renderDexDetails(pokemon) {
  const generation = getGenerationForPokemonId(pokemon.id);
  dexDetails.innerHTML = '<p class="muted">Loading Pokémon availability data…</p>';

  const encounteredVersions = await getEncounterVersions(pokemon.name);
  const speciesVersions = await getSpeciesVersions(pokemon.name);
  const availableGames = getAvailableGamesByGroup(encounteredVersions, speciesVersions);

  const methodsByGame = Object.entries(availableGames).map(([groupName, details]) => {
    const methods = Object.keys(ODDS_DATA[groupName] || {});
    return `<li><strong>${groupName}</strong> (${details.versions.join(', ')}): ${methods.join(', ')} <span class="muted">[${details.source}]</span></li>`;
  }).join('');

  const glitchMethods = GLITCH_METHODS
    .filter((method) => method.isPotentiallyApplicable(generation))
    .map((method) => `<li><strong>${method.name}</strong> (${method.games.join(', ')}): ${method.note}</li>`)
    .join('');

  const noVerifiedMessage = methodsByGame || '<li>No supported game-group availability found from species/encounter data.</li>';
  const glitchMessage = glitchMethods || '<li>No common generation-matched glitch method listed for this Pokémon.</li>';

  dexDetails.innerHTML = `
    <div class="dex-head">
      <img src="${pokemon.image}" alt="${pokemon.name}" />
      <div>
        <h3>${toTitleCase(pokemon.name.replace(/-/g, ' '))}</h3>
        <p class="muted">Debut generation: Gen ${generation}</p>
        <p class="muted">Methods are shown for game groups where this species appears in PokéAPI encounter or species-game data.</p>
      </div>
    </div>
    <h4>Standard shiny methods by available game group</h4>
    <ul>${noVerifiedMessage}</ul>
    <h4>Potential glitch methods (generation-dependent)</h4>
    <ul>${glitchMessage}</ul>
  `;
}

function getAvailableGamesByGroup(encounteredVersions, speciesVersions) {
  const out = {};
  Object.entries(GAME_GROUP_TO_VERSIONS).forEach(([groupName, versions]) => {
    const matched = versions.filter((version) => encounteredVersions.has(version) || speciesVersions.has(version));
    if (matched.length > 0) {
      const hasEncounter = matched.some((version) => encounteredVersions.has(version));
      const hasSpecies = matched.some((version) => speciesVersions.has(version));
      out[groupName] = {
        versions: matched.map((version) => toTitleCase(version.replace(/-/g, ' '))),
        source: hasEncounter && hasSpecies ? 'encounter + species' : hasEncounter ? 'encounter' : 'species',
      };
    }
  });
  return out;
}

async function getSpeciesVersions(pokemonName) {
  const normalized = normalizePokemonName(pokemonName);
  if (speciesVersionsCache.has(normalized)) return speciesVersionsCache.get(normalized);

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${normalized}`);
    if (!response.ok) {
      const empty = new Set();
      speciesVersionsCache.set(normalized, empty);
      return empty;
    }

    const data = await response.json();
    const versions = new Set((data.game_indices || []).map((entry) => entry.version.name));
    speciesVersionsCache.set(normalized, versions);
    return versions;
  } catch {
    const empty = new Set();
    speciesVersionsCache.set(normalized, empty);
    return empty;
  }
}

async function getEncounterVersions(pokemonName) {
  const normalized = normalizePokemonName(pokemonName);
  if (encounterCache.has(normalized)) return encounterCache.get(normalized);

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${normalized}/encounters`);
    if (!response.ok) {
      const empty = new Set();
      encounterCache.set(normalized, empty);
      return empty;
    }

    const data = await response.json();
    const versions = new Set();

    data.forEach((location) => {
      (location.version_details || []).forEach((detail) => {
        if (detail.version && detail.version.name) versions.add(detail.version.name);
      });
    });

    encounterCache.set(normalized, versions);
    return versions;
  } catch {
    const empty = new Set();
    encounterCache.set(normalized, empty);
    return empty;
  }
}

function getGenerationForPokemonId(id) {
  if (id <= 151) return 1;
  if (id <= 251) return 2;
  if (id <= 386) return 3;
  if (id <= 493) return 4;
  if (id <= 649) return 5;
  if (id <= 721) return 6;
  if (id <= 809) return 7;
  if (id <= 905) return 8;
  return 9;
}

async function fetchPokemonImage(name) {
  const normalized = normalizePokemonName(name);
  const indexed = allPokemonByName.get(normalized);
  if (indexed) return indexed.image;

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${normalized}`);
    if (!response.ok) return FALLBACK_IMAGE;
    const data = await response.json();
    return data.sprites?.other?.['official-artwork']?.front_shiny
      || data.sprites?.front_shiny
      || data.sprites?.other?.['official-artwork']?.front_default
      || data.sprites?.front_default
      || FALLBACK_IMAGE;
  } catch {
    return FALLBACK_IMAGE;
  }
}

function toTitleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizePokemonName(name) {
  return name.trim().toLowerCase().replace(/[.']/g, '').replace(/♀/g, '-f').replace(/♂/g, '-m').replace(/\s+/g, '-');
}

function loadHunts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((hunt) => ({
      ...hunt,
      imageUrl: hunt.imageUrl || FALLBACK_IMAGE,
      shinyCharm: Boolean(hunt.shinyCharm),
      chainCount: Number(hunt.chainCount) || 0,
      totalResetSeconds: Number(hunt.totalResetSeconds) || 0,
      lastResetAt: hunt.lastResetAt || hunt.createdAt || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function saveHunts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hunts));
}
