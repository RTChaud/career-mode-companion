/**
 * app.js
 * Entry point. Owns UI state (search/filter/sort) and wires up
 * every event listener, delegating data work to Players and
 * rendering to UI.
 */

(function App() {

  // Search/filters/sort are shared across every squad section (First
  // Team, Academy, Shortlist) rather than kept separately per section —
  // applying a filter or sort while viewing one carries over to the
  // others. gs() is a shorthand for this single shared object.
  const state = {
    activeGroup: Players.DEFAULT_GROUP,
    filters: { search: '', positions: [], roles: [], roleFitRatings: [], priorityOnly: false, categories: [], youthAcademyOnly: false, sortKey: 'position', sortDir: 'asc' },
    editingId: null, // player currently open in form (null = adding new)
    activeId: null,  // player currently open in detail view
    activeWidget: 'squad', // 'squad' | 'tactics' | 'players'
    activeTacticsSubview: 'roles', // 'roles' | 'lineups'
    pitchDisplayMode: 'overall', // what the pitch badges show; restored from settings in init()
    squadDepthDisplayMode: 'overall', // separate from pitchDisplayMode — its own independent toggle
  };

  const WIDGETS = [
    { id: 'squad', label: 'Squad' },
    { id: 'tactics', label: 'Tactics' },
    { id: 'players', label: 'Players' },
  ];

  // The Squad section tabs shown to the user: every real group
  // (Players.GROUPS — First Team/On Loan/Academy/Shortlist) plus a
  // synthetic "All" tab at the end. "All" isn't a real playerGroup a
  // player can belong to — it's just a combined view — so it's kept
  // separate from Players.GROUPS, which stays the authoritative list
  // for anything that assigns/validates a player's actual group (the
  // Add/Edit form, Move button, migrations, etc.).
  const SQUAD_TABS = [...Players.GROUPS, { id: 'all', label: 'All' }];

  const TACTICS_SUBVIEWS = [
    { id: 'roles', label: 'Roles' },
    { id: 'squadDepth', label: 'Squad Depth' },
    { id: 'lineups', label: 'Lineups' },
  ];

  // What the pitch's circular badges show. Generic by design — adding a
  // future mode (Value, Wage, Role, Form, ...) is just adding an entry
  // here; nothing else about the pitch needs to change.
  const DISPLAY_MODES = [
    { id: 'overall', icon: '⚽', label: 'Overall', getValue: (p) => p.overall },
    { id: 'age', icon: '🎂', label: 'Age', getValue: (p) => p.age },
    { id: 'potential', icon: '📈', label: 'Potential', getValue: (p) => p.potential },
    // Role Fit compares the player against the SLOT they're placed in
    // (not their own stored tactical role) — on the pitch, what matters
    // is how well they suit the position they've actually been given.
    { id: 'roleFit', icon: '⭐', label: 'Role Fit', getValue: (p, slot) => Lineups.calculateRoleFitStars(p, Lineups.getRoleData(slot.role)) },
  ];
  const DEFAULT_DISPLAY_MODE = DISPLAY_MODES[0].id;

  function activeDisplayMode() {
    return DISPLAY_MODES.find(m => m.id === state.pitchDisplayMode) || DISPLAY_MODES[0];
  }

  // The lineup currently being built/viewed on the pitch. id is null
  // until it's been saved for the first time.
  let lineupState = Lineups.createBlank(Lineups.DEFAULT_FORMATION_ID);
  let activeSlotKey = null; // which pitch slot the player selector is currently assigning

  /** Shorthand for the shared search/filter/sort state. */
  function gs() {
    return state.filters;
  }

  // Multi-select state for the fields inside the open Add/Edit form.
  // Kept separate from `state` because it only exists while the form is open.
  const formSelections = {
    playstyles: [],
    playstylesPlus: [],
  };

  let formInitialSnapshot = null; // JSON snapshot taken when the form opens, used to detect unsaved changes
  let confirmAction = null;       // function invoked when the shared confirm dialog's primary button is pressed
  let importState = null;         // { backup, mode, duplicateStrategy, duplicateCount } while the import modal is open

  function init() {
    Players.init();
    Lineups.init();
    const savedMode = Storage.loadSettings().pitchDisplayMode;
    state.pitchDisplayMode = DISPLAY_MODES.some(m => m.id === savedMode) ? savedMode : DEFAULT_DISPLAY_MODE;
    UI.populateSelect(UI.el.fieldPosition, Players.POSITIONS, false);
    UI.populateSelectWithLabels(UI.el.fieldSquadSection, Players.GROUPS.map(g => ({ value: g.id, label: g.label })));
    UI.populateSelect(UI.el.fieldRole, Players.TACTICAL_ROLES, true);
    UI.renderGroupSegmentedControl(SQUAD_TABS, state.activeGroup, onGroupSelect);
    UI.renderWidgetSegmentedControl(WIDGETS, state.activeWidget, onWidgetSelect);
    UI.renderWidgetSegmentedControl(TACTICS_SUBVIEWS, state.activeTacticsSubview, onTacticsSubviewSelect, UI.el.tacticsSubSegmentedControl);
    renderDisplayModeControl();
    renderSquadDepthDisplayModeControl();
    renderRoleFinderChips();
    UI.renderSortChips(UI.el.sortChips, Players.SORT_FIELDS, gs().sortKey, onSortSelect);
    UI.renderChipGroup(UI.el.positionChips, Players.POSITIONS, gs().positions, (v) => toggleFilter('positions', v));
    UI.renderChipGroup(UI.el.roleChips, Players.TACTICAL_ROLES, gs().roles, (v) => toggleFilter('roles', v));
    UI.renderRoleFitChips(UI.el.roleFitChips, Players.ROLE_FIT_VALUES, gs().roleFitRatings, (v) => toggleFilter('roleFitRatings', v));
    UI.el.priorityFilterSection.hidden = state.activeGroup !== 'shortlist';
    renderPriorityFilterChips();
    UI.el.categoryFilterSection.hidden = state.activeGroup !== 'all';
    renderCategoryFilterChips();
    renderYouthAcademyFilterChips();
    UI.setSortDirectionUI(gs().sortDir);
    UI.renderLastBackupText(Storage.loadSettings().lastBackupExportedAt);

    bindEvents();
    ScreenshotImport.init(applyScreenshotExtraction);
    render();
    renderRolesPitch();
    renderPitch();
    renderSavedLineupsList();

    if (!Storage.available) {
      UI.showToast('Local storage is unavailable — changes won\u2019t be saved');
    }
  }

  // ---------- Widget switch (Players / Tactics) ----------

  function onWidgetSelect(widgetId) {
    if (widgetId === state.activeWidget || !WIDGETS.some(w => w.id === widgetId)) return;
    state.activeWidget = widgetId;
    UI.renderWidgetSegmentedControl(WIDGETS, state.activeWidget, onWidgetSelect);
    UI.el.squadView.hidden = widgetId !== 'squad';
    UI.el.tacticsView.hidden = widgetId !== 'tactics';
    UI.el.playersView.hidden = widgetId !== 'players';
    UI.el.addPlayerBtn.hidden = widgetId !== 'squad';
    UI.el.squadCount.hidden = widgetId !== 'squad';
    if (widgetId === 'tactics') {
      renderRolesPitch();
      renderPitch();
      renderSavedLineupsList();
    } else if (widgetId === 'players') {
      renderRoleFinder();
    }
  }

  // ---------- Tactics sub-widget switch (Roles / Lineups) ----------

  function onTacticsSubviewSelect(subviewId) {
    if (subviewId === state.activeTacticsSubview || !TACTICS_SUBVIEWS.some(s => s.id === subviewId)) return;
    state.activeTacticsSubview = subviewId;
    UI.renderWidgetSegmentedControl(TACTICS_SUBVIEWS, state.activeTacticsSubview, onTacticsSubviewSelect, UI.el.tacticsSubSegmentedControl);
    UI.el.rolesSubview.hidden = subviewId !== 'roles';
    UI.el.squadDepthSubview.hidden = subviewId !== 'squadDepth';
    UI.el.lineupsSubview.hidden = subviewId !== 'lineups';
    if (subviewId === 'roles') {
      renderRolesPitch();
    } else if (subviewId === 'squadDepth') {
      renderSquadDepthPitch();
    } else {
      renderPitch();
      renderSavedLineupsList();
    }
  }

  // ---------- Central render ----------

  function render() {
    const all = Players.getAll();
    const isAll = state.activeGroup === 'all';
    const groupAll = isAll ? all : all.filter(p => p.playerGroup === state.activeGroup);
    // The Category filter only applies (and is only reachable) on All —
    // ignoring its stored value elsewhere prevents it silently combining
    // with the section's own implicit group filter and hiding everyone.
    const filtered = Players.query(all, { ...gs(), categories: isAll ? gs().categories : [], group: isAll ? null : state.activeGroup });
    const groupLabel = (SQUAD_TABS.find(g => g.id === state.activeGroup) || {}).label || '';
    UI.renderSquadList(filtered, groupAll.length, groupLabel, isAll);
    UI.renderActiveFilters({ ...gs(), categories: isAll ? gs().categories : [] }, onRemoveActiveFilter);

    // Total Price banner: Shortlist only, and reflects whichever players
    // are actually currently shown (search/position/role/PlayStyles/
    // Priority filters all apply) — not always the whole section.
    if (state.activeGroup === 'shortlist') {
      const total = filtered.reduce((sum, p) => sum + (p.value || 0), 0);
      UI.el.shortlistTotal.hidden = false;
      UI.el.shortlistTotalValue.textContent = Players.formatValue(total) || '£0.00';
    } else {
      UI.el.shortlistTotal.hidden = true;
    }
  }

  // ---------- Squad section switch ----------

  function onGroupSelect(groupId) {
    if (groupId === state.activeGroup || !SQUAD_TABS.some(g => g.id === groupId)) return;
    state.activeGroup = groupId;
    UI.renderGroupSegmentedControl(SQUAD_TABS, state.activeGroup, onGroupSelect);

    // Priority only makes sense on Shortlist; Category only makes sense
    // on All (elsewhere you're already looking at one category, so
    // filtering by it again is pointless). Everything else (search,
    // sort, other filters) is shared and needs no restoring: it already
    // reflects the current shared state.
    UI.el.priorityFilterSection.hidden = state.activeGroup !== 'shortlist';
    UI.el.categoryFilterSection.hidden = state.activeGroup !== 'all';

    render();
  }

  function renderPriorityFilterChips() {
    UI.renderRadioChips(UI.el.priorityFilterChips, [
      { value: 'all', label: 'All' },
      { value: 'priority', label: 'Priority only' },
    ], gs().priorityOnly ? 'priority' : 'all', (value) => {
      gs().priorityOnly = value === 'priority';
      renderPriorityFilterChips();
      render();
    });
  }

  /** Category filter chips (First Team/On Loan/Academy/Shortlist) — its
   *  own renderer since each chip's value (group id) differs from its
   *  displayed label, unlike the generic renderChipGroup chips. */
  function renderCategoryFilterChips() {
    UI.el.categoryFilterChips.innerHTML = Players.GROUPS.map(g => `
      <button type="button" class="chip ${gs().categories.includes(g.id) ? 'is-active' : ''}"
        data-value="${UI.escapeHtml(g.id)}" aria-pressed="${gs().categories.includes(g.id)}">${UI.escapeHtml(g.label)}</button>
    `).join('');
    UI.el.categoryFilterChips.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => toggleFilter('categories', chip.dataset.value));
    });
  }

  function renderYouthAcademyFilterChips() {
    UI.renderRadioChips(UI.el.youthAcademyFilterChips, [
      { value: 'all', label: 'All' },
      { value: 'youth', label: 'Youth Academy only' },
    ], gs().youthAcademyOnly ? 'youth' : 'all', (value) => {
      gs().youthAcademyOnly = value === 'youth';
      renderYouthAcademyFilterChips();
      render();
    });
  }

  // ---------- Players: Role Finder (standalone calculator, no stored player involved) ----------

  const roleFinderState = {
    selectedPlaystyles: [], // which PlayStyle chips are toggled on
    search: '',
  };

  function renderRoleFinderChips() {
    const q = roleFinderState.search.trim().toLowerCase();
    const options = q ? Players.PLAYSTYLES.filter(ps => ps.toLowerCase().includes(q)) : Players.PLAYSTYLES;
    UI.renderChipGroup(UI.el.roleFinderPlaystyleChips, options, roleFinderState.selectedPlaystyles, onRoleFinderPlaystyleToggle);
  }

  function onRoleFinderPlaystyleToggle(value) {
    toggleInArray(roleFinderState.selectedPlaystyles, value);
    renderRoleFinderChips();
    renderRoleFinderResults();
  }

  function onRoleFinderClearAll() {
    roleFinderState.selectedPlaystyles = [];
    renderRoleFinderChips();
    renderRoleFinderResults();
  }

  /**
   * The whole feature in one function: for every distinct role in the
   * shared role database, score the currently-selected PlayStyles
   * against it using the exact same calculateRoleFitStars used for
   * player star ratings everywhere else, show only the roles that
   * score above zero, and explain the score via the same S/A tier
   * lookup used for PlayStyle badge colouring. Nothing here is
   * hardcoded — add or edit a role in Lineups.ROLE_DATA and this
   * reflects it automatically.
   */
  function renderRoleFinderResults() {
    const selected = roleFinderState.selectedPlaystyles;
    const fakePlayer = { playstyles: selected, playstylesPlus: [] };

    const results = Object.keys(Lineups.ROLE_DATA).map(roleName => {
      const roleData = Lineups.getRoleData(roleName);
      const score = Lineups.calculateRoleFitStars(fakePlayer, roleData);
      return { roleName, roleData, score };
    })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!selected.length || !results.length) {
      UI.el.roleFinderResults.innerHTML = '';
      UI.el.roleFinderEmptyState.hidden = false;
      UI.el.roleFinderEmptyState.querySelector('h2').textContent = selected.length ? 'No roles match yet' : 'Select some PlayStyles';
      UI.el.roleFinderEmptyState.querySelector('p').textContent = selected.length
        ? 'None of your selected PlayStyles are S or A tier for any tactical role.'
        : 'Pick one or more PlayStyles above to see which tactical roles they suit best.';
      return;
    }
    UI.el.roleFinderEmptyState.hidden = true;

    UI.el.roleFinderResults.innerHTML = results.map(({ roleName, roleData, score }) => {
      const positions = Lineups.getPositionsForRole(roleName)
        .slice()
        .sort((a, b) => Players.POSITIONS.indexOf(a) - Players.POSITIONS.indexOf(b));
      const sMatches = (roleData.playstyleTiers.S || []).filter(ps => selected.includes(ps));
      const aMatches = (roleData.playstyleTiers.A || []).filter(ps => selected.includes(ps));

      const tierBlock = (label, items) => items.length ? `
        <div class="role-finder-result__tier">
          <h5>Matched ${UI.escapeHtml(label)}</h5>
          <ul class="role-detail__list">${items.map(ps => `<li>${UI.escapeHtml(ps)}</li>`).join('')}</ul>
        </div>
      ` : '';

      return `
        <div class="role-finder-result">
          <div class="role-finder-result__header">
            <div>
              <div class="role-finder-result__name">${UI.escapeHtml(roleName)}</div>
              <div class="role-finder-result__positions">${UI.escapeHtml(positions.join(' / '))}</div>
            </div>
            ${UI.renderStars(score)}
          </div>
          <div class="role-finder-result__breakdown">
            ${tierBlock('S Tier', sMatches)}
            ${tierBlock('A Tier', aMatches)}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderRoleFinder() {
    renderRoleFinderChips();
    renderRoleFinderResults();
  }

  // ---------- Tactics: Roles (tactical reference, no player data yet) ----------

  function renderRolesPitch() {
    const formation = Lineups.getFormation(lineupState.formationId);
    UI.el.rolesFormationLabel.textContent = formation.label;

    UI.el.rolesPitch.innerHTML = formation.slots.map(slot => `
      <div class="pitch-slot" style="left:${slot.x}%; top:${slot.y}%;" data-slot-key="${UI.escapeHtml(slot.key)}">
        <button type="button" class="pitch-slot__main" data-slot-key="${UI.escapeHtml(slot.key)}"
          aria-label="${UI.escapeHtml(slot.label)} - ${UI.escapeHtml(slot.role)}">
          <span class="pitch-slot__marker">${UI.escapeHtml(slot.label)}</span>
          <span class="pitch-slot__name">${UI.escapeHtml(slot.role)}</span>
        </button>
      </div>
    `).join('');

    UI.el.rolesPitch.querySelectorAll('.pitch-slot__main').forEach(btn => {
      btn.addEventListener('click', () => openRoleDetail(btn.dataset.slotKey));
    });
  }

  let activeRoleDetailSlotKey = null; // which position the Role Detail sheet is currently showing, for swipe navigation

  function openRoleDetail(slotKey) {
    const formation = Lineups.getFormation(lineupState.formationId);
    const slot = formation.slots.find(s => s.key === slotKey);
    if (!slot) return;
    activeRoleDetailSlotKey = slotKey;
    UI.renderRoleDetail(slot, Lineups.getRoleData(slot.role));
    UI.openSheet(UI.el.roleDetailBackdrop, UI.el.roleDetailSheet);
  }

  /**
   * Swiping left/right on the Role Detail sheet moves to the next/
   * previous position in the current formation's own slot order — e.g.
   * RB → RCB → LCB → LB → RCM → ... — wrapping around at either end.
   * Works with any formation/role set automatically since it just walks
   * whatever `formation.slots` currently is.
   */
  function navigateRoleDetail(direction) {
    if (!activeRoleDetailSlotKey) return;
    const formation = Lineups.getFormation(lineupState.formationId);
    const slots = formation.slots;
    const currentIndex = slots.findIndex(s => s.key === activeRoleDetailSlotKey);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + direction + slots.length) % slots.length;
    openRoleDetail(slots[nextIndex].key);
  }

  // ---------- Lineups: pitch rendering ----------

  /** Renders the row of small icon buttons that choose what the pitch badges show. */
  function renderDisplayModeControl() {
    UI.el.displayModeControl.innerHTML = DISPLAY_MODES.map(m => `
      <button type="button" class="display-mode-control__btn ${m.id === state.pitchDisplayMode ? 'is-active' : ''}"
        data-mode="${UI.escapeHtml(m.id)}" role="tab" aria-selected="${m.id === state.pitchDisplayMode}"
        aria-label="${UI.escapeHtml(m.label)}" title="${UI.escapeHtml(m.label)}">${m.icon}</button>
    `).join('');
    UI.el.displayModeControl.querySelectorAll('.display-mode-control__btn').forEach(btn => {
      btn.addEventListener('click', () => onDisplayModeSelect(btn.dataset.mode));
    });
  }

  function onDisplayModeSelect(modeId) {
    if (modeId === state.pitchDisplayMode || !DISPLAY_MODES.some(m => m.id === modeId)) return;
    state.pitchDisplayMode = modeId;
    Storage.saveSettings({ ...Storage.loadSettings(), pitchDisplayMode: modeId });
    renderDisplayModeControl();
    renderPitch();
  }

  // ---------- Squad Depth: auto-picked top 2 per role, read-only ----------

  function renderSquadDepthDisplayModeControl() {
    UI.el.squadDepthDisplayModeControl.innerHTML = DISPLAY_MODES.map(m => `
      <button type="button" class="display-mode-control__btn ${m.id === state.squadDepthDisplayMode ? 'is-active' : ''}"
        data-mode="${UI.escapeHtml(m.id)}" role="tab" aria-selected="${m.id === state.squadDepthDisplayMode}"
        aria-label="${UI.escapeHtml(m.label)}" title="${UI.escapeHtml(m.label)}">${m.icon}</button>
    `).join('');
    UI.el.squadDepthDisplayModeControl.querySelectorAll('.display-mode-control__btn').forEach(btn => {
      btn.addEventListener('click', () => onSquadDepthDisplayModeSelect(btn.dataset.mode));
    });
  }

  function onSquadDepthDisplayModeSelect(modeId) {
    if (modeId === state.squadDepthDisplayMode || !DISPLAY_MODES.some(m => m.id === modeId)) return;
    state.squadDepthDisplayMode = modeId;
    renderSquadDepthDisplayModeControl();
    renderSquadDepthPitch();
  }

  /**
   * The eligible pool for Squad Depth: First Team + Academy always;
   * Shortlist only if the Priority heart is on (a monitored target
   * shouldn't count as real depth, only a serious one).
   */
  function squadDepthPlayerPool() {
    return Players.getAll().filter(p => p.playerGroup !== 'shortlist' || p.priority);
  }

  /**
   * Ranks eligible players for a slot by the current display mode.
   * Every mode ranks highest-value-first except Age, which ranks
   * youngest-first — the one place "higher number" isn't "better".
   */
  function rankForSquadDepth(players, slot) {
    const mode = DISPLAY_MODES.find(m => m.id === state.squadDepthDisplayMode) || DISPLAY_MODES[0];
    return players.slice().sort((a, b) => {
      const av = mode.getValue(a, slot);
      const bv = mode.getValue(b, slot);
      return mode.id === 'age' ? (av - bv) : (bv - av);
    });
  }

  function renderSquadDepthPitch() {
    const formation = Lineups.getFormation(lineupState.formationId);
    UI.el.squadDepthFormationLabel.textContent = formation.label;
    const mode = DISPLAY_MODES.find(m => m.id === state.squadDepthDisplayMode) || DISPLAY_MODES[0];
    const pool = squadDepthPlayerPool();

    UI.el.squadDepthPitch.innerHTML = formation.slots.map(slot => {
      // Role-aware: both the position AND the assigned tactical role
      // must match this exact slot — a CB who's a Defender never
      // counts as depth for a Ball-Playing Defender slot, etc.
      const eligible = pool.filter(p => p.position === slot.position && p.role === slot.role);
      const top2 = rankForSquadDepth(eligible, slot).slice(0, 2);

      const rowsHtml = top2.map(p => {
        const value = mode.id === 'roleFit' ? UI.renderStars(mode.getValue(p, slot)) : UI.escapeHtml(String(mode.getValue(p, slot)));
        return `
          <button type="button" class="depth-row" data-id="${UI.escapeHtml(p.id)}">
            <span class="depth-row__name">${UI.escapeHtml(p.name)}</span>
            <span class="depth-row__value">${value}</span>
          </button>
        `;
      }).join('');

      return `
        <div class="pitch-slot pitch-slot--depth" style="left:${slot.x}%; top:${slot.y}%;">
          <div class="pitch-slot__marker pitch-slot__marker--depth">${UI.escapeHtml(slot.label)}</div>
          <div class="pitch-slot__depth-rows">${rowsHtml}</div>
        </div>
      `;
    }).join('');

    UI.el.squadDepthPitch.querySelectorAll('.depth-row').forEach(row => {
      row.addEventListener('click', () => openDetail(row.dataset.id));
    });
  }

  function renderPitch() {
    const formation = Lineups.getFormation(lineupState.formationId);
    UI.el.formationLabel.textContent = formation.label;
    const displayMode = activeDisplayMode();

    // Detect duplicate player assignments within this lineup, so both
    // occurrences can show a warning icon.
    const idCounts = {};
    Object.values(lineupState.slots).forEach(pid => {
      if (pid) idCounts[pid] = (idCounts[pid] || 0) + 1;
    });

    UI.el.pitch.innerHTML = formation.slots.map(slot => {
      const playerId = lineupState.slots[slot.key];
      const player = playerId ? Players.getById(playerId) : null;
      const isEmpty = !player;
      const mismatched = player && player.position !== slot.position;
      const duplicated = player && idCounts[playerId] > 1;
      const showWarning = mismatched || duplicated;

      const nameLine = player ? UI.escapeHtml(player.name) : slot.label;
      const roleLine = player ? `OVR ${player.overall}` : `${UI.escapeHtml(slot.role)}`;
      // Role Fit shows real star markup (never plain "2.5" text); every
      // other mode is a plain escaped value.
      const badgeContent = isEmpty
        ? UI.escapeHtml(slot.label)
        : (displayMode.id === 'roleFit'
          ? UI.renderStars(displayMode.getValue(player, slot), 'badge')
          : UI.escapeHtml(String(displayMode.getValue(player, slot))));
      // A player pulled in from Academy or Shortlist isn't actually
      // available to the First Team — italicize their name on the
      // pitch so that's obvious at a glance.
      const notFirstTeam = player && player.playerGroup !== Players.DEFAULT_GROUP;

      return `
        <div class="pitch-slot ${isEmpty ? 'is-empty' : ''}" style="left:${slot.x}%; top:${slot.y}%;"
          data-slot-key="${UI.escapeHtml(slot.key)}">
          <button type="button" class="pitch-slot__main" data-slot-key="${UI.escapeHtml(slot.key)}"
            aria-label="${UI.escapeHtml(slot.label)} - ${UI.escapeHtml(slot.role)}">
            <span class="pitch-slot__marker">${badgeContent}
              ${showWarning ? '<span class="pitch-slot__warning">!</span>' : ''}
            </span>
            <span class="pitch-slot__name ${notFirstTeam ? 'pitch-slot__name--other-section' : ''}">${nameLine}</span>
            <span class="pitch-slot__role">${roleLine}</span>
          </button>
          ${!isEmpty ? `<button type="button" class="pitch-slot__change" data-slot-key="${UI.escapeHtml(slot.key)}" aria-label="Change player">⇄</button>` : ''}
        </div>
      `;
    }).join('');

    UI.el.pitch.querySelectorAll('.pitch-slot__main').forEach(btn => {
      btn.addEventListener('click', () => onPitchSlotClick(btn.dataset.slotKey));
    });
    UI.el.pitch.querySelectorAll('.pitch-slot__change').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPlayerSelector(btn.dataset.slotKey);
      });
    });
  }

  function onPitchSlotClick(slotKey) {
    const playerId = lineupState.slots[slotKey];
    if (playerId && Players.getById(playerId)) {
      // Filled: the main tap views that player's profile. The small
      // "change player" button (see renderPitch) opens the selector to
      // reassign or clear the position instead.
      openDetail(playerId);
    } else {
      openPlayerSelector(slotKey);
    }
  }

  // ---------- Lineups: player selector ----------

  function openPlayerSelector(slotKey) {
    activeSlotKey = slotKey;
    const formation = Lineups.getFormation(lineupState.formationId);
    const slot = formation.slots.find(s => s.key === slotKey);
    if (!slot) return;

    document.getElementById('playerSelectorTitle').textContent = `Choose a ${slot.label}`;

    // A player already used in a different slot of this lineup can't be
    // picked again here — this prevents *creating* new duplicates. (An
    // older saved lineup that already has a duplicate keeps showing its
    // warning icon on the pitch; this just stops new ones from forming.)
    const usedElsewhere = new Set(
      Object.entries(lineupState.slots)
        .filter(([key, playerId]) => key !== slotKey && playerId)
        .map(([, playerId]) => playerId)
    );

    const available = Players.getAll().filter(p => !usedElsewhere.has(p.id));
    const matching = available.filter(p => p.position === slot.position).sort((a, b) => a.name.localeCompare(b.name));
    const rest = available.filter(p => p.position !== slot.position).sort((a, b) => a.name.localeCompare(b.name));

    UI.el.playerSelectorEmpty.hidden = (matching.length + rest.length) > 0;

    function rowHtml(p) {
      const roleFit = Lineups.calculateRoleFitStars(p, Lineups.getRoleData(slot.role));
      return `
        <div class="player-select-row" data-player-id="${UI.escapeHtml(p.id)}">
          <div>
            <div class="player-select-row__name">${UI.escapeHtml(p.name)}</div>
            <div class="player-select-row__meta">${UI.escapeHtml(p.position)} · Age ${p.age}</div>
            ${UI.renderStars(roleFit)}
          </div>
          <div class="player-select-row__stats"><b>${p.overall}</b> OVR &nbsp; ${p.potential} POT</div>
        </div>
      `;
    }

    let html = '';
    if (matching.length) {
      html += `<div class="player-select-group">Matching position</div>` + matching.map(rowHtml).join('');
    }
    if (rest.length) {
      html += `<div class="player-select-group">Other players</div>` + rest.map(rowHtml).join('');
    }
    UI.el.playerSelectorList.innerHTML = html;

    UI.el.playerSelectorList.querySelectorAll('.player-select-row').forEach(row => {
      row.addEventListener('click', () => onPlayerSelected(row.dataset.playerId));
    });

    // A slot that already has a player gets a way to clear it, above the list.
    const hasCurrentPlayer = !!lineupState.slots[slotKey];
    UI.el.playerSelectorClearBtn.hidden = !hasCurrentPlayer;

    UI.openSheet(UI.el.playerSelectorBackdrop, UI.el.playerSelectorSheet);
  }

  function onClearPosition() {
    if (!activeSlotKey) return;
    delete lineupState.slots[activeSlotKey];
    activeSlotKey = null;
    UI.closeSheet(UI.el.playerSelectorBackdrop, UI.el.playerSelectorSheet);
    renderPitch();
  }

  function onPlayerSelected(playerId) {
    if (!activeSlotKey) return;
    lineupState.slots[activeSlotKey] = playerId;
    activeSlotKey = null;
    UI.closeSheet(UI.el.playerSelectorBackdrop, UI.el.playerSelectorSheet);
    renderPitch();
  }

  // ---------- Lineups: save / new / delete / duplicate ----------

  function onNewLineup() {
    lineupState = Lineups.createBlank(Lineups.DEFAULT_FORMATION_ID);
    renderPitch();
  }

  function openSaveLineupDialog() {
    UI.el.lineupNameInput.value = lineupState.name || '';
    UI.openSheet(UI.el.saveLineupBackdrop, UI.el.saveLineupDialog);
    setTimeout(() => UI.el.lineupNameInput.focus(), 150);
  }

  function onConfirmSaveLineup() {
    const name = UI.el.lineupNameInput.value.trim();
    if (!name) {
      UI.el.lineupNameInput.focus();
      return;
    }
    const record = Lineups.save({
      id: lineupState.id,
      name,
      formationId: lineupState.formationId,
      slots: lineupState.slots,
    });
    lineupState = { id: record.id, name: record.name, formationId: record.formationId, slots: { ...record.slots } };
    UI.closeSheet(UI.el.saveLineupBackdrop, UI.el.saveLineupDialog);
    UI.showToast(`${record.name} saved`);
    renderSavedLineupsList();
  }

  function renderSavedLineupsList() {
    const lineups = Lineups.getAll();
    UI.el.lineupsEmptyState.hidden = lineups.length > 0;
    UI.el.savedLineupsList.innerHTML = lineups.map(l => {
      const formation = Lineups.getFormation(l.formationId);
      const filled = Lineups.filledCount(l);
      const incomplete = filled < 11;
      return `
        <div class="lineup-card" data-lineup-id="${UI.escapeHtml(l.id)}">
          <div class="lineup-card__info">
            <div class="lineup-card__name">
              ${UI.escapeHtml(l.name)}
              ${incomplete ? '<span class="lineup-card__incomplete" title="Incomplete lineup">!</span>' : ''}
            </div>
            <div class="lineup-card__meta">${UI.escapeHtml(formation.label)} · ${filled}/11 players</div>
          </div>
          <div class="lineup-card__actions">
            <button type="button" class="btn btn--icon lineup-duplicate-btn" data-lineup-id="${UI.escapeHtml(l.id)}" aria-label="Duplicate lineup">⧉</button>
            <button type="button" class="btn btn--icon lineup-delete-btn" data-lineup-id="${UI.escapeHtml(l.id)}" aria-label="Delete lineup">🗑</button>
          </div>
        </div>
      `;
    }).join('');

    UI.el.savedLineupsList.querySelectorAll('.lineup-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.lineup-duplicate-btn') || e.target.closest('.lineup-delete-btn')) return;
        onLoadLineup(card.dataset.lineupId);
      });
    });
    UI.el.savedLineupsList.querySelectorAll('.lineup-duplicate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const copy = Lineups.duplicate(btn.dataset.lineupId);
        if (copy) {
          UI.showToast(`Duplicated as "${copy.name}"`);
          renderSavedLineupsList();
        }
      });
    });
    UI.el.savedLineupsList.querySelectorAll('.lineup-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const lineup = Lineups.getById(btn.dataset.lineupId);
        if (!lineup) return;
        confirmAction = () => {
          Lineups.remove(lineup.id);
          if (lineupState.id === lineup.id) {
            lineupState = Lineups.createBlank(Lineups.DEFAULT_FORMATION_ID);
            renderPitch();
          }
          UI.showToast(`${lineup.name} deleted`);
          UI.closeConfirm();
          renderSavedLineupsList();
        };
        UI.openConfirm({
          title: 'Delete this lineup?',
          text: `${lineup.name} will be deleted. This can't be undone.`,
          confirmLabel: 'Delete',
        });
      });
    });
  }

  function onLoadLineup(id) {
    const lineup = Lineups.getById(id);
    if (!lineup) return;
    lineupState = { id: lineup.id, name: lineup.name, formationId: lineup.formationId, slots: { ...lineup.slots } };
    renderPitch();
  }

  // ---------- Event wiring ----------

  function bindEvents() {
    UI.el.searchInput.addEventListener('input', (e) => {
      gs().search = e.target.value;
      UI.el.clearSearchBtn.hidden = !gs().search;
      render();
    });
    UI.el.clearSearchBtn.addEventListener('click', () => {
      gs().search = '';
      UI.el.searchInput.value = '';
      UI.el.clearSearchBtn.hidden = true;
      render();
    });

    // Squad list -> open detail (the Priority heart, if present, is handled
    // first and never opens detail)
    UI.el.squadList.addEventListener('click', (e) => {
      const heart = e.target.closest('.priority-heart');
      if (heart) {
        e.stopPropagation();
        Players.togglePriority(heart.dataset.id);
        render();
        return;
      }
      const card = e.target.closest('.player-card');
      if (!card) return;
      openDetail(card.dataset.id);
    });

    // Filters sheet
    UI.el.openFiltersBtn.addEventListener('click', () => UI.openSheet(UI.el.filtersBackdrop, UI.el.filtersSheet));
    UI.el.closeFiltersBtn.addEventListener('click', () => UI.closeSheet(UI.el.filtersBackdrop, UI.el.filtersSheet));
    UI.el.applyFiltersBtn.addEventListener('click', () => UI.closeSheet(UI.el.filtersBackdrop, UI.el.filtersSheet));
    UI.el.filtersBackdrop.addEventListener('click', () => UI.closeSheet(UI.el.filtersBackdrop, UI.el.filtersSheet));
    UI.el.sortDirectionBtn.addEventListener('click', () => {
      gs().sortDir = gs().sortDir === 'asc' ? 'desc' : 'asc';
      UI.setSortDirectionUI(gs().sortDir);
      render();
    });
    UI.el.clearFiltersBtn.addEventListener('click', clearAllFilters);
    UI.el.emptyStateClearBtn.addEventListener('click', clearAllFilters);

    // Add / edit form
    UI.el.addPlayerBtn.addEventListener('click', () => openForm(null));
    UI.el.formCancelBtn.addEventListener('click', handleCancelForm);
    UI.el.formBackdrop.addEventListener('click', handleCancelForm);
    UI.el.formSaveBtn.addEventListener('click', onSaveForm);
    UI.el.playerForm.addEventListener('submit', (e) => { e.preventDefault(); onSaveForm(); });
    UI.el.calcPotentialBtn.addEventListener('click', onCalculatePotential);
    UI.el.playerForm.value.addEventListener('focus', onValueFieldFocus);
    UI.el.playerForm.value.addEventListener('blur', onValueFieldBlur);
    UI.el.fieldSquadSection.addEventListener('change', () => {
      UI.updateValueFieldLabel(UI.el.fieldSquadSection.value);
      // Only when adding fresh — an existing player's Youth Academy
      // flag shouldn't get silently overridden by an edit that also
      // happens to change their squad section.
      if (!state.editingId && UI.el.fieldSquadSection.value === 'academy') {
        UI.el.playerForm.youthAcademy.checked = true;
      }
    });
    UI.el.fieldPosition.addEventListener('change', onPositionFieldChange);

    // Screenshot import has its own module (import.js) which wires up
    // its own button/sheet events via ScreenshotImport.init() below.

    // Useful Links menu (header crest)
    UI.el.headerCrestBtn.addEventListener('click', () => {
      UI.openSheet(UI.el.linksMenuBackdrop, UI.el.linksMenuDialog);
    });
    UI.el.linksMenuCloseBtn.addEventListener('click', () => UI.closeSheet(UI.el.linksMenuBackdrop, UI.el.linksMenuDialog));
    UI.el.linksMenuBackdrop.addEventListener('click', () => UI.closeSheet(UI.el.linksMenuBackdrop, UI.el.linksMenuDialog));

    // Role Finder
    UI.el.roleFinderSearchInput.addEventListener('input', () => {
      roleFinderState.search = UI.el.roleFinderSearchInput.value;
      UI.el.roleFinderClearSearchBtn.hidden = !roleFinderState.search;
      renderRoleFinderChips();
    });
    UI.el.roleFinderClearSearchBtn.addEventListener('click', () => {
      UI.el.roleFinderSearchInput.value = '';
      roleFinderState.search = '';
      UI.el.roleFinderClearSearchBtn.hidden = true;
      renderRoleFinderChips();
    });
    UI.el.roleFinderClearAllBtn.addEventListener('click', onRoleFinderClearAll);

    // Data & Backup sheet
    UI.el.openBackupBtn.addEventListener('click', () => {
      UI.renderLastBackupText(Storage.loadSettings().lastBackupExportedAt);
      UI.openSheet(UI.el.backupBackdrop, UI.el.backupSheet);
    });
    UI.el.closeBackupBtn.addEventListener('click', () => UI.closeSheet(UI.el.backupBackdrop, UI.el.backupSheet));
    UI.el.backupBackdrop.addEventListener('click', () => UI.closeSheet(UI.el.backupBackdrop, UI.el.backupSheet));
    UI.el.exportBackupBtn.addEventListener('click', onExportBackup);
    UI.el.importBackupBtn.addEventListener('click', () => UI.el.importFileInput.click());
    UI.el.importFileInput.addEventListener('change', onImportFileSelected);

    // Import modal (mode + duplicate-strategy choice, shown after a backup file passes validation)
    UI.el.closeImportBtn.addEventListener('click', closeImportModal);
    UI.el.importCancelBtn.addEventListener('click', closeImportModal);
    UI.el.importBackdrop.addEventListener('click', closeImportModal);
    UI.el.importConfirmBtn.addEventListener('click', onConfirmImport);

    // Detail view
    document.getElementById('detailCloseBtn').addEventListener('click', () => UI.closeSheet(UI.el.detailBackdrop, UI.el.detailSheet));
    UI.el.detailBackdrop.addEventListener('click', () => UI.closeSheet(UI.el.detailBackdrop, UI.el.detailSheet));
    UI.el.detailPriorityHeart.addEventListener('click', (e) => {
      const heart = e.target.closest('.priority-heart');
      if (!heart) return;
      Players.togglePriority(heart.dataset.id);
      const player = Players.getById(state.activeId);
      if (player) UI.fillDetail(player);
      render();
    });
    document.getElementById('detailEditBtn').addEventListener('click', () => {
      const id = state.activeId;
      UI.closeSheet(UI.el.detailBackdrop, UI.el.detailSheet);
      setTimeout(() => openForm(id), 200);
    });
    UI.el.detailMoveGroupBtn.addEventListener('click', () => {
      const player = Players.getById(state.activeId);
      const targetGroup = UI.el.detailMoveGroupBtn.dataset.targetGroup;
      if (!player || !targetGroup) return;
      Players.setPlayerGroup(player.id, targetGroup);
      const targetLabel = (Players.GROUPS.find(g => g.id === targetGroup) || {}).label || targetGroup;
      UI.showToast(`${player.name} moved to ${targetLabel}`);
      UI.closeSheet(UI.el.detailBackdrop, UI.el.detailSheet);
      render();
    });
    UI.el.detailSignPlayerBtn.addEventListener('click', () => {
      const player = Players.getById(state.activeId);
      if (!player) return;
      Players.signPlayer(player.id);
      UI.showToast(`${player.name} signed to First Team`);
      UI.closeSheet(UI.el.detailBackdrop, UI.el.detailSheet);
      render();
    });
    document.getElementById('detailDeleteBtn').addEventListener('click', () => {
      const player = Players.getById(state.activeId);
      if (!player) return;
      confirmAction = () => {
        Players.remove(player.id);
        // Deleting a player never deletes a lineup — it just leaves that
        // slot empty everywhere the player was used, including the
        // lineup currently open on the pitch (if any).
        Lineups.removePlayerEverywhere(player.id);
        if (lineupState.slots) {
          for (const key of Object.keys(lineupState.slots)) {
            if (lineupState.slots[key] === player.id) delete lineupState.slots[key];
          }
        }
        UI.showToast(`${player.name} removed from squad`);
        UI.closeConfirm();
        UI.closeSheet(UI.el.detailBackdrop, UI.el.detailSheet);
        render();
        renderPitch();
        renderSavedLineupsList();
      };
      UI.openConfirm({
        title: 'Delete this player?',
        text: `${player.name} will be removed from your squad. This can't be undone.`,
        confirmLabel: 'Delete',
      });
    });

    // Shared confirm dialog (delete player OR discard unsaved form changes OR delete lineup)
    document.getElementById('confirmCancelBtn').addEventListener('click', UI.closeConfirm);
    UI.el.confirmBackdrop.addEventListener('click', UI.closeConfirm);
    UI.el.confirmDeleteBtn.addEventListener('click', () => {
      if (confirmAction) confirmAction();
    });

    // Info dialog (single button) — reused for "Manage Tactics — Coming soon"
    document.getElementById('infoOkBtn').addEventListener('click', UI.closeInfo);
    UI.el.infoBackdrop.addEventListener('click', UI.closeInfo);

    // ---- Tactics ----
    UI.el.manageTacticsBtn.addEventListener('click', () => {
      UI.openInfo('Manage Tactics', 'Coming soon — you\u2019ll be able to create custom formations and role layouts here.');
    });
    UI.el.rolesManageTacticsBtn.addEventListener('click', () => {
      UI.openInfo('Manage Tactics', 'Coming soon — you\u2019ll be able to create custom formations and role layouts here.');
    });
    UI.el.squadDepthManageTacticsBtn.addEventListener('click', () => {
      UI.openInfo('Manage Tactics', 'Coming soon — you\u2019ll be able to create custom formations and role layouts here.');
    });
    UI.el.roleDetailCloseBtn.addEventListener('click', () => UI.closeSheet(UI.el.roleDetailBackdrop, UI.el.roleDetailSheet));
    UI.el.roleDetailBackdrop.addEventListener('click', () => UI.closeSheet(UI.el.roleDetailBackdrop, UI.el.roleDetailSheet));

    // Swipe left/right to jump to the next/previous position, in the
    // current formation's own slot order.
    let roleDetailTouchStartX = null;
    let roleDetailTouchStartY = null;
    UI.el.roleDetailSheet.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      roleDetailTouchStartX = t.clientX;
      roleDetailTouchStartY = t.clientY;
    }, { passive: true });
    UI.el.roleDetailSheet.addEventListener('touchend', (e) => {
      if (roleDetailTouchStartX === null) return;
      const t = e.changedTouches[0];
      const deltaX = t.clientX - roleDetailTouchStartX;
      const deltaY = t.clientY - roleDetailTouchStartY;
      roleDetailTouchStartX = null;
      roleDetailTouchStartY = null;
      const SWIPE_THRESHOLD = 50;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        navigateRoleDetail(deltaX < 0 ? 1 : -1); // swipe left -> next position
      }
    }, { passive: true });
    UI.el.newLineupBtn.addEventListener('click', onNewLineup);
    UI.el.saveLineupBtn.addEventListener('click', openSaveLineupDialog);
    UI.el.saveLineupCancelBtn.addEventListener('click', () => UI.closeSheet(UI.el.saveLineupBackdrop, UI.el.saveLineupDialog));
    UI.el.saveLineupBackdrop.addEventListener('click', () => UI.closeSheet(UI.el.saveLineupBackdrop, UI.el.saveLineupDialog));
    UI.el.saveLineupConfirmBtn.addEventListener('click', onConfirmSaveLineup);
    UI.el.lineupNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); onConfirmSaveLineup(); }
    });
    UI.el.closePlayerSelectorBtn.addEventListener('click', () => {
      activeSlotKey = null;
      UI.closeSheet(UI.el.playerSelectorBackdrop, UI.el.playerSelectorSheet);
    });
    UI.el.playerSelectorBackdrop.addEventListener('click', () => {
      activeSlotKey = null;
      UI.closeSheet(UI.el.playerSelectorBackdrop, UI.el.playerSelectorSheet);
    });
    UI.el.playerSelectorClearBtn.addEventListener('click', onClearPosition);
  }

  // ---------- Filters ----------

  function toggleFilter(key, value) {
    const list = gs()[key];
    const idx = list.indexOf(value);
    if (idx === -1) list.push(value); else list.splice(idx, 1);
    if (key === 'roleFitRatings') {
      UI.renderRoleFitChips(UI.el.roleFitChips, Players.ROLE_FIT_VALUES, list, (v) => toggleFilter(key, v));
    } else if (key === 'categories') {
      renderCategoryFilterChips();
    } else {
      UI.renderChipGroup(
        key === 'positions' ? UI.el.positionChips : UI.el.roleChips,
        key === 'positions' ? Players.POSITIONS : Players.TACTICAL_ROLES,
        list,
        (v) => toggleFilter(key, v)
      );
    }
    render();
  }

  function onRemoveActiveFilter(type, value) {
    if (type === 'roleFit') {
      const idx = gs().roleFitRatings.indexOf(value);
      if (idx > -1) gs().roleFitRatings.splice(idx, 1);
      UI.renderRoleFitChips(UI.el.roleFitChips, Players.ROLE_FIT_VALUES, gs().roleFitRatings, (v) => toggleFilter('roleFitRatings', v));
      render();
      return;
    }
    if (type === 'category') {
      const idx = gs().categories.indexOf(value);
      if (idx > -1) gs().categories.splice(idx, 1);
      renderCategoryFilterChips();
      render();
      return;
    }
    const key = type === 'position' ? 'positions' : 'roles';
    const idx = gs()[key].indexOf(value);
    if (idx > -1) gs()[key].splice(idx, 1);
    UI.renderChipGroup(
      key === 'positions' ? UI.el.positionChips : UI.el.roleChips,
      key === 'positions' ? Players.POSITIONS : Players.TACTICAL_ROLES,
      gs()[key],
      (v) => toggleFilter(key, v)
    );
    render();
  }

  function clearAllFilters() {
    gs().positions = [];
    gs().roles = [];
    gs().roleFitRatings = [];
    gs().priorityOnly = false;
    gs().categories = [];
    gs().youthAcademyOnly = false;
    gs().search = '';
    UI.el.searchInput.value = '';
    UI.el.clearSearchBtn.hidden = true;
    UI.renderChipGroup(UI.el.positionChips, Players.POSITIONS, gs().positions, (v) => toggleFilter('positions', v));
    UI.renderChipGroup(UI.el.roleChips, Players.TACTICAL_ROLES, gs().roles, (v) => toggleFilter('roles', v));
    UI.renderRoleFitChips(UI.el.roleFitChips, Players.ROLE_FIT_VALUES, gs().roleFitRatings, (v) => toggleFilter('roleFitRatings', v));
    renderPriorityFilterChips();
    renderCategoryFilterChips();
    renderYouthAcademyFilterChips();
    render();
  }

  function onSortSelect(key) {
    gs().sortKey = key;
    UI.renderSortChips(UI.el.sortChips, Players.SORT_FIELDS, gs().sortKey, onSortSelect);
    render();
  }

  // ---------- Detail view ----------

  function openDetail(id) {
    const player = Players.getById(id);
    if (!player) return;
    state.activeId = id;
    UI.fillDetail(player);
    UI.openSheet(UI.el.detailBackdrop, UI.el.detailSheet);
  }

  // ---------- Add / edit form ----------

  function renderPlaystyleChips() {
    UI.renderChipGroup(UI.el.playstylesChips, Players.PLAYSTYLES, formSelections.playstyles, (value) => {
      toggleInArray(formSelections.playstyles, value);
      renderPlaystyleChips();
    });
    UI.renderChipGroup(UI.el.playstylesPlusChips, Players.PLAYSTYLES, formSelections.playstylesPlus, (value) => {
      toggleInArray(formSelections.playstylesPlus, value);
      renderPlaystyleChips();
    });
  }

  function toggleInArray(arr, value) {
    const idx = arr.indexOf(value);
    if (idx === -1) arr.push(value); else arr.splice(idx, 1);
  }

  /**
   * Fires only on a user-driven change of the Position field (setting
   * .value programmatically, e.g. when opening Edit, does not trigger a
   * native 'change' event) — so this only ever runs when the position
   * is actively changed, never on initial form population:
   *   - exactly one valid role for the new position -> select it
   *   - several valid roles, and the current role is still one of them
   *     -> leave it alone (this is what preserves an Edit's existing
   *     role across a position change, with no special-casing needed)
   *   - otherwise -> clear it, never guessing which of several roles
   *     the player should have
   */
  function onPositionFieldChange() {
    const f = UI.el.playerForm;
    const roles = Lineups.getRolesForPosition(f.position.value);
    if (roles.length === 1) {
      f.role.value = roles[0];
    } else if (!roles.includes(f.role.value)) {
      f.role.value = Players.NO_ROLE;
    }
  }

  function openForm(id) {
    state.editingId = id;
    const player = id ? Players.getById(id) : null;

    UI.el.formTitle.textContent = player ? 'Edit player' : 'Add player';
    UI.el.formSaveBtn.textContent = player ? 'Save Changes' : 'Add Player';
    UI.el.importScreenshotBtn.hidden = !!player;

    formSelections.playstyles = player ? player.playstyles.slice() : [];
    formSelections.playstylesPlus = player ? player.playstylesPlus.slice() : [];

    UI.fillForm(player);
    renderPlaystyleChips();

    UI.openSheet(UI.el.formBackdrop, UI.el.formSheet);
    formInitialSnapshot = currentFormSnapshot();
    setTimeout(() => UI.el.playerForm.name.focus(), 300);
  }

  function currentFormSnapshot() {
    const f = UI.el.playerForm;
    return JSON.stringify({
      name: f.name.value,
      age: f.age.value,
      overall: f.overall.value,
      potential: f.potential.value,
      value: f.value.value,
      position: f.position.value,
      squadSection: f.squadSection.value,
      role: f.role.value,
      notes: f.notes.value,
      youthAcademy: f.youthAcademy.checked,
      playstyles: formSelections.playstyles.slice().sort(),
      playstylesPlus: formSelections.playstylesPlus.slice().sort(),
    });
  }

  function isFormDirty() {
    return currentFormSnapshot() !== formInitialSnapshot;
  }

  function closeForm() {
    UI.closeSheet(UI.el.formBackdrop, UI.el.formSheet);
    state.editingId = null;
    formInitialSnapshot = null;
  }

  function handleCancelForm() {
    if (isFormDirty()) {
      confirmAction = () => {
        UI.closeConfirm();
        closeForm();
      };
      UI.openConfirm({
        title: 'Discard changes?',
        text: 'You have unsaved changes. Are you sure you want to discard them?',
        confirmLabel: 'Discard',
      });
    } else {
      closeForm();
    }
  }

  function validateForm(data) {
    let valid = true;
    UI.clearFormErrors();

    if (!data.name.trim()) { UI.showFieldError('name'); valid = false; }

    if (!Number.isFinite(data.age) || data.age < 15 || data.age > 45) { UI.showFieldError('age'); valid = false; }

    if (!Number.isFinite(data.overall) || data.overall < 1 || data.overall > 99) { UI.showFieldError('overall'); valid = false; }

    if (!Number.isFinite(data.potential) || data.potential < 1 || data.potential > 99 || data.potential < data.overall) {
      UI.showFieldError('potential'); valid = false;
    }

    if (data.value !== null && (!Number.isFinite(data.value) || data.value < 0)) {
      UI.showFieldError('value'); valid = false;
    }

    if (!data.position) { valid = false; } // always has a default option, but guard anyway

    if (!Players.GROUPS.some(g => g.id === data.playerGroup)) {
      UI.showFieldError('squadSection'); valid = false;
    }

    return valid;
  }

  /**
   * The Value field displays comma-grouped text while blurred (e.g.
   * "6,000,000.00"), but every place that reads it needs the underlying
   * number. Strips the commas so parseFloat/Number don't stop short at
   * the first one.
   */
  function stripValueCommas(str) {
    return (str || '').replace(/,/g, '').trim();
  }

  /**
   * The Value field shows comma-grouped text (e.g. "6,000,000.00") while
   * blurred, for readability, but plain digits while focused, so typing
   * and editing aren't fighting inserted commas.
   */
  function onValueFieldFocus() {
    const input = UI.el.playerForm.value;
    const cleaned = stripValueCommas(input.value);
    if (cleaned === '') return;
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return; // leave as typed if not a parseable number
    input.value = String(num); // plain digits, e.g. "6000000" — no forced ".00"
  }

  function onValueFieldBlur() {
    const input = UI.el.playerForm.value;
    const cleaned = stripValueCommas(input.value);
    if (cleaned === '') { input.value = ''; return; }
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return; // leave as typed; validation flags it on save
    input.value = Players.formatValueForInput(num);
  }

  function onSaveForm() {
    const f = UI.el.playerForm;
    const rawValue = stripValueCommas(f.value.value);

    const data = {
      name: f.name.value,
      age: parseInt(f.age.value, 10),
      overall: parseInt(f.overall.value, 10),
      potential: parseInt(f.potential.value, 10),
      position: f.position.value,
      playerGroup: f.squadSection.value,
      role: f.role.value, // '' is a valid "no role selected" value
      value: rawValue === '' ? null : parseFloat(rawValue),
      playstyles: formSelections.playstyles.slice(),
      playstylesPlus: formSelections.playstylesPlus.slice(),
      notes: f.notes.value,
      youthAcademy: f.youthAcademy.checked,
    };

    if (!validateForm(data)) return;

    if (state.editingId) {
      Players.update(state.editingId, data);
      UI.showToast(`${data.name} updated`);
    } else {
      const sectionLabel = (Players.GROUPS.find(g => g.id === data.playerGroup) || {}).label || 'squad';
      Players.add(data);
      UI.showToast(`${data.name} added to ${sectionLabel}`);
    }

    closeForm();
    render();
  }

  // ---------- Automatic potential calculation ----------

  function joinWithAnd(items) {
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  function onCalculatePotential() {
    const f = UI.el.playerForm;

    const ageRaw = f.age.value.trim();
    const overallRaw = f.overall.value.trim();
    const position = f.position.value;
    const valueRaw = stripValueCommas(f.value.value);

    // Name each specific missing field, per spec, rather than a generic message.
    const missing = [];
    if (!ageRaw) missing.push('age');
    if (!overallRaw) missing.push('overall');
    if (!position) missing.push('position');
    if (!valueRaw) missing.push('value');

    if (missing.length) {
      UI.showToast(`Enter ${joinWithAnd(missing)} to calculate potential.`);
      return;
    }

    const age = parseInt(ageRaw, 10);
    const overall = parseInt(overallRaw, 10);
    const value = parseFloat(valueRaw);

    if (!Number.isInteger(age) || age < 15 || age > 45) {
      UI.showToast('Enter a valid age (15–45) to calculate potential.');
      return;
    }
    if (!Number.isFinite(overall) || overall < 1 || overall > 99) {
      UI.showToast('Enter a valid overall (1–99) to calculate potential.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      UI.showToast('Enter a value greater than zero to calculate potential.');
      return;
    }

    const outcome = PotentialCalculator.calculate({
      age, overall, position,
      valueGBP: value, // the form now stores Value directly in whole pounds
    });

    if (!outcome.success) {
      UI.showToast(outcome.message || 'Potential could not be calculated from these details.');
      return;
    }

    // Defensive: never accept a calculated potential below the current overall,
    // and never let a manual edit of the field slip past 1–99.
    if (!Number.isFinite(outcome.potential) || outcome.potential < overall || outcome.potential > 99) {
      UI.showToast('Potential could not be calculated from these details.');
      return;
    }

    const newPotential = outcome.potential;
    const currentPotential = f.potential.value.trim();

    const applyResult = () => {
      f.potential.value = newPotential;
      UI.showToast(`Potential calculated: ${newPotential}`);
    };

    if (currentPotential !== '' && Number(currentPotential) !== newPotential) {
      confirmAction = () => { UI.closeConfirm(); applyResult(); };
      UI.openConfirm({
        title: 'Replace potential?',
        text: `Calculated potential is ${newPotential}, different from the current value of ${currentPotential}. Replace it?`,
        confirmLabel: 'Replace',
      });
    } else {
      applyResult();
    }
  }

  // ---------- Data & Backup: export ----------

  function onExportBackup() {
    try {
      const backup = Backup.exportAppData();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fc26-squad-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      const settings = Storage.loadSettings();
      settings.lastBackupExportedAt = new Date().toISOString();
      Storage.saveSettings(settings);
      UI.renderLastBackupText(settings.lastBackupExportedAt);

      UI.showToast('Squad backup exported successfully.');
    } catch (err) {
      console.error('SquadHub: export failed', err);
      UI.showToast('Export failed — please try again.');
    }
  }

  // ---------- Data & Backup: import ----------

  function onImportFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    UI.el.importFileInput.value = ''; // allow re-selecting the same file later
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (err) {
        UI.showToast('This file isn\u2019t valid JSON and couldn\u2019t be imported.');
        return;
      }

      const result = Backup.validateBackup(parsed);
      if (!result.valid) {
        UI.showToast(result.error || 'This backup file is invalid or incompatible.');
        return;
      }

      openImportModal(result.backup);
    };
    reader.onerror = () => UI.showToast('Could not read that file.');
    reader.readAsText(file);
  }

  function openImportModal(backup) {
    const players = backup.data.players;
    const duplicateCount = Players.countLikelyDuplicates(players);
    importState = { backup, mode: 'merge', duplicateStrategy: 'keep-current', duplicateCount };

    UI.el.importSummaryText.textContent = `Found ${players.length} player${players.length === 1 ? '' : 's'} in this backup.`;
    renderImportModeChips();
    renderImportDuplicateChips();
    UI.el.importDuplicateSection.hidden = !(importState.mode === 'merge' && duplicateCount > 0);

    UI.openSheet(UI.el.importBackdrop, UI.el.importSheet);
  }

  function renderImportModeChips() {
    UI.renderRadioChips(UI.el.importModeChips, [
      { value: 'merge', label: 'Merge with current squad' },
      { value: 'replace', label: 'Replace current squad' },
    ], importState.mode, (value) => {
      importState.mode = value;
      renderImportModeChips();
      UI.el.importDuplicateSection.hidden = !(importState.mode === 'merge' && importState.duplicateCount > 0);
    });
  }

  function renderImportDuplicateChips() {
    UI.el.importDuplicateText.textContent =
      `${importState.duplicateCount} likely duplicate${importState.duplicateCount === 1 ? '' : 's'} found (matched by ID, or by name + age + position). Choose how to handle them:`;
    UI.renderRadioChips(UI.el.importDuplicateChips, [
      { value: 'keep-current', label: 'Keep current' },
      { value: 'use-imported', label: 'Use imported' },
      { value: 'keep-both', label: 'Keep both' },
    ], importState.duplicateStrategy, (value) => {
      importState.duplicateStrategy = value;
      renderImportDuplicateChips();
    });
  }

  function closeImportModal() {
    UI.closeSheet(UI.el.importBackdrop, UI.el.importSheet);
    importState = null;
  }

  function onConfirmImport() {
    if (!importState) return;

    if (importState.mode === 'replace') {
      const playerCount = importState.backup.data.players.length;
      confirmAction = () => {
        UI.closeConfirm();
        runImport();
      };
      UI.openConfirm({
        title: 'Replace current data?',
        text: `This deletes your current squad and restores ${playerCount} player${playerCount === 1 ? '' : 's'} from the backup. This can't be undone.`,
        confirmLabel: 'Replace',
      });
    } else {
      runImport();
    }
  }

  function runImport() {
    const { backup, mode, duplicateStrategy } = importState;
    const result = Backup.importAppData(backup, mode, duplicateStrategy);
    closeImportModal();

    if (!result.success) {
      UI.showToast(result.error || 'Import failed — your previous squad is safe.');
      return;
    }

    render();

    if (mode === 'replace') {
      UI.showToast(`Import complete: ${result.imported} player${result.imported === 1 ? '' : 's'} restored.`);
    } else {
      const skipped = result.duplicatesSkipped || 0;
      const replaced = result.duplicatesReplaced || 0;
      const added = result.duplicatesAdded || 0;
      const parts = [`${result.imported} player${result.imported === 1 ? '' : 's'} added`];
      if (skipped) parts.push(`${skipped} duplicate${skipped === 1 ? '' : 's'} skipped`);
      if (replaced) parts.push(`${replaced} duplicate${replaced === 1 ? '' : 's'} replaced`);
      if (added) parts.push(`${added} duplicate${added === 1 ? '' : 's'} kept as new players`);
      UI.showToast(`Import complete: ${parts.join(', ')}.`);
    }
  }

  /**
   * Pre-fills the already-open Add Player form with whichever fields
   * were successfully extracted, leaving anything not confidently read
   * blank for manual entry — never a guess, never auto-saved.
   */
  function applyScreenshotExtraction(data) {
    const f = UI.el.playerForm;
    if (data.name) f.name.value = data.name;
    if (data.age !== null && data.age !== undefined) f.age.value = data.age;
    if (data.overall !== null && data.overall !== undefined) f.overall.value = data.overall;
    if (data.position) {
      f.position.value = data.position;
      UI.ensureOptionPresent(f.position, data.position);
    }
    if (data.potential !== null && data.potential !== undefined) f.potential.value = data.potential;
    if (data.value !== null && data.value !== undefined) {
      f.value.value = Players.formatValueForInput(data.value);
    }
    if (data.playstyles && data.playstyles.length) {
      formSelections.playstyles = data.playstyles.slice();
      renderPlaystyleChips();
    }

    // Both screenshots provided -> First Team (the default group).
    // A Global Transfer Network screenshot -> Shortlist, since that's
    // what scouting reports are for (it never provides a Financial
    // screenshot, so this is checked before that case below).
    // Financial screenshot missing otherwise -> Academy, the usual
    // pattern for youth prospects (no financial details tracked yet).
    const firstTeamGroup = Players.DEFAULT_GROUP;
    let targetGroup;
    if (data.hasFinancial) {
      targetGroup = firstTeamGroup;
    } else if (data.isTransferNetwork) {
      targetGroup = (Players.GROUPS.find(g => g.id === 'shortlist') || {}).id || firstTeamGroup;
    } else {
      targetGroup = (Players.GROUPS.find(g => g.id === 'academy') || {}).id || firstTeamGroup;
    }
    f.squadSection.value = targetGroup;
    UI.updateValueFieldLabel(targetGroup);

    UI.clearFormErrors();
    // Tactical role, PlayStyle+, and Notes are deliberately left
    // untouched for manual entry/review, as is Potential unless a
    // Global Transfer Network screenshot supplied a confident range —
    // and, either way, anything that couldn't be confidently read.
  }

  document.addEventListener('DOMContentLoaded', init);
})();
