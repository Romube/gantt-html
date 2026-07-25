
// ═══════════════════════════════════════════════════
// DATA MODEL & STATE
// ═══════════════════════════════════════════════════
let tasks = [];
let nextId = 1;
let selectedTaskId = null;
let dragState = null; // { taskId, startY, moved }
let currentZoom = 'days'; // 'days' | 'weeks' | 'months'
let currentTheme = 'dark'; // 'dark' | 'light'
let searchQuery = '';

// Color palettes for screen rendering (header) and SVG export
const THEMES = {
  dark: {
    bg:        '#0D1117',
    surface:   '#161B22',
    surface2:  '#1C2128',
    border:    '#30363D',
    text:      '#E6EDF3',
    text2:     '#8B949E',
    accent:    '#58A6FF',
    today:     '#FF6B6B',
    rowEven:   '#0D1117',
    rowOdd:    '#111820',
    rowSum:    '#1A1A2E',
    legendBg:  '#161B22',
  },
  light: {
    bg:        '#FFFFFF',
    surface:   '#F6F8FA',
    surface2:  '#EAEEF2',
    border:    '#D0D7DE',
    text:      '#1F2328',
    text2:     '#57606A',
    accent:    '#0969DA',
    today:     '#CF222E',
    rowEven:   '#FFFFFF',
    rowOdd:    '#F6F8FA',
    rowSum:    '#F3EEFF',
    legendBg:  '#F6F8FA',
  }
};

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('light', currentTheme === 'light');
  document.getElementById('theme-label').textContent = currentTheme === 'dark' ? 'Clair' : 'Sombre';
  render();
}
let editingTaskId = null;
let editingParentId = null;
let editingForcedType = null;

// Zoom config: px per day
const ZOOM_CONFIG = { days: 28, weeks: 10, months: 4, years: 1.5 };

function getPxPerDay() { return ZOOM_CONFIG[currentZoom]; }

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseDate(s) {
  if (!s) return null;
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y,m-1,d);
}

function formatDate(s) {
  if (!s) return '';
  const [y,m,d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function dateDiff(a, b) { // days between two date strings
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function minDate(a, b) { return a < b ? a : b; }
function maxDate(a, b) { return a > b ? a : b; }

function getTaskType(task) {
  if (task.type === 'summary') return 'summary';
  if (task.startDate === task.endDate) return 'milestone';
  return 'standard';
}

function getChildren(parentId) {
  return tasks.filter(t => t.parentId === parentId);
}

function getDescendants(id) {
  const result = [];
  const q = [id];
  const seen = new Set([id]); // garde-fou : un cycle parentId ferait boucler à l'infini
  while (q.length) {
    const cur = q.shift();
    const ch = tasks.filter(t => t.parentId === cur);
    ch.forEach(c => {
      if (seen.has(c.id)) return;
      seen.add(c.id);
      result.push(c.id);
      q.push(c.id);
    });
  }
  return result;
}

function recalcSummary(id) {
  const task = tasks.find(t => t.id === id);
  if (!task || task.type !== 'summary') return;
  const children = getChildren(id);
  if (children.length === 0) return;
  task.startDate = children.reduce((m,c) => minDate(m, c.startDate), children[0].startDate);
  task.endDate = children.reduce((m,c) => maxDate(m, c.endDate), children[0].endDate);
}

function recalcAllSummaries() {
  // bottom-up
  const order = [];
  const visit = (id) => {
    getChildren(id).forEach(c => visit(c.id));
    if (id !== null) order.push(id);
  };
  visit(null);
  order.forEach(id => recalcSummary(id));
}

// ═══════════════════════════════════════════════════
// VISIBLE ROWS (respects collapse)
// ═══════════════════════════════════════════════════
function getVisibleRows() {
  if (searchQuery) {
    // Find matching tasks and their ancestors
    const matchIds = new Set();
    tasks.forEach(t => {
      if (t.name.toLowerCase().includes(searchQuery)) {
        matchIds.add(t.id);
        let cur = t;
        const seen = new Set([t.id]); // garde-fou anti-cycle sur la remontée d'ancêtres
        while (cur.parentId !== null) {
          const parent = tasks.find(p => p.id === cur.parentId);
          if (!parent || seen.has(parent.id)) break;
          seen.add(parent.id);
          matchIds.add(parent.id);
          cur = parent;
        }
      }
    });
    const rows = [];
    const visit = (parentId, level) => {
      tasks.filter(t => t.parentId === parentId).sort((a,b) => a.order - b.order).forEach(t => {
        if (!matchIds.has(t.id)) return;
        rows.push({ task: t, level });
        if (t.type === 'summary' && !t.collapsed) visit(t.id, level + 1);
      });
    };
    visit(null, 0);
    return rows;
  }

  const rows = [];
  const visit = (parentId, level) => {
    const children = tasks.filter(t => t.parentId === parentId)
      .sort((a,b) => a.order - b.order);
    for (const t of children) {
      rows.push({ task: t, level });
      if (t.type === 'summary' && !t.collapsed) {
        visit(t.id, level + 1);
      }
    }
  };
  visit(null, 0);
  return rows;
}

// ─── SEARCH HANDLERS ───
function onSearch(val) {
  searchQuery = val.trim().toLowerCase();
  const clearBtn = document.getElementById('search-clear');
  clearBtn.classList.toggle('visible', searchQuery.length > 0);
  render();
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  searchQuery = '';
  document.getElementById('search-clear').classList.remove('visible');
  document.getElementById('search-count').textContent = '';
  render();
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ═══════════════════════════════════════════════════
// PROJECT DATE RANGE
// ═══════════════════════════════════════════════════
function getProjectRange() {
  const visible = tasks.filter(t => t.startDate && t.endDate);
  if (!visible.length) {
    const t = today();
    return { start: addDays(t, -7), end: addDays(t, 23) };
  }
  let start = visible.reduce((m,t) => minDate(m, t.startDate), visible[0].startDate);
  let end = visible.reduce((m,t) => maxDate(m, t.endDate), visible[0].endDate);
  const pad = Math.max(5, Math.round(dateDiff(start, end) * 0.1));
  return { start: addDays(start, -pad), end: addDays(end, pad) };
}

// ═══════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════
function render() {
  recalcAllSummaries();
  renderTaskList();
  renderGantt();
  updateStatusBar();
  saveToLocalStorage();
}

// ─── TASK LIST ───
function renderTaskList() {
  const body = document.getElementById('task-list-body');
  const empty = document.getElementById('empty-state');
  const rows = getVisibleRows();

  // Update search count badge
  if (searchQuery) {
    const matched = tasks.filter(t => t.name.toLowerCase().includes(searchQuery)).length;
    document.getElementById('search-count').textContent = `${matched}`;
  } else {
    document.getElementById('search-count').textContent = '';
  }

  if (tasks.length === 0) {
    body.innerHTML = '';
    body.appendChild(empty);
    empty.classList.add('visible');
    return;
  }
  empty.classList.remove('visible');

  // Keep empty state in DOM
  body.innerHTML = '';
  body.appendChild(empty);

  rows.forEach(({ task, level }) => {
    const type = getTaskType(task);
    const isSummary = type === 'summary';
    const isMilestone = type === 'milestone';

    const row = document.createElement('div');
    row.className = 'task-row' + (isSummary ? ' summary-row' : '') + (task.id === selectedTaskId ? ' selected' : '');
    row.dataset.id = task.id;
    row.style.paddingLeft = (8 + level * 20) + 'px';
    row.onclick = (e) => {
      if (e.target.closest('button')) return;
      selectedTaskId = task.id;
      render();
    };
    row.ondblclick = (e) => {
      if (e.target.closest('button')) return;
      openModal(null, task.id);
    };

    // Name cell
    const nameCell = document.createElement('div');
    nameCell.className = 'task-name-cell';

    if (isSummary) {
      const colBtn = document.createElement('button');
      colBtn.className = 'collapse-btn' + (task.collapsed ? ' collapsed' : '');
      colBtn.innerHTML = '<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 2l3 4 3-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      colBtn.title = task.collapsed ? 'Développer' : 'Réduire';
      colBtn.onclick = (e) => { e.stopPropagation(); task.collapsed = !task.collapsed; render(); };
      nameCell.appendChild(colBtn);
    } else {
      const spacer = document.createElement('span');
      spacer.style.width = '20px';
      spacer.style.flexShrink = '0';
      nameCell.appendChild(spacer);
    }

    // Type icon
    const icon = document.createElement('span');
    icon.className = 'type-icon';
    if (isMilestone) icon.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="2" y="2" width="6" height="6" fill="var(--milestone)" transform="rotate(45 5 5)"/></svg>';
    else if (isSummary) icon.innerHTML = '<svg width="12" height="10" viewBox="0 0 12 10" fill="none"><rect x="0" y="2" width="12" height="4" rx="2" fill="var(--summary)" opacity=".7"/></svg>';
    else icon.innerHTML = '<svg width="12" height="8" viewBox="0 0 12 8" fill="none"><rect x="0" y="0" width="12" height="8" rx="2" fill="var(--accent)" opacity=".7"/></svg>';
    nameCell.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'task-label' + (isSummary ? ' summary' : isMilestone ? ' milestone' : '');
    label.title = task.name;
    if (searchQuery && task.name.toLowerCase().includes(searchQuery)) {
      const idx = task.name.toLowerCase().indexOf(searchQuery);
      const before = escapeHtml(task.name.substring(0, idx));
      const match = escapeHtml(task.name.substring(idx, idx + searchQuery.length));
      const after = escapeHtml(task.name.substring(idx + searchQuery.length));
      label.innerHTML = `${before}<mark>${match}</mark>${after}`;
    } else {
      label.textContent = task.name;
    }
    nameCell.appendChild(label);

    // Drag grip handle
    const grip = document.createElement('div');
    grip.className = 'drag-grip';
    grip.innerHTML = '<svg width="10" height="14" viewBox="0 0 10 14" fill="none"><circle cx="3" cy="3" r="1.2" fill="currentColor"/><circle cx="7" cy="3" r="1.2" fill="currentColor"/><circle cx="3" cy="7" r="1.2" fill="currentColor"/><circle cx="7" cy="7" r="1.2" fill="currentColor"/><circle cx="3" cy="11" r="1.2" fill="currentColor"/><circle cx="7" cy="11" r="1.2" fill="currentColor"/></svg>';
    grip.title = 'Glisser pour déplacer';
    grip.addEventListener('mousedown', (e) => { e.stopPropagation(); startRowDrag(e, task.id); });
    // Insert grip at the very start of nameCell
    nameCell.insertBefore(grip, nameCell.firstChild);

    row.appendChild(nameCell);

    // Dates — inline editable
    const startCell = makeInlineDateCell(task, 'start', isMilestone);
    row.appendChild(startCell);

    const endCell = makeInlineDateCell(task, 'end', isMilestone);
    row.appendChild(endCell);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'act-btn';
    editBtn.title = 'Modifier';
    editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 9.5l1.5-1.5 6-6 1.5 1.5-6 6L2 9.5z" stroke="currentColor" stroke-width="1.2"/><path d="M8 2.5l1.5 1.5" stroke="currentColor" stroke-width="1.2"/></svg>';
    editBtn.onclick = (e) => { e.stopPropagation(); openModal(null, task.id); };
    actions.appendChild(editBtn);

    if (isSummary || type !== 'milestone') {
      const addSubBtn = document.createElement('button');
      addSubBtn.className = 'act-btn';
      addSubBtn.title = 'Ajouter une sous-tâche';
      addSubBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="2" x2="6" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      addSubBtn.onclick = (e) => { e.stopPropagation(); openModal('standard', null, task.id); };
      actions.appendChild(addSubBtn);
    }

    const nestBtn = document.createElement('button');
    nestBtn.className = 'act-btn';
    nestBtn.title = 'Nester dans une autre tâche…';
    nestBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2h4v2H2z" fill="currentColor" opacity=".4"/><path d="M5 6h5v2H5z" fill="currentColor" opacity=".7"/><path d="M2 4l3 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
    nestBtn.onclick = (e) => { e.stopPropagation(); openNestModal(task.id); };
    actions.appendChild(nestBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'act-btn danger';
    delBtn.title = 'Supprimer';
    delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M3 3l.5 7h5L9 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    delBtn.onclick = (e) => { e.stopPropagation(); confirmDelete(task.id); };
    actions.appendChild(delBtn);

    row.appendChild(actions);
    body.appendChild(row);
  });
}

// ─── INLINE DATE EDITING ───
function makeInlineDateCell(task, field, isMilestone) {
  const cell = document.createElement('div');
  cell.className = 'task-date';
  cell.style.textAlign = 'center';

  function showLabel() {
    cell.classList.remove('editing');
    if (field === 'end' && isMilestone) {
      cell.textContent = '—';
      return;
    }
    cell.textContent = formatDate(field === 'start' ? task.startDate : task.endDate);
  }

  function activateInput(e) {
    e.stopPropagation();
    if (field === 'end' && isMilestone) return; // jalons : fin non éditable
    cell.classList.add('editing');
    cell.textContent = '';

    const input = document.createElement('input');
    input.type = 'date';
    input.className = 'inline-date-input';
    input.value = field === 'start' ? task.startDate : task.endDate;
    cell.appendChild(input);

    // Ouvrir le picker natif immédiatement
    setTimeout(() => { input.focus(); }, 30);

    function commit() {
      const val = input.value;
      if (!val) { showLabel(); return; }

      // Validation : fin >= début
      if (field === 'start') {
        if (val > task.endDate) {
          // Décaler la fin du même écart
          const diff = dateDiff(task.startDate, task.endDate);
          task.startDate = val;
          task.endDate = addDays(val, diff);
        } else {
          task.startDate = val;
        }
      } else {
        if (val < task.startDate) {
          input.style.borderColor = 'var(--danger)';
          input.title = 'La date de fin ne peut pas être antérieure au début';
          setTimeout(() => { input.style.borderColor = ''; input.title = ''; }, 1500);
          return;
        }
        task.endDate = val;
      }
      render();
    }

    let cancelled = false;
    let committed = false;

    // 'change' se déclenche uniquement quand les 3 segments
    // (jour, mois, année) sont entièrement saisis — jamais en cours de frappe.
    input.addEventListener('change', () => {
      if (!cancelled && !committed) {
        committed = true;
        commit();
      }
    });

    // 'blur' en secours : le picker natif peut voler le focus brièvement,
    // on attend 200 ms pour vérifier que le focus ne revient pas.
    input.addEventListener('blur', () => {
      if (committed) return;
      setTimeout(() => {
        if (document.activeElement === input) return; // focus revenu
        if (!cancelled) { if (!committed) { committed = true; commit(); } }
        else showLabel();
      }, 200);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); if (!committed) { committed = true; commit(); } }
      if (e.key === 'Escape') { e.preventDefault(); cancelled = true; showLabel(); }
    });
  }

  showLabel();
  cell.addEventListener('click', activateInput);
  return cell;
}

// ─── GANTT ───
let ganttScrollLeft = 0;

function renderGantt() {
  const range = getProjectRange();
  const pxDay = getPxPerDay();
  const totalDays = dateDiff(range.start, range.end) + 1;
  const totalW = totalDays * pxDay;
  const rows = getVisibleRows();
  const totalH = rows.length * parseInt(getComputedStyle(document.documentElement).getPropertyValue('--row-h'));

  // Header
  renderGanttHeader(range, totalW, pxDay);

  // Canvas
  const canvas = document.getElementById('gantt-canvas');
  canvas.style.width = totalW + 'px';
  canvas.style.height = totalH + 'px';
  canvas.innerHTML = '';

  // Grid lines
  renderGridLines(canvas, range, totalW, totalH, pxDay);

  // Today line
  const todayStr = today();
  if (todayStr >= range.start && todayStr <= range.end) {
    const x = dateDiff(range.start, todayStr) * pxDay;
    const line = document.createElement('div');
    line.className = 'today-line';
    line.style.cssText = `left:${x}px;height:${totalH}px;`;
    canvas.appendChild(line);
  }

  // Row backgrounds
  rows.forEach(({ task }, i) => {
    const bg = document.createElement('div');
    bg.className = 'gantt-row-bg ' + (task.type === 'summary' ? 'summary' : i % 2 === 0 ? 'even' : 'odd');
    bg.style.top = (i * parseInt(getComputedStyle(document.documentElement).getPropertyValue('--row-h'))) + 'px';
    canvas.appendChild(bg);
  });

  // Bars & milestones
  const rowH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--row-h'));
  const barH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bar-h'));

  rows.forEach(({ task }, i) => {
    if (!task.startDate || !task.endDate) return;
    const type = getTaskType(task);
    const top = i * rowH;
    const x = dateDiff(range.start, task.startDate) * pxDay;

    if (type === 'milestone') {
      const size = 14;
      const diamond = document.createElement('div');
      diamond.className = 'milestone-diamond';
      diamond.style.cssText = `left:${x - size/2}px;top:${top + rowH/2 - size/2}px;width:${size}px;height:${size}px;`;
      diamond.title = `${task.name}\n${formatDate(task.startDate)}`;
      diamond.dataset.id = task.id;
      addTooltipHandlers(diamond, buildTooltip(task));
      diamond.onclick = () => { selectedTaskId = task.id; renderTaskList(); };
      diamond.ondblclick = () => openModal(null, task.id);
      canvas.appendChild(diamond);

      const lbl = document.createElement('div');
      lbl.className = 'milestone-label';
      lbl.style.cssText = `left:${x + size/2 + 6}px;top:${top + rowH/2 - 8}px;`;
      lbl.textContent = task.name;
      canvas.appendChild(lbl);

    } else {
      const dur = dateDiff(task.startDate, task.endDate) + 1;
      const w = Math.max(4, dur * pxDay - 2);
      const isSummary = type === 'summary';

      const wrapper = document.createElement('div');
      wrapper.className = 'gantt-bar-wrapper';
      wrapper.style.cssText = `left:${x}px;top:${top + (rowH - barH)/2}px;width:${w}px;height:${barH}px;`;
      wrapper.dataset.id = task.id;

      const bar = document.createElement('div');
      bar.className = 'gantt-bar ' + (isSummary ? 'summary-bar' : 'standard');
      bar.style.width = '100%';
      bar.style.height = '100%';
      bar.dataset.id = task.id;

      if (!isSummary) {
        bar.innerHTML = `<div class="bar-label">${task.name}</div><div class="drag-handle-left"></div><div class="drag-handle-right"></div>`;
        makeDraggable(bar, task, range, pxDay);
      } else {
        bar.innerHTML = `<div class="bar-label">${task.name}</div><div class="summary-cap-left"></div><div class="summary-cap-right"></div>`;
      }

      addTooltipHandlers(bar, buildTooltip(task));
      bar.onclick = (e) => {
        if (e.target.classList.contains('drag-handle-left') || e.target.classList.contains('drag-handle-right')) return;
        selectedTaskId = task.id;
        renderTaskList();
      };
      bar.ondblclick = () => openModal(null, task.id);

      wrapper.appendChild(bar);
      canvas.appendChild(wrapper);

      // Label outside if bar too narrow
      if (w < task.name.length * 7 + 12) {
        const lbl = document.createElement('div');
        lbl.className = 'bar-label-outside';
        lbl.style.top = '50%';
        lbl.style.transform = 'translateY(-50%)';
        lbl.textContent = task.name;
        wrapper.appendChild(lbl);
      }
    }
  });

  // Sync horizontal scroll
  const ganttBody = document.getElementById('gantt-body');
  syncGanttHeaderScroll(ganttBody.scrollLeft);
}

function renderGanttHeader(range, totalW, pxDay) {
  const svg = document.getElementById('gantt-header-svg');
  const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'));
  svg.setAttribute('width', totalW);
  svg.setAttribute('height', headerH);

  const totalDays = dateDiff(range.start, range.end) + 1;
  let html = '';
  const rowH = headerH / 2;

  // Colors — theme-aware
  const T = THEMES[currentTheme];
  const bg1 = T.surface2; const bg2 = T.surface;
  const textCol = T.text2; const textBold = T.text;
  const borderCol = T.border;
  const accent = T.accent;

  // Background
  html += `<rect width="${totalW}" height="${headerH}" fill="${bg1}"/>`;
  html += `<rect y="${rowH}" width="${totalW}" height="${rowH}" fill="${bg2}"/>`;

  const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const MONTHS_FULL_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  if (currentZoom === 'days') {
    // Top: months
    let curMonth = -1, monthStart = 0, curMonthYear = 0;
    for (let i = 0; i <= totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const m = d.getMonth(); const y = d.getFullYear();
      if (m !== curMonth || i === totalDays) {
        if (curMonth !== -1) {
          const w = i * pxDay - monthStart;
          html += `<rect x="${monthStart}" y="0" width="${w}" height="${rowH}" fill="none"/>`;
          html += `<text x="${monthStart + w/2}" y="${rowH/2 + 5}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="11" font-weight="600" fill="${textBold}">${MONTHS_FULL_FR[curMonth]} ${curMonthYear}</text>`;
          html += `<line x1="${i * pxDay}" y1="0" x2="${i * pxDay}" y2="${rowH}" stroke="${borderCol}" stroke-width="1"/>`;
        }
        curMonth = m; curMonthYear = y; monthStart = i * pxDay;
      }
    }
    // Bottom: day numbers
    for (let i = 0; i < totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const day = d.getDate(); const dow = d.getDay();
      const x = i * pxDay;
      const isWeekend = dow === 0 || dow === 6;
      if (isWeekend) html += `<rect x="${x}" y="${rowH}" width="${pxDay}" height="${rowH}" fill="rgba(255,255,255,0.03)"/>`;
      const isToday = addDays(range.start, i) === today();
      if (isToday) html += `<rect x="${x}" y="${rowH}" width="${pxDay}" height="${rowH}" fill="rgba(255,107,107,0.15)"/>`;
      if (pxDay >= 16) {
        html += `<text x="${x + pxDay/2}" y="${rowH + rowH/2 + 5}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="${isToday ? '#FF6B6B' : isWeekend ? textCol : textCol}">${day}</text>`;
      }
      html += `<line x1="${x}" y1="${rowH}" x2="${x}" y2="${headerH}" stroke="${borderCol}" stroke-width="${pxDay >= 20 ? '1' : '0.5'}"/>`;
    }

  } else if (currentZoom === 'weeks') {
    // Top: months
    let curMonth = -1, monthStart = 0, curMonthYear = 0;
    for (let i = 0; i <= totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const m = d.getMonth(); const y = d.getFullYear();
      if (m !== curMonth || i === totalDays) {
        if (curMonth !== -1) {
          const w = i * pxDay - monthStart;
          html += `<text x="${monthStart + w/2}" y="${rowH/2 + 5}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="11" font-weight="600" fill="${textBold}">${MONTHS_FULL_FR[curMonth]} ${curMonthYear}</text>`;
          html += `<line x1="${i * pxDay}" y1="0" x2="${i * pxDay}" y2="${rowH}" stroke="${borderCol}" stroke-width="1"/>`;
        }
        curMonth = m; curMonthYear = y; monthStart = i * pxDay;
      }
    }
    // Bottom: week numbers
    let prevWeek = -1;
    for (let i = 0; i < totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const week = getISOWeek(d);
      const x = i * pxDay;
      if (week !== prevWeek) {
        html += `<text x="${x + 2}" y="${rowH + rowH/2 + 5}" font-family="JetBrains Mono,monospace" font-size="10" fill="${textCol}">S${week}</text>`;
        html += `<line x1="${x}" y1="${rowH}" x2="${x}" y2="${headerH}" stroke="${borderCol}" stroke-width="1"/>`;
        prevWeek = week;
      }
    }

  } else if (currentZoom === 'years') {
    // Top: years — one block per year
    let curYear = -1, yearStartX = 0;
    for (let i = 0; i <= totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const y = d.getFullYear();
      if (y !== curYear || i === totalDays) {
        if (curYear !== -1) {
          const w = i * pxDay - yearStartX;
          html += `<text x="${yearStartX + w/2}" y="${rowH/2 + 5}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="12" font-weight="700" fill="${textBold}">${curYear}</text>`;
          html += `<line x1="${i * pxDay}" y1="0" x2="${i * pxDay}" y2="${rowH}" stroke="${borderCol}" stroke-width="1.5"/>`;
        }
        curYear = y; yearStartX = i * pxDay;
      }
    }
    // Bottom: quarters T1–T4
    const QUARTERS = ['T1','T2','T3','T4'];
    const QUARTER_MONTHS = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
    let prevQ = -1;
    for (let i = 0; i < totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const q = Math.floor(d.getMonth() / 3);
      const x = i * pxDay;
      if (q !== prevQ) {
        html += `<line x1="${x}" y1="${rowH}" x2="${x}" y2="${headerH}" stroke="${borderCol}" stroke-width="1"/>`;
        // Find width of this quarter to center the label
        let qEnd = i;
        while (qEnd < totalDays) {
          const dd = parseDate(addDays(range.start, qEnd));
          if (Math.floor(dd.getMonth() / 3) !== q || dd.getFullYear() !== d.getFullYear()) break;
          qEnd++;
        }
        const qW = (qEnd - i) * pxDay;
        if (qW > 18) {
          html += `<text x="${x + qW/2}" y="${rowH + rowH/2 + 5}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" font-weight="500" fill="${accent}">${QUARTERS[q]}</text>`;
        }
        prevQ = q;
      }
    }

  } else { // months
    // Top: years
    let curYear = -1, yearStart = 0;
    for (let i = 0; i <= totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const y = d.getFullYear();
      if (y !== curYear || i === totalDays) {
        if (curYear !== -1) {
          const w = i * pxDay - yearStart;
          html += `<text x="${yearStart + w/2}" y="${rowH/2 + 5}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="11" font-weight="600" fill="${textBold}">${curYear}</text>`;
          html += `<line x1="${i * pxDay}" y1="0" x2="${i * pxDay}" y2="${rowH}" stroke="${borderCol}" stroke-width="1"/>`;
        }
        curYear = y; yearStart = i * pxDay;
      }
    }
    // Bottom: months
    let curMonth = -1, monthStart = 0;
    for (let i = 0; i <= totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const m = d.getMonth();
      if (m !== curMonth || i === totalDays) {
        if (curMonth !== -1) {
          const w = i * pxDay - monthStart;
          html += `<text x="${monthStart + w/2}" y="${rowH + rowH/2 + 5}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="${textCol}">${MONTHS_FR[curMonth]}</text>`;
          html += `<line x1="${i * pxDay}" y1="${rowH}" x2="${i * pxDay}" y2="${headerH}" stroke="${borderCol}" stroke-width="1"/>`;
        }
        curMonth = m; monthStart = i * pxDay;
      }
    }
  }

  // Bottom border
  html += `<line x1="0" y1="${headerH - 1}" x2="${totalW}" y2="${headerH - 1}" stroke="${borderCol}" stroke-width="1"/>`;
  html += `<line x1="0" y1="${rowH}" x2="${totalW}" y2="${rowH}" stroke="${borderCol}" stroke-width="1"/>`;

  svg.innerHTML = html;
}

function renderGridLines(canvas, range, totalW, totalH, pxDay) {
  const totalDays = dateDiff(range.start, range.end) + 1;
  if (currentZoom === 'days') {
    for (let i = 0; i < totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const dow = d.getDay();
      if (dow === 1 || pxDay >= 20) {
        const line = document.createElement('div');
        line.className = 'grid-line';
        line.style.cssText = `left:${i * pxDay}px;height:${totalH}px;`;
        if (dow === 1) line.style.opacity = '0.4';
        canvas.appendChild(line);
      }
    }
  } else if (currentZoom === 'weeks') {
    for (let i = 0; i < totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      if (d.getDay() === 1) {
        const line = document.createElement('div');
        line.className = 'grid-line';
        line.style.cssText = `left:${i * pxDay}px;height:${totalH}px;`;
        canvas.appendChild(line);
      }
    }
  } else if (currentZoom === 'years') {
    // One grid line per quarter start
    let prevQ = -1, prevYear = -1;
    for (let i = 0; i < totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const q = Math.floor(d.getMonth() / 3);
      const y = d.getFullYear();
      if (q !== prevQ || y !== prevYear) {
        const line = document.createElement('div');
        line.className = 'grid-line';
        line.style.cssText = `left:${i * pxDay}px;height:${totalH}px;opacity:${q === 0 ? '0.7' : '0.35'};`;
        canvas.appendChild(line);
        prevQ = q; prevYear = y;
      }
    }
  } else {
    // months: one line per month start
    for (let i = 0; i < totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      if (d.getDate() === 1) {
        const line = document.createElement('div');
        line.className = 'grid-line';
        line.style.cssText = `left:${i * pxDay}px;height:${totalH}px;`;
        canvas.appendChild(line);
      }
    }
  }
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ─── SCROLL SYNC ───
(function setupScrollSync() {
  const listBody = document.getElementById('task-list-body');
  const ganttBody = document.getElementById('gantt-body');
  let syncingFromList = false, syncingFromGantt = false;

  listBody.addEventListener('scroll', () => {
    if (syncingFromGantt) return;
    syncingFromList = true;
    ganttBody.scrollTop = listBody.scrollTop;
    syncingFromList = false;
  });
  ganttBody.addEventListener('scroll', () => {
    if (syncingFromList) return;
    syncingFromGantt = true;
    listBody.scrollTop = ganttBody.scrollTop;
    syncGanttHeaderScroll(ganttBody.scrollLeft);
    syncingFromGantt = false;
  });
})();

function syncGanttHeaderScroll(scrollLeft) {
  const header = document.getElementById('gantt-header');
  const svg = document.getElementById('gantt-header-svg');
  svg.style.transform = `translateX(-${scrollLeft}px)`;
}

// ─── SPLITTER ───
(function setupSplitter() {
  const splitter = document.getElementById('splitter');
  const leftPanel = document.getElementById('left-panel');
  let dragging = false, startX = 0, startW = 0;

  splitter.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.clientX;
    startW = leftPanel.offsetWidth;
    splitter.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const newW = Math.max(220, Math.min(window.innerWidth * 0.7, startW + e.clientX - startX));
    leftPanel.style.width = newW + 'px';
    document.documentElement.style.setProperty('--list-w', newW + 'px');
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    splitter.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
})();

// ─── TOOLTIP ───
const tooltipEl = document.getElementById('tooltip');
function addTooltipHandlers(el, html) {
  el.addEventListener('mouseenter', (e) => {
    tooltipEl.innerHTML = html;
    tooltipEl.classList.add('visible');
    moveTooltip(e);
  });
  el.addEventListener('mousemove', moveTooltip);
  el.addEventListener('mouseleave', () => tooltipEl.classList.remove('visible'));
}
function moveTooltip(e) {
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + 250 > window.innerWidth) x = e.clientX - 260;
  if (y + 80 > window.innerHeight) y = e.clientY - 80;
  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top = y + 'px';
}
function buildTooltip(task) {
  const type = getTaskType(task);
  const dur = type === 'milestone' ? 0 : dateDiff(task.startDate, task.endDate) + 1;
  let html = `<strong style="color:var(--text)">${task.name}</strong><br>`;
  if (type === 'summary') html += `<span style="color:var(--summary)">Tâche récapitulative</span><br>`;
  if (type === 'milestone') html += `<span style="color:var(--milestone)">Jalon</span><br>`;
  html += `<span style="color:var(--text2)">Début : ${formatDate(task.startDate)}</span><br>`;
  if (type !== 'milestone') html += `<span style="color:var(--text2)">Fin : ${formatDate(task.endDate)}</span><br>`;
  if (type !== 'milestone') html += `<span style="color:var(--text3)">Durée : ${dur} jour${dur > 1 ? 's' : ''}</span>`;
  if (task.description) html += `<br><span style="color:var(--text3);font-size:11px">${task.description.substring(0,100)}${task.description.length > 100 ? '…' : ''}</span>`;
  return html;
}

// ─── DRAG TO MOVE/RESIZE BARS ───
function makeDraggable(bar, task, range, pxDay) {
  bar.addEventListener('mousedown', (e) => {
    const isLeft = e.target.classList.contains('drag-handle-left');
    const isRight = e.target.classList.contains('drag-handle-right');
    const isMove = !isLeft && !isRight;
    if (e.target.classList.contains('drag-handle-left') || e.target.classList.contains('drag-handle-right')) {
      // resize
    }
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const origStart = task.startDate;
    const origEnd = task.endDate;
    document.body.style.cursor = isMove ? 'grabbing' : 'ew-resize';

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const days = Math.round(dx / pxDay);
      if (days === 0) return;
      if (isMove) {
        task.startDate = addDays(origStart, days);
        task.endDate = addDays(origEnd, days);
      } else if (isLeft) {
        const newStart = addDays(origStart, days);
        if (newStart <= origEnd) task.startDate = newStart;
      } else if (isRight) {
        const newEnd = addDays(origEnd, days);
        if (newEnd >= origStart) task.endDate = newEnd;
      }
      render();
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ─── STATUS BAR ───
function updateStatusBar() {
  const count = tasks.length;
  const milestones = tasks.filter(t => getTaskType(t) === 'milestone').length;
  document.getElementById('sb-count').textContent = count;
  document.getElementById('sb-milestones').textContent = milestones;

  if (count > 0) {
    const range = getProjectRange();
    const dur = dateDiff(range.start, range.end);
    document.getElementById('sb-duration').textContent = dur + ' jours';
  } else {
    document.getElementById('sb-duration').textContent = '—';
  }
}

// ═══════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════
function openModal(forcedType, editId = null, parentId = null) {
  editingTaskId = editId;
  editingParentId = parentId;
  editingForcedType = forcedType;

  const modal = document.getElementById('modal');
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');

  if (editId !== null) {
    const task = tasks.find(t => t.id === editId);
    if (!task) return;
    document.getElementById('f-name').value = task.name;
    document.getElementById('f-desc').value = task.description || '';
    document.getElementById('f-start').value = task.startDate;
    document.getElementById('f-end').value = task.endDate;
    const type = getTaskType(task);
    titleEl.textContent = type === 'milestone' ? 'Modifier le jalon' : type === 'summary' ? 'Modifier la tâche récapitulative' : 'Modifier la tâche';
    document.getElementById('f-start').disabled = false;
    document.getElementById('f-end').disabled = false;

    const demoteGroup = document.getElementById('demote-summary-group');
    const demoteCheckbox = document.getElementById('f-demote-summary');
    const isEmptySummary = type === 'summary' && getChildren(editId).length === 0;
    demoteGroup.style.display = isEmptySummary ? 'block' : 'none';
    demoteCheckbox.checked = false;

    const promoteGroup = document.getElementById('promote-summary-group');
    const promoteCheckbox = document.getElementById('f-promote-summary');
    promoteGroup.style.display = type !== 'summary' ? 'block' : 'none';
    promoteCheckbox.checked = false;
  } else {
    const t = today();
    document.getElementById('f-name').value = '';
    document.getElementById('f-desc').value = '';
    document.getElementById('f-start').value = forcedType === 'milestone' ? t : t;
    document.getElementById('f-end').value = forcedType === 'milestone' ? t : addDays(t, 7);
    document.getElementById('f-start').disabled = false;
    document.getElementById('f-end').disabled = false;
    titleEl.textContent = forcedType === 'milestone' ? 'Nouveau jalon' : forcedType === 'summary' ? 'Nouvelle tâche récapitulative' : 'Nouvelle tâche';
    document.getElementById('demote-summary-group').style.display = 'none';
    document.getElementById('promote-summary-group').style.display = 'none';
  }

  updateTypeBadge();
  overlay.classList.add('open');
  setTimeout(() => document.getElementById('f-name').focus(), 100);
}

function updateTypeBadge() {
  const start = document.getElementById('f-start').value;
  const end = document.getElementById('f-end').value;
  const ind = document.getElementById('type-indicator');
  if (!start || !end) { ind.innerHTML = ''; return; }

  let type = editingForcedType;
  if (!type) {
    type = (start === end) ? 'milestone' : 'standard';
  }
  const labels = { standard: 'Tâche standard', milestone: 'Jalon', summary: 'Tâche récapitulative' };
  const dur = start === end ? 0 : dateDiff(start, end) + 1;
  const durText = type !== 'milestone' ? ` — ${dur} jour${dur > 1 ? 's' : ''}` : '';
  ind.innerHTML = `<span class="form-badge badge-${type === 'summary' ? 'summary' : type}">${labels[type]}${durText}</span>`;
}

document.getElementById('f-start').addEventListener('change', updateTypeBadge);
document.getElementById('f-end').addEventListener('change', updateTypeBadge);

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingTaskId = null;
}

function saveTask() {
  const name = document.getElementById('f-name').value.trim();
  const desc = document.getElementById('f-desc').value.trim();
  const start = document.getElementById('f-start').value;
  let end = document.getElementById('f-end').value;

  if (!name) { document.getElementById('f-name').style.borderColor = 'var(--danger)'; return; }
  if (!start) { alert('Date de début requise'); return; }
  if (!end) end = start;
  if (end < start) { alert('La date de fin ne peut pas être antérieure à la date de début.'); return; }
  document.getElementById('f-name').style.borderColor = '';

  let type = editingForcedType;
  if (!type) type = (start === end) ? 'milestone' : 'standard';

  if (editingTaskId !== null) {
    const task = tasks.find(t => t.id === editingTaskId);
    task.name = name;
    task.description = desc;
    task.startDate = start;
    task.endDate = end;
    const demoteCheckbox = document.getElementById('f-demote-summary');
    const promoteCheckbox = document.getElementById('f-promote-summary');
    if (task.type === 'summary' && demoteCheckbox.checked && getChildren(task.id).length === 0) {
      task.type = type; // reclassement manuel en tâche standard/jalon
    } else if (task.type !== 'summary' && promoteCheckbox.checked) {
      task.type = 'summary'; // reclassement manuel en tâche récapitulative
    } else if (task.type !== 'summary') {
      task.type = type;
    }
  } else {
    const maxOrder = tasks.filter(t => t.parentId === (editingParentId || null))
      .reduce((m, t) => Math.max(m, t.order), -1);
    tasks.push({
      id: nextId++,
      name, description: desc,
      startDate: start, endDate: end,
      type: editingForcedType || type,
      parentId: editingParentId || null,
      order: maxOrder + 1,
      collapsed: false
    });
    // Le parent devient automatiquement récapitulatif s'il ne l'est pas déjà
    if (editingParentId !== null) {
      const parent = tasks.find(t => t.id === editingParentId);
      if (parent && parent.type !== 'summary') parent.type = 'summary';
    }
  }

  closeModal();
  render();
}

// ═══════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════
function confirmDelete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const children = getChildren(id);

  const overlay = document.getElementById('confirm-overlay');
  document.getElementById('confirm-title').textContent = `Supprimer "${task.name}" ?`;

  if (children.length > 0) {
    document.getElementById('confirm-msg').textContent = `Cette tâche récapitulative contient ${children.length} sous-tâche(s). Que souhaitez-vous faire ?`;
    document.getElementById('confirm-btns').innerHTML = `
      <button class="btn btn-ghost" onclick="closeConfirm()">Annuler</button>
      <button class="btn" style="background:var(--warning);color:#000;border-color:var(--warning)" onclick="deleteTask(${id}, true)">Remonter les sous-tâches</button>
      <button class="btn btn-danger" onclick="deleteTask(${id}, false)">Tout supprimer</button>`;
  } else {
    document.getElementById('confirm-msg').textContent = `Cette action est irréversible.`;
    document.getElementById('confirm-btns').innerHTML = `
      <button class="btn btn-ghost" onclick="closeConfirm()">Annuler</button>
      <button class="btn btn-danger" onclick="deleteTask(${id}, false)">Supprimer</button>`;
  }
  overlay.classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open');
}

function deleteTask(id, promoteChildren) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  closeConfirm();

  if (promoteChildren) {
    // Move children to parent
    tasks.filter(t => t.parentId === id).forEach(t => t.parentId = task.parentId);
  } else {
    // Delete all descendants
    const desc = getDescendants(id);
    desc.forEach(did => { tasks = tasks.filter(t => t.id !== did); });
  }
  tasks = tasks.filter(t => t.id !== id);
  if (selectedTaskId === id) selectedTaskId = null;
  render();
}

// ═══════════════════════════════════════════════════
// ZOOM
// ═══════════════════════════════════════════════════
function setZoom(zoom) {
  currentZoom = zoom;
  document.querySelectorAll('.zoom-btn').forEach(b => b.classList.toggle('active', b.dataset.zoom === zoom));
  render();
}

function centerToday() {
  const range = getProjectRange();
  const pxDay = getPxPerDay();
  const ganttBody = document.getElementById('gantt-body');
  const x = dateDiff(range.start, today()) * pxDay - ganttBody.offsetWidth / 2;
  ganttBody.scrollLeft = Math.max(0, x);
  syncGanttHeaderScroll(ganttBody.scrollLeft);
}

function fitToView() {
  const range = getProjectRange();
  const pxDay = getPxPerDay();
  const ganttBody = document.getElementById('gantt-body');
  const totalW = dateDiff(range.start, range.end) * pxDay;
  const scale = ganttBody.offsetWidth / totalW;
  // pick zoom that fits
  const projectDays = dateDiff(range.start, range.end);
  const ganttW2 = ganttBody.offsetWidth;
  if (projectDays * ZOOM_CONFIG.years <= ganttW2 * 1.5) setZoom('months');
  else setZoom('years');
  // re-evaluate with better granularity
  const newPxDay = getPxPerDay();
  if (projectDays * newPxDay < ganttW2 * 0.4) setZoom('days');
  else if (projectDays * ZOOM_CONFIG.weeks <= ganttW2 * 1.2) setZoom('weeks');
  else if (projectDays * ZOOM_CONFIG.months <= ganttW2 * 1.2) setZoom('months');
  else setZoom('years');
  ganttBody.scrollLeft = 0;
  syncGanttHeaderScroll(0);
}

// ═══════════════════════════════════════════════════
// ROW DRAG & DROP REORDER
// ═══════════════════════════════════════════════════
function startRowDrag(e, taskId) {
  dragState = { taskId, startY: e.clientY, moved: false };
  document.addEventListener('mousemove', onRowDragMove);
  document.addEventListener('mouseup', onRowDragEnd);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'grabbing';

  // Mark the dragging row
  const row = document.querySelector(`.task-row[data-id="${taskId}"]`);
  if (row) row.classList.add('dragging-row');
}

function onRowDragMove(e) {
  if (!dragState) return;
  if (Math.abs(e.clientY - dragState.startY) > 4) dragState.moved = true;
  if (!dragState.moved) return;

  // Remove all existing indicators & highlights
  document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
  document.querySelectorAll('.drop-into').forEach(el => el.classList.remove('drop-into'));

  const rows = [...document.querySelectorAll('.task-row:not(.dragging-row)')];
  const target = rows.find(r => {
    const rect = r.getBoundingClientRect();
    return e.clientY >= rect.top && e.clientY <= rect.bottom;
  });

  if (target) {
    const rect = target.getBoundingClientRect();
    const relY  = e.clientY - rect.top;
    const ratio = relY / rect.height;

    // 3 zones : avant (0–25%), dans (25–75%), après (75–100%)
    let position;
    if (ratio < 0.25) {
      position = 'before';
    } else if (ratio > 0.75) {
      position = 'after';
    } else {
      position = 'into';
    }

    if (position === 'into') {
      target.classList.add('drop-into');
    } else {
      const ind = document.createElement('div');
      ind.className = 'drop-indicator ' + position;
      target.style.position = 'relative';
      target.appendChild(ind);
    }

    dragState.targetId = parseInt(target.dataset.id);
    dragState.position = position;
  } else {
    dragState.targetId = null;
    dragState.position = null;
  }
}

function onRowDragEnd(e) {
  document.removeEventListener('mousemove', onRowDragMove);
  document.removeEventListener('mouseup', onRowDragEnd);
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
  document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
  document.querySelectorAll('.drop-into').forEach(el => el.classList.remove('drop-into'));
  document.querySelectorAll('.dragging-row').forEach(el => el.classList.remove('dragging-row'));

  if (dragState && dragState.moved && dragState.targetId != null && dragState.targetId !== dragState.taskId) {
    applyRowReorder(dragState.taskId, dragState.targetId, dragState.position);
  }
  dragState = null;
}

function applyRowReorder(srcId, tgtId, position) {
  const src = tasks.find(t => t.id === srcId);
  const tgt = tasks.find(t => t.id === tgtId);
  if (!src || !tgt) return;

  // Prevent dropping a task onto one of its own descendants or itself
  if (getDescendants(srcId).includes(tgtId)) return;
  if (srcId === tgtId) return;

  if (position === 'into') {
    // ── Nesting : la tâche devient enfant de la cible ──
    // La cible devient automatiquement récapitulative si elle ne l'est pas
    if (tgt.type !== 'summary') tgt.type = 'summary';
    src.parentId = tgtId;
    // Placer en dernière position parmi les enfants existants
    const siblings = tasks.filter(t => t.parentId === tgtId && t.id !== srcId);
    src.order = siblings.length;
    // S'assurer que la cible est dépliée
    tgt.collapsed = false;
  } else {
    // ── Réordonnancement (avant / après) ──
    src.parentId = tgt.parentId;
    const siblings = tasks
      .filter(t => t.parentId === tgt.parentId && t.id !== srcId)
      .sort((a, b) => a.order - b.order);
    const tgtIndex = siblings.findIndex(t => t.id === tgtId);
    const insertAt = position === 'before' ? tgtIndex : tgtIndex + 1;
    siblings.splice(insertAt, 0, src);
    siblings.forEach((t, i) => { t.order = i; });
  }

  render();
}

// ═══════════════════════════════════════════════════
// NEST MODAL — choisir le parent d'une tâche
// ═══════════════════════════════════════════════════
let nestingTaskId = null;

function openNestModal(taskId) {
  nestingTaskId = taskId;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const forbidden = new Set([taskId, ...getDescendants(taskId)]);
  const list = document.getElementById('nest-list');
  list.innerHTML = '';

  // Option : niveau racine
  const rootOpt = makeNestOption(null, '[ Niveau racine — aucun parent ]', task.parentId === null);
  list.appendChild(rootOpt);

  // Options : toutes les tâches sauf tâche elle-même et ses descendants
  const visible = getVisibleRows();
  for (const { task: t, level } of visible) {
    if (forbidden.has(t.id)) continue;
    const isCurrent = t.id === task.parentId;
    const indent = '    '.repeat(level);
    const typeIcon = t.type === 'summary' ? '📁 ' : getTaskType(t) === 'milestone' ? '◆ ' : '▬ ';
    const label = indent + typeIcon + t.name;
    list.appendChild(makeNestOption(t.id, label, isCurrent));
  }

  document.getElementById('nest-overlay').style.display = 'flex';
}

function makeNestOption(targetId, label, isCurrent) {
  const opt = document.createElement('div');
  opt.style.cssText = `padding:10px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px;
    border:1px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'};
    background:${isCurrent ? 'var(--accent-dim)' : 'transparent'};margin-bottom:6px;
    font-size:13px;color:${isCurrent ? 'var(--accent)' : 'var(--text)'};
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
  opt.title = label.trim();
  if (isCurrent) {
    opt.innerHTML = `<span style="font-size:10px;color:var(--accent)">✓</span><span style="overflow:hidden;text-overflow:ellipsis">${label}</span>`;
  } else {
    opt.textContent = label;
  }
  opt.addEventListener('mouseenter', () => { if (!isCurrent) opt.style.background = 'var(--surface2)'; });
  opt.addEventListener('mouseleave', () => { if (!isCurrent) opt.style.background = 'transparent'; });
  opt.onclick = () => applyNest(nestingTaskId, targetId);
  return opt;
}

function applyNest(srcId, newParentId) {
  const src = tasks.find(t => t.id === srcId);
  if (!src) return;
  closeNestModal();

  if (newParentId !== null) {
    const newParent = tasks.find(t => t.id === newParentId);
    if (!newParent) return;
    if (getDescendants(srcId).includes(newParentId)) return; // sécurité
    if (newParent.type !== 'summary') newParent.type = 'summary';
    newParent.collapsed = false;
  }

  src.parentId = newParentId;
  // Placer en dernière position dans le nouveau groupe
  const siblings = tasks.filter(t => t.parentId === newParentId && t.id !== srcId);
  src.order = siblings.length;
  render();
}

function closeNestModal() {
  document.getElementById('nest-overlay').style.display = 'none';
  nestingTaskId = null;
}

// ═══════════════════════════════════════════════════
// EXPORT CSV
// ═══════════════════════════════════════════════════
function exportCSV() {
  const rows = getVisibleRows();
  const BOM = '\uFEFF';
  const header = 'ID;NOM;TYPE;NIVEAU;ID_PARENT;DATE_DEBUT;DATE_FIN;DUREE_JOURS;DESCRIPTION\r\n';
  let body = '';

  for (const { task, level } of rows) {
    const type = getTaskType(task).toUpperCase();
    const dur = type === 'MILESTONE' ? 0 : dateDiff(task.startDate, task.endDate) + 1;
    const desc = (task.description || '').replace(/"/g, '""');
    const hasSpecialChars = desc.includes(';') || desc.includes('\n') || desc.includes('"');
    body += [
      task.id,
      `"${task.name.replace(/"/g, '""')}"`,
      type === 'MILESTONE' ? 'JALON' : type,
      level,
      task.parentId || '',
      task.startDate,
      task.endDate,
      dur,
      hasSpecialChars ? `"${desc}"` : desc
    ].join(';') + '\r\n';
  }

  const csv = BOM + header + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadFile(blob, getFileName('csv'));
}

// ═══════════════════════════════════════════════════
// EXPORT MARKDOWN
// ═══════════════════════════════════════════════════
function exportMarkdown() {
  recalcAllSummaries();
  const rows = getVisibleRows();
  const projectName = document.getElementById('project-name').value || 'Projet';
  const now = new Date();
  const exportDate = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;

  // ── En-tête ────────────────────────────────────────
  let md = `# ${projectName}

`;
  md += `> **Planning exporté le** ${exportDate}

`;

  // ── 1. Tableau du planning ─────────────────────────
  md += `## Planning

`;
  md += `| N° | Tâche | Type | Début | Fin | Durée |
`;
  md += `|:--:|-------|:----:|:-----:|:---:|:-----:|
`;

  let idx = 1;
  for (const { task, level } of rows) {
    const type = getTaskType(task);
    const indent = '↳ '.repeat(level);
    const name = escMD(task.name);

    let typeLabel, typeEmoji;
    if (type === 'summary')   { typeLabel = 'Récap.';   typeEmoji = '📁'; }
    else if (type === 'milestone') { typeLabel = 'Jalon';    typeEmoji = '◆'; }
    else                      { typeLabel = 'Tâche';    typeEmoji = '▬'; }

    const start = formatDate(task.startDate);
    const end   = type === 'milestone' ? '—' : formatDate(task.endDate);
    const dur   = type === 'milestone' ? '—'
                : `${dateDiff(task.startDate, task.endDate) + 1} j`;

    const nameCell = type === 'summary'
      ? `**${indent}${typeEmoji} ${name}**`
      : `${indent}${typeEmoji} ${name}`;

    md += `| ${idx++} | ${nameCell} | ${typeLabel} | ${start} | ${end} | ${dur} |
`;
  }

  // ── 2. Diagramme Mermaid Gantt ─────────────────────
  md += `
## Diagramme Gantt

`;
  md += `> Ce diagramme est rendu automatiquement sur GitHub, GitLab, Notion, Obsidian et tout éditeur Markdown compatible Mermaid.

`;
  md += '```mermaid\n';
  md += `gantt
`;
  md += `    title ${projectName}
`;
  md += `    dateFormat YYYY-MM-DD
`;
  md += `    todayMarker on

`;

  // Générer les sections Mermaid à partir des tâches récapitulatives
  // (les tâches racines sans parent forment des sections)
  let currentSection = null;

  for (const { task, level } of rows) {
    const type = getTaskType(task);

    // Nouvelle section = tâche récapitulative de niveau 0
    if (type === 'summary' && level === 0) {
      currentSection = task.name;
      md += `    section ${escMermaid(task.name)}
`;
      continue;
    }

    // Section par défaut si pas encore de section déclarée
    if (currentSection === null && level === 0) {
      currentSection = 'Tâches';
      md += `    section Tâches
`;
    }

    // Ignorer les tâches récapitulatives imbriquées (elles seraient des doublons visuels)
    if (type === 'summary') continue;

    const safeName = escMermaid(task.name);

    if (type === 'milestone') {
      // Mermaid milestone : durée 0d
      md += `    ${safeName} : milestone, ${task.startDate}, 0d
`;
    } else {
      // Calcul de la durée en jours pour Mermaid
      const dur = dateDiff(task.startDate, task.endDate) + 1;
      md += `    ${safeName} : ${task.startDate}, ${dur}d
`;
    }
  }

  md += '```\n';

  // ── 3. Section Jalons ──────────────────────────────
  const milestones = rows.filter(r => getTaskType(r.task) === 'milestone');
  if (milestones.length > 0) {
    md += `
## Jalons

`;
    md += `| Jalon | Date |
`;
    md += `|-------|:----:|
`;
    for (const { task } of milestones) {
      md += `| ◆ ${escMD(task.name)} | ${formatDate(task.startDate)} |
`;
    }
    md += '\n';
  }

  // ── Pied de page ──────────────────────────────────
  md += `
---
*Généré par GanttPro HTML — [github.com/Romube/gantt-html](https://github.com/Romube/gantt-html)*
`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  downloadFile(blob, getFileName('md'));
}

function escMD(s) {
  return (s || '').replace(/\|/g, '\\|').replace(/\*/g, '\\*').replace(/_/g, '\\_');
}

function escMermaid(s) {
  // Mermaid n'aime pas les deux-points, les virgules et certains caractères spéciaux
  return (s || '')
    .replace(/:/g, ' -')
    .replace(/,/g, ' ')
    .replace(/[#]/g, '')
    .replace(/"/g, "'")
    .trim();
}

// ═══════════════════════════════════════════════════
// EXPORT SVG
// ═══════════════════════════════════════════════════
function openExportSVGModal() {
  document.getElementById('export-modal-overlay').style.display = 'flex';
}
function closeExportModal() {
  document.getElementById('export-modal-overlay').style.display = 'none';
}

function exportSVG() {
  closeExportModal();
  const T = THEMES[currentTheme]; // theme palette for SVG
  const scale = document.querySelector('input[name="svg-scale"]:checked').value;
  const period = document.querySelector('input[name="svg-period"]:checked').value;

  const scaleMap = { compact: 24, standard: 32, comfortable: 44 };
  const rowH = scaleMap[scale];
  const barH = Math.round(rowH * 0.55);
  const headerH = 52;
  const listW = 260;
  const pxDay = getPxPerDay();

  recalcAllSummaries();
  const rows = getVisibleRows();

  let range = getProjectRange();
  if (period === 'visible') {
    const ganttBody = document.getElementById('gantt-body');
    const sl = ganttBody.scrollLeft;
    const cw = ganttBody.offsetWidth;
    range = {
      start: addDays(range.start, Math.floor(sl / pxDay)),
      end: addDays(range.start, Math.floor((sl + cw) / pxDay))
    };
  }

  const totalDays = dateDiff(range.start, range.end) + 1;
  const ganttW = totalDays * pxDay;
  const totalW = listW + ganttW;
  const totalH = headerH + rows.length * rowH + 40; // 40 = legend

  const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" font-family="Arial,sans-serif">
<defs>
  <style>
    text { font-family: Arial, sans-serif; }
  </style>
</defs>
<!-- Background -->
<rect width="${totalW}" height="${totalH}" fill="${T.bg}"/>
<!-- List panel background -->
<rect width="${listW}" height="${totalH}" fill="${T.surface}"/>
<!-- Border between list and gantt -->
<line x1="${listW}" y1="0" x2="${listW}" y2="${totalH}" stroke="${T.border}" stroke-width="1"/>
<!-- Header background -->
<rect width="${totalW}" height="${headerH}" fill="${T.surface2}"/>
<line x1="0" y1="${headerH}" x2="${totalW}" y2="${headerH}" stroke="${T.border}" stroke-width="1"/>

<!-- Project name -->
<text x="12" y="${headerH/2 + 5}" font-size="13" font-weight="bold" fill="${T.text}">${escSVG(document.getElementById('project-name').value)}</text>
`;

  // Header timeline — mirrors renderGanttHeader exactly for each zoom level
  const rowMid = headerH / 2;
  svg += `<line x1="${listW}" y1="${rowMid}" x2="${totalW}" y2="${rowMid}" stroke="${T.border}" stroke-width="1"/>`;

  if (currentZoom === 'days') {
    // Top: months (name + year)
    let curMonth = -1, monthStartX = listW, curMonthYear = 0;
    for (let i = 0; i <= totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const m = d.getMonth(); const y = d.getFullYear();
      if (m !== curMonth || i === totalDays) {
        if (curMonth !== -1) {
          const w = i * pxDay - (monthStartX - listW);
          svg += `<text x="${monthStartX + w/2}" y="${rowMid/2 + 5}" text-anchor="middle" font-size="10" font-weight="bold" fill="${T.text}">${MONTHS_FULL[curMonth]} ${curMonthYear}</text>`;
          svg += `<line x1="${listW + i * pxDay}" y1="0" x2="${listW + i * pxDay}" y2="${rowMid}" stroke="${T.border}" stroke-width="1"/>`;
        }
        curMonth = m; curMonthYear = y; monthStartX = listW + i * pxDay;
      }
    }
    // Bottom: day numbers
    for (let i = 0; i < totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const x = listW + i * pxDay;
      svg += `<line x1="${x}" y1="${rowMid}" x2="${x}" y2="${headerH}" stroke="${T.border}" stroke-width="0.5"/>`;
      if (pxDay >= 14) svg += `<text x="${x + pxDay/2}" y="${rowMid + (headerH - rowMid)/2 + 4}" text-anchor="middle" font-size="9" fill="${T.text2}">${d.getDate()}</text>`;
    }

  } else if (currentZoom === 'weeks') {
    // Top: months (name + year)
    let curMonth = -1, monthStartX = listW, curMonthYear = 0;
    for (let i = 0; i <= totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const m = d.getMonth(); const y = d.getFullYear();
      if (m !== curMonth || i === totalDays) {
        if (curMonth !== -1) {
          const w = i * pxDay - (monthStartX - listW);
          svg += `<text x="${monthStartX + w/2}" y="${rowMid/2 + 5}" text-anchor="middle" font-size="10" font-weight="bold" fill="${T.text}">${MONTHS_FULL[curMonth]} ${curMonthYear}</text>`;
          svg += `<line x1="${listW + i * pxDay}" y1="0" x2="${listW + i * pxDay}" y2="${rowMid}" stroke="${T.border}" stroke-width="1"/>`;
        }
        curMonth = m; curMonthYear = y; monthStartX = listW + i * pxDay;
      }
    }
    // Bottom: ISO week numbers
    for (let i = 0; i < totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      if (d.getDay() === 1) {
        const x = listW + i * pxDay;
        svg += `<line x1="${x}" y1="${rowMid}" x2="${x}" y2="${headerH}" stroke="${T.border}" stroke-width="1"/>`;
        svg += `<text x="${x + 2}" y="${rowMid + (headerH - rowMid)/2 + 4}" font-size="9" fill="${T.text2}">S${getISOWeek(d)}</text>`;
      }
    }

  } else if (currentZoom === 'months') {
    // Top: years
    let curYear = -1, yearStartX = listW;
    for (let i = 0; i <= totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const y = d.getFullYear();
      if (y !== curYear || i === totalDays) {
        if (curYear !== -1) {
          const w = i * pxDay - (yearStartX - listW);
          svg += `<text x="${yearStartX + w/2}" y="${rowMid/2 + 5}" text-anchor="middle" font-size="11" font-weight="bold" fill="${T.text}">${curYear}</text>`;
          svg += `<line x1="${listW + i * pxDay}" y1="0" x2="${listW + i * pxDay}" y2="${rowMid}" stroke="${T.border}" stroke-width="1"/>`;
        }
        curYear = y; yearStartX = listW + i * pxDay;
      }
    }
    // Bottom: month abbreviations
    let curMonth2 = -1, monthStartX2 = listW;
    for (let i = 0; i <= totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const m = d.getMonth();
      if (m !== curMonth2 || i === totalDays) {
        if (curMonth2 !== -1) {
          const w = i * pxDay - (monthStartX2 - listW);
          svg += `<text x="${monthStartX2 + w/2}" y="${rowMid + (headerH - rowMid)/2 + 4}" text-anchor="middle" font-size="9" fill="${T.text2}">${MONTHS_FR[curMonth2]}</text>`;
          svg += `<line x1="${listW + i * pxDay}" y1="${rowMid}" x2="${listW + i * pxDay}" y2="${headerH}" stroke="${T.border}" stroke-width="1"/>`;
        }
        curMonth2 = m; monthStartX2 = listW + i * pxDay;
      }
    }

  } else { // years
    // Top: years
    let curYear = -1, yearStartX = listW;
    for (let i = 0; i <= totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const y = d.getFullYear();
      if (y !== curYear || i === totalDays) {
        if (curYear !== -1) {
          const w = i * pxDay - (yearStartX - listW);
          svg += `<text x="${yearStartX + w/2}" y="${rowMid/2 + 5}" text-anchor="middle" font-size="12" font-weight="bold" fill="${T.text}">${curYear}</text>`;
          svg += `<line x1="${listW + i * pxDay}" y1="0" x2="${listW + i * pxDay}" y2="${rowMid}" stroke="${T.border}" stroke-width="1.5"/>`;
        }
        curYear = y; yearStartX = listW + i * pxDay;
      }
    }
    // Bottom: quarters T1–T4
    const QUARTERS = ['T1','T2','T3','T4'];
    let prevQ = -1, prevYr = -1, qStartX = listW;
    for (let i = 0; i <= totalDays; i++) {
      const d = parseDate(addDays(range.start, i));
      const q = Math.floor(d.getMonth() / 3);
      const y = d.getFullYear();
      if (q !== prevQ || y !== prevYr || i === totalDays) {
        if (prevQ !== -1) {
          const w = listW + i * pxDay - qStartX;
          if (w > 16) svg += `<text x="${qStartX + w/2}" y="${rowMid + (headerH - rowMid)/2 + 4}" text-anchor="middle" font-size="10" font-weight="500" fill="${T.accent}">${QUARTERS[prevQ]}</text>`;
          svg += `<line x1="${listW + i * pxDay}" y1="${rowMid}" x2="${listW + i * pxDay}" y2="${headerH}" stroke="${T.border}" stroke-width="1"/>`;
        }
        prevQ = q; prevYr = y; qStartX = listW + i * pxDay;
      }
    }
  }

  // Row data
  rows.forEach(({ task, level }, i) => {
    const y = headerH + i * rowH;
    const type = getTaskType(task);

    // Row background
    const rowFill = type === 'summary' ? T.rowSum : i % 2 === 0 ? T.rowEven : T.rowOdd;
    svg += `<rect x="0" y="${y}" width="${totalW}" height="${rowH}" fill="${rowFill}"/>`;
    svg += `<line x1="0" y1="${y + rowH}" x2="${totalW}" y2="${y + rowH}" stroke="${T.border}" stroke-width="0.5"/>`;

    // List: task name with indentation
    const indent = 8 + level * 16;
    const textY = y + rowH/2 + 4;

    // Type icon
    if (type === 'milestone') {
      const dx = indent + 6, dy = y + rowH/2;
      svg += `<rect x="${dx - 5}" y="${dy - 5}" width="10" height="10" fill="#F0A500" transform="rotate(45 ${dx} ${dy})"/>`;
    } else if (type === 'summary') {
      svg += `<rect x="${indent}" y="${y + rowH/2 - 5}" width="${Math.min(50, listW - indent - 20)}" height="8" rx="2" fill="#8B5CF6" opacity="0.6"/>`;
    } else {
      svg += `<rect x="${indent}" y="${y + rowH/2 - 4}" width="10" height="8" rx="1.5" fill="#58A6FF" opacity="0.7"/>`;
    }

    const textColor = type === 'summary' ? (currentTheme==='dark'?'#BC8CFF':'#8250DF') : type === 'milestone' ? (currentTheme==='dark'?'#F0A500':'#BF8700') : T.text;
    const fontW = type === 'summary' ? 'bold' : 'normal';
    const nameX = indent + 14;
    const maxNameW = listW - nameX - 8;
    svg += `<text x="${nameX}" y="${textY}" font-size="${Math.max(9, rowH * 0.35)}" font-weight="${fontW}" fill="${textColor}" clip-path="none">`;
    const nameStr = escSVG(task.name);
    svg += `<tspan>${nameStr.length > 28 ? nameStr.substring(0,26) + '…' : nameStr}</tspan></text>`;

    // Grid vertical lines
    if (currentZoom === 'days') {
      for (let j = 0; j < totalDays; j++) {
        const d = parseDate(addDays(range.start, j));
        if (d.getDay() === 1) {
          svg += `<line x1="${listW + j * pxDay}" y1="${y}" x2="${listW + j * pxDay}" y2="${y + rowH}" stroke="${T.border}" stroke-width="0.5"/>`;
        }
      }
    } else if (currentZoom === 'years') {
      let prevQ = -1, prevYr = -1;
      for (let j = 0; j < totalDays; j++) {
        const d = parseDate(addDays(range.start, j));
        const q = Math.floor(d.getMonth() / 3);
        const yr = d.getFullYear();
        if (q !== prevQ || yr !== prevYr) {
          const op = q === 0 ? '0.6' : '0.25';
          svg += `<line x1="${listW + j * pxDay}" y1="${y}" x2="${listW + j * pxDay}" y2="${y + rowH}" stroke="${T.border}" stroke-width="0.8" opacity="${op}"/>`;
          prevQ = q; prevYr = yr;
        }
      }
    }

    if (!task.startDate || !task.endDate) return;
    if (task.startDate < range.start && task.endDate < range.start) return;
    if (task.startDate > range.end) return;

    const clampedStart = maxDate(task.startDate, range.start);
    const barX = listW + dateDiff(range.start, clampedStart) * pxDay;

    if (type === 'milestone') {
      const mx = listW + dateDiff(range.start, task.startDate) * pxDay;
      const size = Math.max(8, barH * 0.7);
      const my = y + rowH/2;
      svg += `<rect x="${mx - size/2}" y="${my - size/2}" width="${size}" height="${size}" fill="#F0A500" stroke="#FBBF24" stroke-width="1.5" transform="rotate(45 ${mx} ${my})"/>`;
      svg += `<text x="${mx + size/2 + 4}" y="${my + 4}" font-size="${Math.max(8, rowH * 0.32)}" fill="#F0A500">${escSVG(task.name)}</text>`;
    } else {
      const clampedEnd = minDate(task.endDate, range.end);
      const dur = dateDiff(clampedStart, clampedEnd) + 1;
      const w = Math.max(4, dur * pxDay - 2);
      const bY = y + (rowH - barH) / 2;

      if (type === 'summary') {
        svg += `<rect x="${barX}" y="${bY + 2}" width="${w}" height="${barH - 4}" rx="2" fill="#8B5CF6"/>`;
        svg += `<polygon points="${barX},${bY + barH + 2} ${barX + 6},${bY + barH - 4} ${barX - 6},${bY + barH - 4}" fill="#8B5CF6"/>`;
        svg += `<polygon points="${barX + w},${bY + barH + 2} ${barX + w + 6},${bY + barH - 4} ${barX + w - 6},${bY + barH - 4}" fill="#8B5CF6"/>`;
      } else {
        svg += `<rect x="${barX}" y="${bY}" width="${w}" height="${barH}" rx="3" fill="#3B82F6"/>`;
        if (w > 40) {
          const lbl = escSVG(task.name);
          svg += `<text x="${barX + 5}" y="${bY + barH/2 + 4}" font-size="${Math.max(8, barH * 0.55)}" fill="white" opacity="0.9">${lbl.length > Math.floor(w/6) ? lbl.substring(0, Math.floor(w/6)) + '…' : lbl}</text>`;
        }
      }
    }
  });

  // Today line
  if (today() >= range.start && today() <= range.end) {
    const tx = listW + dateDiff(range.start, today()) * pxDay;
    svg += `<line x1="${tx}" y1="${headerH}" x2="${tx}" y2="${totalH - 40}" stroke="#FF6B6B" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.8"/>`;
  }

  // Legend
  const legendY = totalH - 36;
  svg += `<rect x="0" y="${legendY}" width="${totalW}" height="36" fill="${T.legendBg}"/>`;
  svg += `<line x1="0" y1="${legendY}" x2="${totalW}" y2="${legendY}" stroke="${T.border}" stroke-width="1"/>`;
  svg += `<rect x="12" y="${legendY + 12}" width="20" height="10" rx="2" fill="#3B82F6"/>`;
  svg += `<text x="38" y="${legendY + 21}" font-size="10" fill="${T.text2}">Tâche standard</text>`;
  svg += `<rect x="140" y="${legendY + 10}" width="12" height="12" fill="${currentTheme==='dark'?'#8B5CF6':'#8250DF'}" transform="rotate(0 146 ${legendY + 16})"/>`;
  svg += `<text x="160" y="${legendY + 21}" font-size="10" fill="${T.text2}">Tâche récapitulative</text>`;
  const mx = 300, my = legendY + 16;
  svg += `<rect x="${mx - 6}" y="${my - 6}" width="12" height="12" fill="#F0A500" transform="rotate(45 ${mx} ${my})"/>`;
  svg += `<text x="${mx + 10}" y="${legendY + 21}" font-size="10" fill="${T.text2}">Jalon</text>`;
  svg += `<line x1="${mx + 55}" y1="${legendY + 10}" x2="${mx + 55}" y2="${legendY + 26}" stroke="${T.today}" stroke-width="1.5" stroke-dasharray="3,2"/>`;
  svg += `<text x="${mx + 62}" y="${legendY + 21}" font-size="10" fill="${T.text2}">Aujourd'hui</text>`;

  svg += `\n</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  downloadFile(blob, getFileName('svg'));
}

function escSVG(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════
// SAVE / LOAD
// ═══════════════════════════════════════════════════
function saveProject() {
  const data = {
    version: 1,
    name: document.getElementById('project-name').value,
    nextId, tasks
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadFile(blob, getFileName('json'));
  showSaveIndicator('Projet sauvegardé ✓');
}

function loadProject() {
  document.getElementById('file-input').click();
}

function onFileLoad(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.tasks) throw new Error('Format invalide');
      tasks = data.tasks;
      nextId = data.nextId || (Math.max(0, ...tasks.map(t => t.id)) + 1);
      document.getElementById('project-name').value = data.name || 'Projet chargé';
      selectedTaskId = null;
      render();
      showSaveIndicator('Projet chargé ✓');
    } catch(err) {
      alert('Erreur lors du chargement : ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function saveToLocalStorage() {
  const data = { version: 1, name: document.getElementById('project-name').value, nextId, tasks };
  localStorage.setItem('ganttPro_project', JSON.stringify(data));
}

function loadFromLocalStorage() {
  const raw = localStorage.getItem('ganttPro_project');
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    tasks = data.tasks || [];
    nextId = data.nextId || (Math.max(0, ...tasks.map(t => t.id)) + 1);
    document.getElementById('project-name').value = data.name || 'Mon Projet';
    return true;
  } catch { return false; }
}

function showSaveIndicator(msg) {
  const el = document.getElementById('sb-save');
  el.textContent = msg;
  setTimeout(() => el.textContent = '', 3000);
}

function getFileName(ext) {
  const name = (document.getElementById('project-name').value || 'projet').replace(/[^a-z0-9_-]/gi,'_');
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `${name}_gantt_${date}.${ext}`;
}

function downloadFile(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ═══════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') { closeModal(); closeConfirm(); closeExportModal(); }
  if (e.key === 'n' && !e.ctrlKey) openModal('standard');
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveProject(); }
});
document.getElementById('modal-body').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); saveTask(); }
});

// ═══════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════
function loadDemoData() {
  const base = today();
  const t = (d) => addDays(base, d);
  tasks = [
    { id:1, name:'Phase 1 — Conception', description:'Phase de conception du système', startDate:t(-5), endDate:t(14), type:'summary', parentId:null, order:0, collapsed:false },
    { id:2, name:'Analyse des besoins', description:'Recueil et analyse des besoins utilisateurs', startDate:t(-5), endDate:t(3), type:'standard', parentId:1, order:0, collapsed:false },
    { id:3, name:'Spécification fonctionnelle', description:'Rédaction de la spécification fonctionnelle détaillée', startDate:t(0), endDate:t(7), type:'standard', parentId:1, order:1, collapsed:false },
    { id:4, name:'Validation spécification', description:'', startDate:t(7), endDate:t(7), type:'milestone', parentId:1, order:2, collapsed:false },
    { id:5, name:'Architecture technique', description:'Conception de l\'architecture logicielle', startDate:t(5), endDate:t(14), type:'standard', parentId:1, order:3, collapsed:false },

    { id:6, name:'Phase 2 — Développement', description:'', startDate:t(14), endDate:t(55), type:'summary', parentId:null, order:1, collapsed:false },
    { id:7, name:'Backend — API REST', description:'Développement des endpoints API', startDate:t(14), endDate:t(35), type:'standard', parentId:6, order:0, collapsed:false },
    { id:8, name:'Frontend — Interface', description:'Développement de l\'interface utilisateur', startDate:t(21), endDate:t(45), type:'standard', parentId:6, order:1, collapsed:false },
    { id:9, name:'Intégration', description:'Intégration backend/frontend', startDate:t(42), endDate:t(55), type:'standard', parentId:6, order:2, collapsed:false },
    { id:10, name:'Livraison développement', description:'', startDate:t(55), endDate:t(55), type:'milestone', parentId:6, order:3, collapsed:false },

    { id:11, name:'Phase 3 — Tests & Recette', description:'', startDate:t(55), endDate:t(80), type:'summary', parentId:null, order:2, collapsed:false },
    { id:12, name:'Tests unitaires et intégration', description:'', startDate:t(55), endDate:t(65), type:'standard', parentId:11, order:0, collapsed:false },
    { id:13, name:'Tests d\'acceptation (UAT)', description:'', startDate:t(62), endDate:t(75), type:'standard', parentId:11, order:1, collapsed:false },
    { id:14, name:'Recette validée', description:'', startDate:t(75), endDate:t(75), type:'milestone', parentId:11, order:2, collapsed:false },
    { id:15, name:'Corrections et ajustements', description:'', startDate:t(72), endDate:t(80), type:'standard', parentId:11, order:3, collapsed:false },

    { id:16, name:'Mise en production', description:'', startDate:t(80), endDate:t(80), type:'milestone', parentId:null, order:3, collapsed:false },
    { id:17, name:'Formation utilisateurs', description:'', startDate:t(78), endDate:t(85), type:'standard', parentId:null, order:4, collapsed:false },
  ];
  nextId = 18;
}

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
(function init() {
  const loaded = loadFromLocalStorage();
  if (!loaded) loadDemoData();
  render();

  // Scroll to today on start
  setTimeout(() => {
    const range = getProjectRange();
    const pxDay = getPxPerDay();
    const ganttBody = document.getElementById('gantt-body');
    const x = Math.max(0, dateDiff(range.start, today()) * pxDay - 80);
    ganttBody.scrollLeft = x;
    syncGanttHeaderScroll(x);
  }, 100);
})();
