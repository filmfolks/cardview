// =================================================================
// --- GLOBAL STATE & DATA STRUCTURE ---
// =================================================================
let projectData = {
  panelItems: [],
  activeItemId: null,
  projectInfo: {}
};
let lastContactPerson = '';
let activeFilter = { type: 'all', value: '' };
let autoSaveInterval = null;

// Non-persistent UI state for the panel filter list
let panelFilter = { type: null, values: [], selected: '' };

// =================================================================
// --- INITIALIZATION ---
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log("ToshooT Script Initializing...");
  setupEventListeners();
  loadProjectData();
  initializeDragAndDrop();
});

// =================================================================
// --- SETUP ALL EVENT LISTENERS (ROBUST VERSION) ---
// =================================================================
function setupEventListeners() {
  const safeAddListener = (id, event, handler) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(event, handler);
    } else {
      console.error(`Error: Element with ID '${id}' not found.`);
    }
  };

  safeAddListener('schedule-form', 'submit', handleAddScene);

  const hamburgerBtn = document.getElementById('hamburger-btn');
  const dropdownMenu = document.getElementById('dropdown-menu');
  if (hamburgerBtn && dropdownMenu) {
    hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdownMenu.classList.toggle('show'); });
  }

  // Ensure Project Info opens reliably and closes dropdown
  safeAddListener('new-project-btn', 'click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropdownMenu) dropdownMenu.classList.remove('show');
    openProjectModal();
  });

  safeAddListener('open-project-btn', 'click', () => document.getElementById('file-input').click());
  safeAddListener('file-input', 'change', openProjectFile);
  safeAddListener('new-sequence-btn', 'click', handleNewSequence);
  safeAddListener('save-project-btn', 'click', saveProjectFile);
  safeAddListener('save-excel-btn', 'click', () => saveAsExcel(true));
  safeAddListener('share-project-btn', 'click', shareProject);
  safeAddListener('clear-project-btn', 'click', clearProject);
  safeAddListener('info-btn', 'click', () => document.getElementById('info-modal').style.display = 'block');
  safeAddListener('about-btn', 'click', () => document.getElementById('about-modal').style.display = 'block');
  safeAddListener('auto-save-btn', 'click', toggleAutoSave);

  const sequencePanel = document.getElementById('sequence-panel');
  safeAddListener('sequence-hamburger-btn', 'click', () => sequencePanel.classList.add('open'));
  safeAddListener('close-panel-btn', 'click', () => sequencePanel.classList.remove('open'));
  safeAddListener('add-schedule-break-btn', 'click', handleAddScheduleBreak);
  safeAddListener('export-panel-btn', 'click', () => saveAsExcel(false));
  safeAddListener('filter-by-select', 'change', handleFilterChange);

  safeAddListener('close-project-modal', 'click', closeProjectModal);
  safeAddListener('save-project-info-btn', 'click', handleSaveProjectInfo);
  safeAddListener('close-edit-modal', 'click', closeEditModal);
  safeAddListener('save-changes-btn', 'click', handleSaveChanges);
  safeAddListener('delete-scene-btn', 'click', handleDeleteFromModal);
  safeAddListener('close-info-modal', 'click', () => document.getElementById('info-modal').style.display = 'none');
  safeAddListener('close-about-modal', 'click', () => document.getElementById('about-modal').style.display = 'none');

  document.addEventListener('click', (event) => {
    if (hamburgerBtn && dropdownMenu && dropdownMenu.classList.contains('show') && !hamburgerBtn.contains(event.target) && !dropdownMenu.contains(event.target)) {
      dropdownMenu.classList.remove('show');
    }
  });
}

// =================================================================
// --- DRAG-AND-DROP INITIALIZATION ---
// =================================================================
function initializeDragAndDrop() {
  const listContainer = document.getElementById('sequence-list');
  if (listContainer) {
    new Sortable(listContainer, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      draggable: '.sequence-item.draggable, .schedule-break-item', // only sequences & breaks are draggable
      onEnd: (evt) => {
        // evt.oldIndex/newIndex are among draggable elements only
        const draggableItems = projectData.panelItems.filter(item => item.type === 'sequence' || item.type === 'schedule_break');
        const movedItem = draggableItems[evt.oldIndex];
        const originalIndex = projectData.panelItems.indexOf(movedItem);

        // Remove item at original index
        const [spliced] = projectData.panelItems.splice(originalIndex, 1);

        // Recompute draggable list after removal to find insertion anchor
        const afterRemovalDraggables = projectData.panelItems.filter(item => item.type === 'sequence' || item.type === 'schedule_break');
        const anchor = afterRemovalDraggables[evt.newIndex];
        const insertIndex = anchor ? projectData.panelItems.indexOf(anchor) : projectData.panelItems.length;

        projectData.panelItems.splice(insertIndex, 0, spliced);
        saveProjectData();
        renderSequencePanel();
      }
    });
  }
}

// =================================================================
// --- SEQUENCE & SCHEDULE BREAK MANAGEMENT ---
// =================================================================
function handleNewSequence() {
  let name = prompt("Enter a name for the new sequence:");
  if (name === null) return;
  if (name.trim() === "") name = `Sequence ${projectData.panelItems.filter(i => i.type === 'sequence').length + 1}`;
  const newItem = { type: 'sequence', id: Date.now(), name: name, scenes: [] };
  projectData.panelItems.push(newItem);
  setActiveItem(newItem.id);
}

function handleAddScheduleBreak() {
  let name = prompt("Enter a name for the schedule break (e.g., DAY 1):");
  if (name === null || name.trim() === "") return;
  const newItem = { type: 'schedule_break', id: Date.now(), name: name };
  projectData.panelItems.push(newItem);
  saveProjectData();
  renderSequencePanel();
}

function setActiveItem(id) {
  const item = projectData.panelItems.find(i => i.id === id);
  if (item && item.type === 'sequence') {
    projectData.activeItemId = id;
    saveProjectData();
    renderSchedule();
    renderSequencePanel();
    document.getElementById('sequence-panel').classList.remove('open');
  }
}

function renderSequencePanel() {
  const listContainer = document.getElementById('sequence-list');
  listContainer.innerHTML = '';

  // Render sequences and breaks (draggable)
  projectData.panelItems.forEach(item => {
    const element = document.createElement('div');
    if (item.type === 'sequence') {
      element.className = `sequence-item draggable ${item.id === projectData.activeItemId ? 'active' : ''}`;
      element.textContent = item.name;
      element.onclick = () => setActiveItem(item.id);
    } else if (item.type === 'schedule_break') {
      element.className = 'schedule-break-item';
      element.textContent = item.name;
    }
    listContainer.appendChild(element);
  });

  // Render filter list (non-draggable)
  if (panelFilter.type && panelFilter.values.length > 0) {
    const header = document.createElement('div');
    header.className = 'schedule-break-item';
    const labelMap = { date: 'Date', status: 'Status', number: 'Scene #', heading: 'Heading', cast: 'Cast' };
    header.textContent = `Filter: ${labelMap[panelFilter.type] || panelFilter.type}`;
    listContainer.appendChild(header);

    panelFilter.values.forEach(val => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `filter-item ${panelFilter.selected.toLowerCase() === val.toLowerCase() ? 'active' : ''}`;
      btn.textContent = val || '(blank)';
      btn.onclick = () => {
        panelFilter.selected = val;
        activeFilter = { type: panelFilter.type, value: (val || '').toLowerCase() };
        renderSequencePanel();
        renderSchedule();
      };
      listContainer.appendChild(btn);
    });
  }
}

// =================================================================
// --- FILTERING LOGIC ---
// =================================================================
function handleFilterChange(e) {
  const filterType = e.target.value;
  const select = document.getElementById('filter-by-select');
  if (select) select.value = 'all';

  if (filterType === 'all') {
    panelFilter = { type: null, values: [], selected: '' };
    activeFilter = { type: 'all', value: '' };
    renderSequencePanel();
    renderSchedule();
    return;
  }

  const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
  if (!activeSequence || activeSequence.type !== 'sequence') {
    panelFilter = { type: null, values: [], selected: '' };
    activeFilter = { type: 'all', value: '' };
    renderSequencePanel();
    renderSchedule();
    return;
  }

  const raw = activeSequence.scenes.map(s => (s[filterType] ?? '').toString().trim()).filter(Boolean);
  const values = Array.from(new Set(raw)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  panelFilter = { type: filterType, values, selected: '' };
  activeFilter = { type: filterType, value: '' };
  renderSequencePanel();
  renderSchedule();
}

function getVisibleScenes() {
  const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
  if (!activeSequence || activeSequence.type !== 'sequence') return [];

  const allScenes = [...activeSequence.scenes];
  if (activeFilter.type === 'all') { return allScenes; }

  return allScenes.filter(scene => {
    const sceneValue = (scene[activeFilter.type] || '').toLowerCase();
    return sceneValue.includes(activeFilter.value);
  });
}

function resetFilter() {
  activeFilter = { type: 'all', value: '' };
  panelFilter = { type: null, values: [], selected: '' };
  const filterSelect = document.getElementById('filter-by-select');
  if (filterSelect) filterSelect.value = 'all';
}

// =================================================================
// --- CORE SCHEDULE FUNCTIONS ---
// =================================================================
function handleAddScene(e) {
  e.preventDefault();
  let activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
  if (!activeSequence || activeSequence.type !== 'sequence') {
    if (confirm("No sequence created. Would you like to create 'Sequence 1' to add this scene?")) {
      handleNewSequence();
      activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
      if (!activeSequence) return;
    } else { return; }
  }
  const newScene = {
    id: Date.now(),
    number: document.getElementById('scene-number').value,
    heading: document.getElementById('scene-heading').value,
    date: document.getElementById('scene-date').value,
    time: document.getElementById('scene-time').value,
    type: document.getElementById('scene-type').value,
    location: document.getElementById('scene-location').value,
    pages: document.getElementById('scene-pages').value,
    duration: document.getElementById('scene-duration').value,
    status: document.getElementById('scene-status').value,
    cast: document.getElementById('scene-cast').value,
    equipment: document.getElementById('scene-equipment').value,
    contact: document.getElementById('scene-contact').value,
  };
  activeSequence.scenes.push(newScene);
  lastContactPerson = newScene.contact;
  saveProjectData();
  resetFilter();
  renderSchedule();
  e.target.reset();
  document.getElementById('scene-contact').value = lastContactPerson;
}

function renderSchedule() {
  const container = document.getElementById('scene-strips-container');
  const display = document.getElementById('active-sequence-display');
  container.innerHTML = '';
  const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
  if (!activeSequence || activeSequence.type !== 'sequence') {
    display.textContent = 'No active sequence. Create or select a sequence.';
    return;
  }
  display.textContent = `Current Sequence: ${activeSequence.name}`;
  const scenesToRender = getVisibleScenes();
  if (scenesToRender.length === 0 && activeFilter.type !== 'all') {
    container.innerHTML = `<p style="text-align:center; color: #9ca3af;">No scenes match the current filter.</p>`;
  } else {
    scenesToRender.forEach(scene => {
      const stripWrapper = document.createElement('div');
      stripWrapper.className = 'scene-strip-wrapper';
      const statusClass = (scene.status || '').replace(/\s+/g, '-').toLowerCase();
      stripWrapper.innerHTML = `
        <div class="scene-strip" id="scene-strip-${scene.id}">
          <div class="strip-item"><strong>#${scene.number}</strong></div>
          <div class="strip-item">${scene.heading}</div>
          <div class="strip-item">${formatDateDDMMYYYY(scene.date)}</div>
          <div class="strip-item">${formatTime12Hour(scene.time)}</div>
          <div class="strip-item">${scene.type}. ${scene.location}</div>
          <div class="strip-item">Pages: <strong>${scene.pages || 'N/A'}</strong></div>
          <div class="strip-item">Duration: <strong>${scene.duration || 'N/A'}</strong></div>
          <div class="strip-item">Cast: <strong>${scene.cast || 'N/A'}</strong></div>
          <div class="strip-item">Equipment: <strong>${scene.equipment || 'N/A'}</strong></div>
          <div class="strip-item"><span class="strip-status ${statusClass}">${scene.status}</span></div>
        </div>
        <div class="scene-actions">
          <button class="edit-btn-strip" title="Edit Scene"><i class="fas fa-pencil-alt"></i></button>
          <button class="share-btn-strip" title="Share as Image"><i class="fas fa-share-alt"></i></button>
        </div>
      `;
      stripWrapper.querySelector('.edit-btn-strip').addEventListener('click', () => openEditModal(scene.id));
      stripWrapper.querySelector('.share-btn-strip').addEventListener('click', () => shareScene(scene.id));
      container.appendChild(stripWrapper);
    });
  }
}

function deleteScene(id) {
  const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
  if (!activeSequence) return;
  activeSequence.scenes = activeSequence.scenes.filter(scene => scene.id !== id);
  saveProjectData();
  renderSchedule();
}

// =================================================================
// --- DATA PERSISTENCE & PROJECT FILES ---
// =================================================================
function saveProjectData(isBackup = false) {
  const key = isBackup ? 'projectData_backup' : 'projectData';
  localStorage.setItem(key, JSON.stringify(projectData));
}

function loadProjectData() {
  let savedData = localStorage.getItem('projectData');
  const backupData = localStorage.getItem('projectData_backup');
  if (!savedData && backupData) {
    if (confirm("No main save data found, but a backup exists. Would you like to restore the backup?")) {
      savedData = backupData;
      localStorage.setItem('projectData', backupData);
    }
  }
  projectData = savedData ? JSON.parse(savedData) : { panelItems: [], activeItemId: null, projectInfo: {} };
  if (!projectData.projectInfo) projectData.projectInfo = {};
  if (!projectData.panelItems) projectData.panelItems = [];
  if (projectData.activeItemId === null && projectData.panelItems.length > 0) {
    const firstSequence = projectData.panelItems.find(i => i.type === 'sequence');
    if (firstSequence) projectData.activeItemId = firstSequence.id;
  }
  const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
  if (activeSequence && activeSequence.scenes && activeSequence.scenes.length > 0) {
    lastContactPerson = activeSequence.scenes[activeSequence.scenes.length - 1].contact || '';
  }
  const contactInput = document.getElementById('scene-contact');
  if (contactInput) contactInput.value = lastContactPerson;
  renderSchedule();
  renderSequencePanel();
}

function clearProject() {
  if (confirm('Are you sure you want to clear the entire project?')) {
    projectData = { panelItems: [], activeItemId: null, projectInfo: {} };
    lastContactPerson = '';
    saveProjectData();
    renderSchedule();
    renderSequencePanel();
  }
}

function saveProjectFile() {
  try {
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const a = document.createElement('a');
    const projectInfo = projectData.projectInfo || {};
    const base = (projectInfo.prodName || 'ToshooT_Project').replace(/[^\w\-]+/g, '_');
    a.download = `${base}.filmproj`;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  } catch (err) {
    console.error('Save Project File failed:', err);
    alert('Failed to save project file.');
  }
}

function openProjectFile(event) {
  const file = event.target.files && event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.panelItems)) {
        throw new Error('Invalid project file');
      }
      projectData = {
        panelItems: parsed.panelItems || [],
        activeItemId: parsed.activeItemId ?? null,
        projectInfo: parsed.projectInfo || {}
      };
      saveProjectData();
      const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId && item.type === 'sequence');
      if (activeSequence && activeSequence.scenes && activeSequence.scenes.length > 0) {
        lastContactPerson = activeSequence.scenes[activeSequence.scenes.length - 1].contact || '';
        const contactInput = document.getElementById('scene-contact');
        if (contactInput) contactInput.value = lastContactPerson;
      }
      resetFilter();
      renderSchedule();
      renderSequencePanel();
      event.target.value = '';
    } catch (err) {
      console.error('Open Project File failed:', err);
      alert('Invalid or corrupted project file.');
    }
  };
  reader.readAsText(file);
}

// =================================================================
// --- MODAL LOGIC ---
// =================================================================
function openProjectModal() {
  const projectInfo = projectData.projectInfo || {};
  document.getElementById('prod-name').value = projectInfo.prodName || '';
  document.getElementById('director-name').value = projectInfo.directorName || '';
  document.getElementById('contact-number').value = projectInfo.contactNumber || '';
  document.getElementById('contact-email').value = projectInfo.contactEmail || '';
  document.getElementById('project-info-modal').style.display = 'block';
}
function closeProjectModal() { document.getElementById('project-info-modal').style.display = 'none'; }
function handleSaveProjectInfo() {
  projectData.projectInfo = {
    prodName: document.getElementById('prod-name').value,
    directorName: document.getElementById('director-name').value,
    contactNumber: document.getElementById('contact-number').value,
    contactEmail: document.getElementById('contact-email').value
  };
  saveProjectData();
  closeProjectModal();
}
function openEditModal(id) {
  const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
  if (!activeSequence) return;
  const scene = activeSequence.scenes.find(s => s.id === id);
  if (!scene) return;
  document.getElementById('edit-scene-id').value = scene.id;
  document.getElementById('edit-scene-number').value = scene.number;
  document.getElementById('edit-scene-heading').value = scene.heading;
  document.getElementById('edit-scene-date').value = scene.date;
  document.getElementById('edit-scene-time').value = scene.time;
  document.getElementById('edit-scene-type').value = scene.type;
  document.getElementById('edit-scene-location').value = scene.location;
  document.getElementById('edit-scene-pages').value = scene.pages;
  document.getElementById('edit-scene-duration').value = scene.duration;
  document.getElementById('edit-scene-status').value = scene.status;
  document.getElementById('edit-scene-cast').value = scene.cast;
  document.getElementById('edit-scene-equipment').value = scene.equipment;
  document.getElementById('edit-scene-contact').value = scene.contact;
  document.getElementById('edit-scene-modal').style.display = 'block';
}
function closeEditModal() { document.getElementById('edit-scene-modal').style.display = 'none'; }
function handleSaveChanges() {
  const sceneId = parseInt(document.getElementById('edit-scene-id').value);
  const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
  if (!activeSequence) return;
  const sceneIndex = activeSequence.scenes.findIndex(s => s.id === sceneId);
  if (sceneIndex === -1) return;
  activeSequence.scenes[sceneIndex] = {
    id: sceneId,
    number: document.getElementById('edit-scene-number').value,
    heading: document.getElementById('edit-scene-heading').value,
    date: document.getElementById('edit-scene-date').value,
    time: document.getElementById('edit-scene-time').value,
    type: document.getElementById('edit-scene-type').value,
    location: document.getElementById('edit-scene-location').value,
    pages: document.getElementById('edit-scene-pages').value,
    duration: document.getElementById('edit-scene-duration').value,
    status: document.getElementById('edit-scene-status').value,
    cast: document.getElementById('edit-scene-cast').value,
    equipment: document.getElementById('edit-scene-equipment').value,
    contact: document.getElementById('edit-scene-contact').value
  };
  saveProjectData();
  renderSchedule();
  closeEditModal();
}
function handleDeleteFromModal() {
  const sceneId = parseInt(document.getElementById('edit-scene-id').value);
  deleteScene(sceneId);
  closeEditModal();
}

// =================================================================
// --- EXPORT & SHARE FUNCTIONS ---
// =================================================================
function saveAsExcel(isFullProject = false) {
  const projectInfo = projectData.projectInfo || {};
  const workbook = XLSX.utils.book_new();

  const createSheet = (scenes, sheetName) => {
    let scheduleBreakName = 'Uncategorized';
    const sequenceIndex = projectData.panelItems.findIndex(item => item.name === sheetName && item.type === 'sequence');
    if (sequenceIndex > -1) {
      for (let i = sequenceIndex - 1; i >= 0; i--) {
        if (projectData.panelItems[i].type === 'schedule_break') {
          scheduleBreakName = projectData.panelItems[i].name; break;
        }
      }
    }
    const header = [
      ["Production:", projectInfo.prodName || 'N/A', "Director:", projectInfo.directorName || 'N/A'],
      ["Contact:", projectInfo.contactNumber || 'N/A', "Email:", projectInfo.contactEmail || 'N/A'],
      [],
      [`Schedule Break: ${scheduleBreakName}`],
      [`Sequence: ${sheetName}`],
      []
    ];
    const formattedScenes = scenes.map(s => ({ ...s, date: formatDateDDMMYYYY(s.date) }));
    const worksheet = XLSX.utils.aoa_to_sheet(header);
    worksheet['!merges'] = [
      { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } }
    ];
    XLSX.utils.sheet_add_json(worksheet, formattedScenes, { origin: `A${header.length + 1}`, skipHeader: false });
    return worksheet;
  };

  if (isFullProject) {
    projectData.panelItems.forEach(item => {
      if (item.type === 'sequence' && item.scenes.length > 0) {
        const worksheet = createSheet(item.scenes, item.name);
        XLSX.utils.book_append_sheet(workbook, worksheet, item.name.replace(/[/\\?*:[\]]/g, ''));
      }
    });
    if (workbook.SheetNames.length === 0) { alert("No scenes in any sequence to export."); return; }
    XLSX.writeFile(workbook, `${projectInfo.prodName || 'FullProject'}_Schedule.xlsx`);
  } else {
    const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
    if (!activeSequence) { alert("Please select a sequence to export."); return; }
    const scenesToExport = getVisibleScenes();
    if (scenesToExport.length === 0) { alert(`No visible scenes in "${activeSequence.name}" to export.`); return; }
    const worksheet = createSheet(scenesToExport, activeSequence.name);
    XLSX.utils.book_append_sheet(workbook, worksheet, activeSequence.name.replace(/[/\\?*:[\]]/g, ''));
    XLSX.writeFile(workbook, `${activeSequence.name}_Schedule.xlsx`);
  }
}

// --- Share helpers using html2canvas + Web Share API (with fallback) ---
async function shareProject() {
  try {
    const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId && item.type === 'sequence');
    const info = projectData.projectInfo || {};
    const seqName = activeSequence ? activeSequence.name : 'No Sequence';
    const sceneCount = activeSequence ? activeSequence.scenes.length : 0;

    const tpl = document.getElementById('share-card-template');
    tpl.innerHTML = `
      <div class="share-card-content">
        <div class="share-card-header">
          <h1>ToshooT</h1>
          <h2>Sequence: ${seqName}</h2>
        </div>
        <div class="share-card-item"><strong>Production:</strong> ${info.prodName || 'N/A'}</div>
        <div class="share-card-item"><strong>Director:</strong> ${info.directorName || 'N/A'}</div>
        <div class="share-card-item"><strong>Scenes:</strong> ${sceneCount}</div>
        <div class="share-card-footer">
          <div class="footer-project-info">
            <div><strong>Contact:</strong> ${info.contactNumber || 'N/A'}</div>
            <div><strong>Email:</strong> ${info.contactEmail || 'N/A'}</div>
          </div>
          <div class="footer-brand">Thosho Tech</div>
        </div>
      </div>
    `;

    const canvas = await html2canvas(tpl);
    await shareCanvasAsImage(canvas, `${(info.prodName || 'Project')}_${seqName}.png`);
  } catch (err) {
    console.error('shareProject failed', err);
    alert('Unable to share project card.');
  }
}

async function shareScene(id) {
  try {
    const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId && item.type === 'sequence');
    if (!activeSequence) return;
    const scene = activeSequence.scenes.find(s => s.id === id);
    if (!scene) return;

    const info = projectData.projectInfo || {};
    const tpl = document.getElementById('share-card-template');
    tpl.innerHTML = `
      <div class="share-card-content">
        <div class="share-card-header">
          <h1>ToshooT</h1>
          <h2>Scene #${scene.number || ''} — ${scene.heading || ''}</h2>
        </div>
        <div class="share-card-item"><strong>Date:</strong> ${formatDateDDMMYYYY(scene.date)}</div>
        <div class="share-card-item"><strong>Time:</strong> ${formatTime12Hour(scene.time)}</div>
        <div class="share-card-item"><strong>Type/Loc:</strong> ${scene.type || ''}. ${scene.location || ''}</div>
        <div class="share-card-item"><strong>Pages:</strong> ${scene.pages || 'N/A'}</div>
        <div class="share-card-item"><strong>Duration:</strong> ${scene.duration || 'N/A'}</div>
        <div class="share-card-item"><strong>Status:</strong> ${scene.status || 'N/A'}</div>
        <div class="share-card-item"><strong>Cast:</strong> ${scene.cast || 'N/A'}</div>
        <div class="share-card-item"><strong>Equipment:</strong> ${scene.equipment || 'N/A'}</div>
        <div class="share-card-item"><strong>Contact:</strong> ${scene.contact || 'N/A'}</div>
        <div class="share-card-footer">
          <div class="footer-project-info">
            <div><strong>Production:</strong> ${info.prodName || 'N/A'}</div>
            <div><strong>Director:</strong> ${info.directorName || 'N/A'}</div>
          </div>
          <div class="footer-brand">Thosho Tech</div>
        </div>
      </div>
    `;

    const canvas = await html2canvas(tpl);
    await shareCanvasAsImage(canvas, `Scene_${scene.number || 'N'}.png`);
  } catch (err) {
    console.error('shareScene failed', err);
    alert('Unable to share scene card.');
  }
}

async function shareCanvasAsImage(canvas, fileName) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      try {
        if (!blob) throw new Error('Blob conversion failed');
        const file = new File([blob], fileName, { type: blob.type });

        if ('canShare' in navigator && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'ToshooT', text: 'Schedule Share' });
          resolve();
          return;
        }

        const a = document.createElement('a');
        a.download = fileName;
        a.href = URL.createObjectURL(blob);
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 1000);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}

// =================================================================
// --- UTILITY FUNCTIONS ---
// =================================================================
function formatTime12Hour(timeString) {
  if (!timeString) return "N/A";
  const [hour, minute] = timeString.split(':');
  const hourInt = parseInt(hour, 10);
  const ampm = hourInt >= 12 ? 'PM' : 'AM';
  const hour12 = hourInt % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}
function formatDateDDMMYYYY(dateString) {
  if (!dateString || dateString.indexOf('-') === -1) return dateString || "N/A";
