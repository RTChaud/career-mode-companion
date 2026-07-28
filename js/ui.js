/**
 * ui.js
 * All DOM rendering lives here. Functions are pure-ish: they take
 * data in and paint the screen. app.js decides *when* to call them
 * and wires up event listeners.
 */

const UI = (() => {

  const el = {
    squadList: document.getElementById('squadList'),
    groupSegmentedControl: document.getElementById('groupSegmentedControl'),
    widgetSegmentedControl: document.getElementById('widgetSegmentedControl'),
    squadView: document.getElementById('squadView'),
    tacticsView: document.getElementById('tacticsView'),
    tacticsSubSegmentedControl: document.getElementById('tacticsSubSegmentedControl'),
    rolesSubview: document.getElementById('rolesSubview'),
    rolesFormationLabel: document.getElementById('rolesFormationLabel'),
    rolesManageTacticsBtn: document.getElementById('rolesManageTacticsBtn'),
    rolesPitch: document.getElementById('rolesPitch'),
    lineupsSubview: document.getElementById('lineupsSubview'),
    formationLabel: document.getElementById('formationLabel'),
    manageTacticsBtn: document.getElementById('manageTacticsBtn'),
    displayModeControl: document.getElementById('displayModeControl'),
    pitch: document.getElementById('pitch'),
    newLineupBtn: document.getElementById('newLineupBtn'),
    saveLineupBtn: document.getElementById('saveLineupBtn'),
    savedLineupsList: document.getElementById('savedLineupsList'),
    lineupsEmptyState: document.getElementById('lineupsEmptyState'),
    roleDetailBackdrop: document.getElementById('roleDetailBackdrop'),
    roleDetailSheet: document.getElementById('roleDetailSheet'),
    roleDetailCloseBtn: document.getElementById('roleDetailCloseBtn'),
    roleDetailSheetLabel: document.getElementById('roleDetailSheetLabel'),
    roleDetailName: document.getElementById('roleDetailName'),
    roleDetailFocus: document.getElementById('roleDetailFocus'),
    roleDetailPositionTag: document.getElementById('roleDetailPositionTag'),
    roleDetailAttributesSection: document.getElementById('roleDetailAttributesSection'),
    roleDetailAttributesTiers: document.getElementById('roleDetailAttributesTiers'),
    roleDetailPlaystylesSection: document.getElementById('roleDetailPlaystylesSection'),
    roleDetailPlaystyleTiers: document.getElementById('roleDetailPlaystyleTiers'),
    playerSelectorBackdrop: document.getElementById('playerSelectorBackdrop'),
    playerSelectorSheet: document.getElementById('playerSelectorSheet'),
    closePlayerSelectorBtn: document.getElementById('closePlayerSelectorBtn'),
    playerSelectorList: document.getElementById('playerSelectorList'),
    playerSelectorEmpty: document.getElementById('playerSelectorEmpty'),
    playerSelectorClearBtn: document.getElementById('playerSelectorClearBtn'),
    saveLineupBackdrop: document.getElementById('saveLineupBackdrop'),
    saveLineupDialog: document.getElementById('saveLineupDialog'),
    lineupNameInput: document.getElementById('lineupNameInput'),
    saveLineupCancelBtn: document.getElementById('saveLineupCancelBtn'),
    saveLineupConfirmBtn: document.getElementById('saveLineupConfirmBtn'),
    squadCount: document.getElementById('squadCount'),
    emptyState: document.getElementById('emptyState'),
    emptyStateText: document.getElementById('emptyStateText'),
    emptyStateClearBtn: document.getElementById('emptyStateClearBtn'),
    activeFilters: document.getElementById('activeFilters'),
    shortlistTotal: document.getElementById('shortlistTotal'),
    shortlistTotalValue: document.getElementById('shortlistTotalValue'),

    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    addPlayerBtn: document.getElementById('addPlayerBtn'),
    openFiltersBtn: document.getElementById('openFiltersBtn'),
    openBackupBtn: document.getElementById('openBackupBtn'),

    filtersBackdrop: document.getElementById('filtersBackdrop'),
    filtersSheet: document.getElementById('filtersSheet'),
    closeFiltersBtn: document.getElementById('closeFiltersBtn'),
    applyFiltersBtn: document.getElementById('applyFiltersBtn'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    sortChips: document.getElementById('sortChips'),
    sortDirectionBtn: document.getElementById('sortDirectionBtn'),
    sortDirectionLabel: document.getElementById('sortDirectionLabel'),
    positionChips: document.getElementById('positionChips'),
    priorityFilterSection: document.getElementById('priorityFilterSection'),
    priorityFilterChips: document.getElementById('priorityFilterChips'),
    roleFitChips: document.getElementById('roleFitChips'),
    roleChips: document.getElementById('roleChips'),

    formBackdrop: document.getElementById('formBackdrop'),
    formSheet: document.getElementById('formSheet'),
    formTitle: document.getElementById('formTitle'),
    playerForm: document.getElementById('playerForm'),
    fieldPosition: document.getElementById('fieldPosition'),
    fieldRole: document.getElementById('fieldRole'),
    fieldSquadSection: document.getElementById('fieldSquadSection'),
    fieldValueLabel: document.getElementById('fieldValueLabel'),
    playstylesChips: document.getElementById('playstylesChips'),
    playstylesPlusChips: document.getElementById('playstylesPlusChips'),
    formSaveBtn: document.getElementById('formSaveBtn'),
    formCancelBtn: document.getElementById('formCancelBtn'),
    importScreenshotBtn: document.getElementById('importScreenshotBtn'),
    calcPotentialBtn: document.getElementById('calcPotentialBtn'),

    detailBackdrop: document.getElementById('detailBackdrop'),
    detailSheet: document.getElementById('detailSheet'),
    detailName: document.getElementById('detailName'),
    detailPriorityHeart: document.getElementById('detailPriorityHeart'),
    detailMeta: document.getElementById('detailMeta'),
    detailOverall: document.getElementById('detailOverall'),
    detailPotential: document.getElementById('detailPotential'),
    detailPosition: document.getElementById('detailPosition'),
    detailRole: document.getElementById('detailRole'),
    detailValueRow: document.getElementById('detailValueRow'),
    detailValueLabel: document.getElementById('detailValueLabel'),
    detailValue: document.getElementById('detailValue'),
    detailStyles: document.getElementById('detailStyles'),
    detailStylesList: document.getElementById('detailStylesList'),
    detailStylesPlusRow: document.getElementById('detailStylesPlusRow'),
    detailStylesPlusList: document.getElementById('detailStylesPlusList'),
    detailNotes: document.getElementById('detailNotes'),
    detailMoveGroupBtn: document.getElementById('detailMoveGroupBtn'),
    detailSignPlayerBtn: document.getElementById('detailSignPlayerBtn'),

    confirmBackdrop: document.getElementById('confirmBackdrop'),
    confirmDialog: document.getElementById('confirmDialog'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmText: document.getElementById('confirmText'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

    infoBackdrop: document.getElementById('infoBackdrop'),
    infoDialog: document.getElementById('infoDialog'),
    infoTitle: document.getElementById('infoTitle'),
    infoText: document.getElementById('infoText'),

    backupBackdrop: document.getElementById('backupBackdrop'),
    backupSheet: document.getElementById('backupSheet'),
    closeBackupBtn: document.getElementById('closeBackupBtn'),
    lastBackupText: document.getElementById('lastBackupText'),
    exportBackupBtn: document.getElementById('exportBackupBtn'),
    importBackupBtn: document.getElementById('importBackupBtn'),
    importFileInput: document.getElementById('importFileInput'),

    importBackdrop: document.getElementById('importBackdrop'),
    importSheet: document.getElementById('importSheet'),
    closeImportBtn: document.getElementById('closeImportBtn'),
    importSummaryText: document.getElementById('importSummaryText'),
    importModeChips: document.getElementById('importModeChips'),
    importDuplicateSection: document.getElementById('importDuplicateSection'),
    importDuplicateText: document.getElementById('importDuplicateText'),
    importDuplicateChips: document.getElementById('importDuplicateChips'),
    importCancelBtn: document.getElementById('importCancelBtn'),
    importConfirmBtn: document.getElementById('importConfirmBtn'),

    screenshotBackdrop: document.getElementById('screenshotBackdrop'),
    screenshotSheet: document.getElementById('screenshotSheet'),
    closeScreenshotBtn: document.getElementById('closeScreenshotBtn'),
    screenshotAttributesInput: document.getElementById('screenshotAttributesInput'),
    screenshotFinancialInput: document.getElementById('screenshotFinancialInput'),
    screenshotAttributesName: document.getElementById('screenshotAttributesName'),
    screenshotFinancialName: document.getElementById('screenshotFinancialName'),
    screenshotStatus: document.getElementById('screenshotStatus'),
    screenshotError: document.getElementById('screenshotError'),
    screenshotCancelBtn: document.getElementById('screenshotCancelBtn'),
    screenshotExtractBtn: document.getElementById('screenshotExtractBtn'),

    toast: document.getElementById('toast'),
  };

  let toastTimer = null;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Renders a 0–3 "Role Fit" rating as Football-Manager-style stars —
   * full/half/empty — as real markup (a half star is two overlaid ★
   * glyphs, one clipped to 50% width) rather than text like "2.5", so
   * it renders identically everywhere regardless of font support for
   * any particular half-star character.
   *
   * `size` is an optional modifier ('badge' for the tiny pitch marker,
   * otherwise the default inline-tag size used on cards/detail pages).
   */
  function renderStars(rating, size) {
    const clamped = Math.max(0, Math.min(3, Number(rating) || 0));
    let stars = '';
    for (let i = 0; i < 3; i++) {
      const remaining = clamped - i;
      if (remaining >= 1) {
        stars += '<span class="star-rating__star is-full">★</span>';
      } else if (remaining >= 0.5) {
        stars += '<span class="star-rating__star is-half"><span class="star-rating__star-bg">★</span><span class="star-rating__star-fg">★</span></span>';
      } else {
        stars += '<span class="star-rating__star is-empty">★</span>';
      }
    }
    const sizeClass = size ? ` star-rating--${size}` : '';
    return `<span class="star-rating${sizeClass}" role="img" aria-label="${clamped} out of 3 stars">${stars}</span>`;
  }

  // ---------- Squad list ----------

  // ---------- Squad section switch (First Team / Academy / etc.) ----------

  function renderGroupSegmentedControl(groups, activeGroup, onSelect) {
    el.groupSegmentedControl.innerHTML = groups.map(g => `
      <button type="button" class="segmented-control__btn ${g.id === activeGroup ? 'is-active' : ''}"
        data-group="${escapeHtml(g.id)}" role="tab" aria-selected="${g.id === activeGroup}">${escapeHtml(g.label)}</button>
    `).join('');
    el.groupSegmentedControl.querySelectorAll('.segmented-control__btn').forEach(btn => {
      btn.addEventListener('click', () => onSelect(btn.dataset.group));
    });
  }

  /** Same idea as renderGroupSegmentedControl, for the top-level Squad/Lineups switch. */
  function renderWidgetSegmentedControl(items, activeId, onSelect, container) {
    const target = container || el.widgetSegmentedControl;
    target.innerHTML = items.map(it => `
      <button type="button" class="segmented-control__btn ${it.id === activeId ? 'is-active' : ''}"
        data-widget="${escapeHtml(it.id)}" role="tab" aria-selected="${it.id === activeId}">${escapeHtml(it.label)}</button>
    `).join('');
    target.querySelectorAll('.segmented-control__btn').forEach(btn => {
      btn.addEventListener('click', () => onSelect(btn.dataset.widget));
    });
  }

  function renderSquadList(players, totalCount, groupLabel) {
    el.squadCount.textContent = `${totalCount} player${totalCount === 1 ? '' : 's'}`;

    if (!players.length) {
      el.squadList.innerHTML = '';
      el.emptyState.hidden = false;
      el.emptyStateText.textContent = totalCount === 0
        ? (groupLabel ? `Add your first ${groupLabel} player to get started.` : 'Add your first player to get started.')
        : 'Try adjusting your search or filters.';
      el.emptyStateClearBtn.hidden = totalCount === 0;
      return;
    }

    el.emptyState.hidden = true;
    el.squadList.innerHTML = players.map(cardTemplate).join('');
  }

  function cardTemplate(p) {
    const roleFit = Lineups.calculateRoleFitStars(p, Lineups.getRoleData(p.role));
    const roleLabel = p.role ? escapeHtml(p.role) : 'No role set';
    const valueLabel = Players.formatValue(p.value);
    const isShortlist = p.playerGroup === 'shortlist';
    return `
      <div class="player-card" data-id="${p.id}" role="button" tabindex="0" aria-label="View ${escapeHtml(p.name)}">
        <div class="rating-plate">
          <span class="rating-plate__ovr">${p.overall}</span>
          <div class="rating-plate__pot-row">
            <span class="rating-plate__pot-small">→ ${p.potential}</span>
          </div>
        </div>
        <div class="player-card__info">
          <div class="player-card__name">${escapeHtml(p.name)}</div>
          <div class="player-card__row">
            <span class="tag tag--age">AGE ${p.age}</span>
            <span class="tag tag--position">${p.position}</span>
            <span class="tag tag--role">${roleLabel}</span>
            ${renderStars(roleFit)}
            ${valueLabel ? `<span class="tag tag--value">${valueLabel}</span>` : ''}
          </div>
        </div>
        ${isShortlist ? priorityHeartHtml(p) : ''}
        <svg class="player-card__chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>
    `;
  }

  const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

  /** The Priority heart toggle — reused identically on cards and the detail page. */
  function priorityHeartHtml(p) {
    const isPriority = !!p.priority;
    return `
      <button type="button" class="priority-heart ${isPriority ? 'is-priority' : ''}" data-id="${p.id}"
        aria-pressed="${isPriority}" aria-label="${isPriority ? 'Priority target — tap to remove' : 'Mark as priority target'}">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="${HEART_PATH}"></path></svg>
      </button>
    `;
  }

  // ---------- Active filter chips (main screen) ----------

  function renderActiveFilters(state, onRemove) {
    const chips = [];
    if (state.positions.length) {
      state.positions.forEach(pos => chips.push({ type: 'position', value: pos, label: escapeHtml(pos) }));
    }
    if (state.roles.length) {
      state.roles.forEach(role => chips.push({ type: 'role', value: role, label: escapeHtml(role) }));
    }
    if (state.roleFitRatings && state.roleFitRatings.length) {
      state.roleFitRatings.forEach(v => chips.push({ type: 'roleFit', value: v, label: renderStars(v) }));
    }

    if (!chips.length) {
      el.activeFilters.hidden = true;
      el.activeFilters.innerHTML = '';
      return;
    }

    el.activeFilters.hidden = false;
    el.activeFilters.innerHTML = chips.map(c => `
      <span class="active-filter-chip" data-type="${c.type}" data-value="${escapeHtml(String(c.value))}">
        ${c.label}
        <button aria-label="Remove filter">&times;</button>
      </span>
    `).join('');

    el.activeFilters.querySelectorAll('.active-filter-chip button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chip = e.target.closest('.active-filter-chip');
        const raw = chip.dataset.value;
        const value = chip.dataset.type === 'roleFit' ? parseFloat(raw) : raw;
        onRemove(chip.dataset.type, value);
      });
    });
  }

  // ---------- Generic chip groups (filters + multi-select form fields) ----------

  function renderChipGroup(container, options, activeValues, onToggle) {
    container.innerHTML = options.map(opt => `
      <button type="button" class="chip ${activeValues.includes(opt) ? 'is-active' : ''}" data-value="${escapeHtml(opt)}" aria-pressed="${activeValues.includes(opt)}">${escapeHtml(opt)}</button>
    `).join('');
    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => onToggle(chip.dataset.value));
    });
  }

  /** Same idea as renderChipGroup, but each chip shows the actual star
   *  icons for that rating instead of its plain number (e.g. "2.5"). */
  function renderRoleFitChips(container, values, activeValues, onToggle) {
    container.innerHTML = values.map(v => `
      <button type="button" class="chip chip--stars ${activeValues.includes(v) ? 'is-active' : ''}" data-value="${v}" aria-pressed="${activeValues.includes(v)}">${renderStars(v)}</button>
    `).join('');
    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => onToggle(parseFloat(chip.dataset.value)));
    });
  }

  function renderSortChips(container, sortFields, activeKey, onSelect) {
    container.innerHTML = sortFields.map(f => `
      <button type="button" class="chip ${f.key === activeKey ? 'is-active' : ''}" data-key="${f.key}">${f.label}</button>
    `).join('');
    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => onSelect(chip.dataset.key));
    });
  }

  function setSortDirectionUI(dir) {
    el.sortDirectionBtn.classList.toggle('is-desc', dir === 'desc');
    el.sortDirectionLabel.textContent = dir === 'desc' ? 'Descending' : 'Ascending';
  }

  /**
   * Single-select chip group: `items` is [{value, label}], only one is
   * ever active. Used for the import mode / duplicate-strategy choosers.
   */
  function renderRadioChips(container, items, activeValue, onSelect) {
    container.innerHTML = items.map(item => `
      <button type="button" class="chip ${item.value === activeValue ? 'is-active' : ''}" data-value="${escapeHtml(item.value)}" aria-pressed="${item.value === activeValue}">${escapeHtml(item.label)}</button>
    `).join('');
    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => onSelect(chip.dataset.value));
    });
  }

  // ---------- Sheets ----------

  function openSheet(backdrop, sheet) {
    backdrop.hidden = false;
    sheet.hidden = false;
    // force reflow so the transition runs
    void sheet.offsetHeight;
    backdrop.classList.add('is-visible');
    sheet.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet(backdrop, sheet) {
    backdrop.classList.remove('is-visible');
    sheet.classList.remove('is-visible');
    const done = () => {
      backdrop.hidden = true;
      sheet.hidden = true;
    };
    setTimeout(done, 260);
    document.body.style.overflow = '';
  }

  // ---------- Form ----------

  function populateSelect(select, options, includeBlank) {
    let html = '';
    if (includeBlank) {
      html += `<option value="">— None selected —</option>`;
    }
    html += options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
    select.innerHTML = html;
  }

  /**
   * Like populateSelect, but for options whose stored value differs from
   * its displayed label (e.g. Squad section: value "squad" / label
   * "First Team"). items is [{ value, label }, ...].
   */
  function populateSelectWithLabels(select, items) {
    select.innerHTML = items.map(item => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('');
  }

  /**
   * Ensures a select still contains the player's saved value even if it's
   * no longer part of the current option list (e.g. data saved by an
   * earlier version of the app). Prevents silently changing old data
   * when a player is opened for editing.
   */
  function ensureOptionPresent(select, value) {
    if (!value) return;
    const exists = Array.from(select.options).some(o => o.value === value);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = `${value} (legacy)`;
      select.appendChild(opt);
    }
  }

  /** Shows "Price" instead of "Value" while the Squad section is set to
   *  Shortlist — it's the same underlying field either way, just a
   *  different label for what the number means in that section. */
  function updateValueFieldLabel(groupId) {
    el.fieldValueLabel.textContent = groupId === 'shortlist' ? 'Price' : 'Value';
  }

  function fillForm(player) {
    const f = el.playerForm;
    f.name.value = player ? player.name : '';
    f.age.value = player ? player.age : '';
    f.overall.value = player ? player.overall : '';
    f.potential.value = player ? player.potential : '';
    f.value.value = (player && player.value !== null && player.value !== undefined) ? Players.formatValueForInput(player.value) : '';
    f.notes.value = player ? player.notes : '';

    f.position.value = player ? player.position : Players.POSITIONS[0];
    ensureOptionPresent(f.position, player ? player.position : '');

    f.squadSection.value = player ? player.playerGroup : Players.DEFAULT_GROUP;
    ensureOptionPresent(f.squadSection, player ? player.playerGroup : '');
    updateValueFieldLabel(f.squadSection.value);

    f.role.value = player ? (player.role || '') : '';
    ensureOptionPresent(f.role, player ? player.role : '');

    clearFormErrors();
  }

  function clearFormErrors() {
    ['name', 'age', 'overall', 'potential', 'value', 'squadSection'].forEach(key => {
      const input = el.playerForm[key];
      const errorEl = document.getElementById('error' + key.charAt(0).toUpperCase() + key.slice(1));
      if (input) input.closest('.field').classList.remove('has-error');
      if (errorEl) errorEl.hidden = true;
    });
  }

  function showFieldError(key) {
    const input = el.playerForm[key];
    const errorEl = document.getElementById('error' + key.charAt(0).toUpperCase() + key.slice(1));
    if (input) input.closest('.field').classList.add('has-error');
    if (errorEl) errorEl.hidden = false;
  }

  // ---------- Detail view ----------

  /**
   * Renders a player's PlayStyles as tags, colour-coded by tier for
   * `roleData` (whatever `Lineups.getRoleData(player.role)` returned —
   * pass null/undefined if the player has no role, which keeps every
   * tag in the plain neutral style).
   */
  /**
   * Renders a player's PlayStyles as tags. If the player has an
   * assigned role (`roleData` present), every tag gets one of exactly
   * three colours: green (S tier), orange (A tier), or red (not listed
   * for this role at all) — there's no neutral option once a role is
   * known. If the player has no role at all, every tag stays in the
   * plain neutral style instead, since there's nothing to rate against.
   */
  function tagListOrDash(list, roleData) {
    if (!list || !list.length) return '<span class="detail-view__dash">None recorded</span>';
    return list.map(s => {
      let tierClass = '';
      if (roleData) {
        const tier = Lineups.getPlaystyleTier(s, roleData);
        tierClass = tier === 'S' ? ' tag--playstyle-s' : tier === 'A' ? ' tag--playstyle-a' : ' tag--playstyle-unlisted';
      }
      return `<span class="tag tag--playstyle${tierClass}">${escapeHtml(s)}</span>`;
    }).join('');
  }

  function fillDetail(player) {
    el.detailName.textContent = player.name;
    el.detailPriorityHeart.innerHTML = player.playerGroup === 'shortlist' ? priorityHeartHtml(player) : '';
    el.detailMeta.textContent = `Age ${player.age} · ${player.position}`;
    el.detailOverall.textContent = player.overall;
    el.detailPotential.textContent = player.potential;
    el.detailPosition.textContent = player.position;
    el.detailRole.textContent = player.role || 'No role set';

    const formattedValue = Players.formatValue(player.value);
    el.detailValueLabel.textContent = player.playerGroup === 'shortlist' ? 'Price' : 'Value';
    if (formattedValue) {
      el.detailValueRow.hidden = false;
      el.detailValue.textContent = formattedValue;
    } else {
      el.detailValueRow.hidden = true;
    }

    const roleData = Lineups.getRoleData(player.role);
    const roleFit = Lineups.calculateRoleFitStars(player, roleData);
    el.detailStyles.innerHTML = renderStars(roleFit);
    el.detailStylesList.innerHTML = tagListOrDash(player.playstyles, roleData);

    if (player.playstylesPlus && player.playstylesPlus.length) {
      el.detailStylesPlusRow.hidden = false;
      el.detailStylesPlusList.innerHTML = tagListOrDash(player.playstylesPlus, roleData);
    } else {
      el.detailStylesPlusRow.hidden = true;
    }

    el.detailNotes.textContent = player.notes ? player.notes : 'No notes added.';

    if (player.playerGroup === 'shortlist') {
      // Shortlisted players get the dedicated "Sign Player" action
      // instead of the generic Move toggle (Sign Player also clears
      // the shortlist Price, which a generic move never should).
      el.detailMoveGroupBtn.hidden = true;
      el.detailSignPlayerBtn.hidden = false;
      return;
    }
    el.detailSignPlayerBtn.hidden = true;

    // Promote/Move action: moves the player into the next other configured
    // section. Moving into the default section (First Team) reads as a
    // "Promote"; moving into any other section reads as a "Move".
    const currentGroup = player.playerGroup;
    const targetGroup = Players.GROUPS.find(g => g.id !== currentGroup) || Players.GROUPS[0];
    if (targetGroup) {
      el.detailMoveGroupBtn.hidden = false;
      el.detailMoveGroupBtn.textContent = targetGroup.id === Players.DEFAULT_GROUP
        ? `Promote to ${targetGroup.label}`
        : `Move to ${targetGroup.label}`;
      el.detailMoveGroupBtn.dataset.targetGroup = targetGroup.id;
    } else {
      el.detailMoveGroupBtn.hidden = true;
    }
  }

  // ---------- Confirm dialog (generic: used for delete + discard-changes) ----------

  function openConfirm({ title, text, confirmLabel = 'Delete' } = {}) {
    el.confirmTitle.textContent = title || 'Are you sure?';
    el.confirmText.textContent = text || 'This can\u2019t be undone.';
    el.confirmDeleteBtn.textContent = confirmLabel;
    el.confirmBackdrop.hidden = false;
    el.confirmDialog.hidden = false;
    requestAnimationFrame(() => {
      el.confirmBackdrop.classList.add('is-visible');
    });
  }

  function closeConfirm() {
    el.confirmBackdrop.classList.remove('is-visible');
    el.confirmBackdrop.hidden = true;
    el.confirmDialog.hidden = true;
  }

  // ---------- Info dialog (single-button, e.g. screenshot-import placeholder) ----------

  function openInfo(title, text) {
    el.infoTitle.textContent = title;
    el.infoText.textContent = text;
    el.infoBackdrop.hidden = false;
    el.infoDialog.hidden = false;
    requestAnimationFrame(() => {
      el.infoBackdrop.classList.add('is-visible');
    });
  }

  function closeInfo() {
    el.infoBackdrop.classList.remove('is-visible');
    el.infoBackdrop.hidden = true;
    el.infoDialog.hidden = true;
  }

  // ---------- Role detail (tactical reference) ----------

  /**
   * Populates the full-screen Role Detail sheet. `data` is placeholder
   * content for now — see app.js's ROLE_DETAILS — but the shape (a
   * variable number of mandatory requirements, attribute tiers, and
   * PlayStyle tiers, each with a variable number of items) is exactly
   * what real tactical data will eventually look like, so nothing here
   * needs to change once that's added.
   */
  function renderRoleDetail(slot, data) {
    el.roleDetailSheetLabel.textContent = 'Role';
    el.roleDetailName.textContent = slot.role;
    el.roleDetailFocus.textContent = slot.focus;
    el.roleDetailPositionTag.textContent = slot.label;

    const keyAttributes = (data && data.keyAttributes) || [];
    el.roleDetailAttributesTiers.innerHTML = keyAttributes.length
      ? `<ol class="role-detail__list role-detail__list--ranked">${keyAttributes.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ol>`
      : `<p class="role-detail__empty">No key attributes listed yet.</p>`;

    // Only S and A tiers exist now — S is worth 1 star, A is worth 0.5,
    // and there's nothing else to render.
    const tiers = (data && data.playstyleTiers) || {};
    const tierBlocks = ['S', 'A']
      .filter(tier => tiers[tier] && tiers[tier].length)
      .map(tier => playstyleTierHtml(tier, `${tier} Tier`, tiers[tier]));
    el.roleDetailPlaystyleTiers.innerHTML = tierBlocks.length
      ? tierBlocks.join('')
      : `<p class="role-detail__empty">No PlayStyle tiers listed yet.</p>`;
  }

  function playstyleTierHtml(tierKey, label, items) {
    const badgeClass = ` playstyle-tier__badge--${tierKey.toLowerCase()}`;
    const listItems = items.map(s => `<li>${escapeHtml(s)}</li>`).join('');
    return `
      <div class="playstyle-tier">
        <div class="playstyle-tier__header">
          <span class="playstyle-tier__badge${badgeClass}">${escapeHtml(tierKey)}</span>
          <span class="playstyle-tier__label">${escapeHtml(label)}</span>
        </div>
        <ul class="role-detail__list">${listItems}</ul>
      </div>
    `;
  }

  // ---------- Toast ----------

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 2600);
  }

  // ---------- Data & Backup ----------

  function renderLastBackupText(isoDate) {
    if (!isoDate) {
      el.lastBackupText.textContent = 'No backup exported yet.';
      return;
    }
    const d = new Date(isoDate);
    el.lastBackupText.textContent = Number.isNaN(d.getTime())
      ? 'No backup exported yet.'
      : `Last backup exported: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return {
    el, escapeHtml, renderStars,
    renderGroupSegmentedControl, renderWidgetSegmentedControl,
    renderSquadList, renderActiveFilters,
    renderChipGroup, renderRoleFitChips, renderSortChips, renderRadioChips, setSortDirectionUI,
    openSheet, closeSheet,
    populateSelect, populateSelectWithLabels, ensureOptionPresent, fillForm, clearFormErrors, showFieldError,
    updateValueFieldLabel,
    fillDetail,
    openConfirm, closeConfirm,
    openInfo, closeInfo,
    renderLastBackupText,
    renderRoleDetail,
    showToast,
  };
})();
