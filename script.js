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

let currentPage = 1;
const scenesPerPage = 10;

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
// --- SETUP ALL EVENT LISTENERS ---
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
    
    const addDropdownListener = (id, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                handler(e);
                document.getElementById('dropdown-menu').classList.remove('show');
            });
        } else {
            console.error(`Error: Dropdown element with ID '${id}' not found.`);
        }
    };

    // NEW: Event listeners for the splash screen buttons
    safeAddListener('start-new-project-btn', 'click', () => {
        hideSplashScreen();
        openProjectModal();
    });

    safeAddListener('open-project-link', 'click', (e) => {
        e.preventDefault();
        // We don't hide the splash screen here, because if the user cancels
        // the file picker, we want them to stay on the splash screen.
        // It will be hidden after a file is successfully loaded.
        document.getElementById('file-input').click();
    });

    safeAddListener('schedule-form', 'submit', handleAddScene);

    const hamburgerBtn = document.getElementById('hamburger-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    if(hamburgerBtn && dropdownMenu) {
        hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdownMenu.classList.toggle('show'); });
    }
    
    addDropdownListener('new-project-btn', openProjectModal);
    addDropdownListener('open-project-btn', () => document.getElementById('file-input').click());
    addDropdownListener('new-sequence-btn', handleNewSequence);
    addDropdownListener('save-project-btn', saveProjectFile);
    addDropdownListener('save-excel-btn', () => saveAsExcel(true));
    addDropdownListener('share-project-btn', shareProject);
    addDropdownListener('clear-project-btn', clearProject);
    addDropdownListener('info-btn', () => document.getElementById('info-modal').style.display = 'block');
    addDropdownListener('about-btn', () => document.getElementById('about-modal').style.display = 'block');
    
    const autoSaveBtn = document.getElementById('auto-save-btn');
    if(autoSaveBtn) autoSaveBtn.addEventListener('click', (e) => { e.preventDefault(); toggleAutoSave(); });

    safeAddListener('file-input', 'change', openProjectFile);

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
// --- SPLASH SCREEN LOGIC ---
// =================================================================
function hideSplashScreen() {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('main-app-container').style.display = 'block';
}

// =================================================================
// --- DRAG-AND-DROP INITIALIZATION ---
// =================================================================
function initializeDragAndDrop() {
    const listContainer = document.getElementById('sequence-list');
    if(listContainer){
        new Sortable(listContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                const item = projectData.panelItems.splice(evt.oldIndex, 1)[0];
                projectData.panelItems.splice(evt.newIndex, 0, item);
                saveProjectData();
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

function handleEditItem(id) {
    const item = projectData.panelItems.find(i => i.id === id);
    if (!item) return;
    const newName = prompt("Enter the new name:", item.name);
    if (newName !== null && newName.trim() !== "") {
        item.name = newName.trim();
        saveProjectData();
        renderSequencePanel(); 
        renderSchedule();    
    }
}

function setActiveItem(id) {
    const item = projectData.panelItems.find(i => i.id === id);
    if (item && item.type === 'sequence') {
        projectData.activeItemId = id;
        resetFilter(); 
        saveProjectData();
        renderSequencePanel();
        document.getElementById('sequence-panel').classList.remove('open');
    }
}

function renderSequencePanel() {
    const listContainer = document.getElementById('sequence-list');
    listContainer.innerHTML = '';
    projectData.panelItems.forEach(item => {
        const element = document.createElement('div');
        element.dataset.id = item.id;

        const itemName = document.createElement('span');
        itemName.className = 'panel-item-name';
        itemName.textContent = item.name;

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-item-btn';
        editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        editBtn.title = 'Edit Name';
        editBtn.onclick = (e) => {
            e.stopPropagation(); 
            handleEditItem(item.id);
        };

        if (item.type === 'sequence') {
            element.className = `sequence-item ${item.id === projectData.activeItemId && activeFilter.type === 'all' ? 'active' : ''}`;
            element.onclick = () => setActiveItem(item.id);
        } else if (item.type === 'schedule_break') {
            element.className = 'schedule-break-item';
        }

        element.appendChild(itemName);
        element.appendChild(editBtn);
        listContainer.appendChild(element);
    });
}


// =================================================================
// --- FILTERING LOGIC ---
// =================================================================
function handleFilterChange(e) {
    const filterType = document.getElementById('filter-by-select').value;
    const filterControls = document.getElementById('filter-controls');
    filterControls.innerHTML = ''; 
    
    if (filterType === 'all') {
        activeFilter = { type: 'all', value: '' };
        renderSchedule();
        return;
    }

    let inputElement;
    const textFilters = ['cast', 'shootLocation', 'sceneSetting'];
    const selectFilters = {
        status: ['Pending', 'NOT SHOT', 'Done'],
        dayNight: ['DAY', 'NIGHT'],
        type: ['INT', 'EXT', 'INT/EXT']
    };

    if (filterType === 'date') {
        inputElement = document.createElement('input');
        inputElement.type = 'date';
    } else if (textFilters.includes(filterType)) {
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.placeholder = `Enter ${filterType.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
    } else if (Object.keys(selectFilters).includes(filterType)) {
        inputElement = document.createElement('select');
        let optionsHTML = `<option value="">Select ${filterType.replace(/([A-Z])/g, ' $1').toLowerCase()}</option>`;
        selectFilters[filterType].forEach(option => {
            optionsHTML += `<option value="${option}">${option}</option>`;
        });
        inputElement.innerHTML = optionsHTML;
    }

    if (inputElement) {
        inputElement.className = 'panel-sort';
        const updateFilter = (e) => {
            activeFilter = { type: filterType, value: e.target.value.trim().toLowerCase() };
            renderSchedule();
        };
        inputElement.addEventListener('change', updateFilter);
        if (inputElement.type === 'text') {
             inputElement.addEventListener('keyup', updateFilter);
        }
        filterControls.appendChild(inputElement);
    }
    
    activeFilter = { type: filterType, value: '' }; 
    renderSchedule(); 
}

function getGloballyFilteredResults() {
    const results = [];
    const orderedPanelItems = getOrderedPanelItems();
    let currentScheduleBreak = 'Uncategorized';

    orderedPanelItems.forEach(item => {
        if (item.type === 'schedule_break') {
            currentScheduleBreak = item.name;
        } else if (item.type === 'sequence' && item.scenes) {
            const matchingScenes = item.scenes.filter(scene => {
                const sceneProperty = scene[activeFilter.type];
                if (sceneProperty === undefined || sceneProperty === null) return false;
                const sceneValue = sceneProperty.toString().toLowerCase();
                const filterValue = activeFilter.value.toLowerCase();
                return sceneValue.includes(filterValue);
            });

            if (matchingScenes.length > 0) {
                results.push({
                    scheduleBreak: currentScheduleBreak,
                    sequence: item,
                    scenes: matchingScenes
                });
            }
        }
    });
    return results;
}

function getVisibleScenes() {
    const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
    if (!activeSequence || !activeSequence.scenes) return [];
    return activeSequence.scenes;
}

function resetFilter() {
    activeFilter = { type: 'all', value: '' };
    currentPage = 1;
    document.getElementById('filter-controls').innerHTML = '';
    const filterSelect = document.getElementById('filter-by-select');
    if (filterSelect) filterSelect.value = 'all';
    renderSchedule();
}

// =================================================================
// --- CORE SCHEDULE FUNCTIONS ---
// =================================================================
function handleAddScene(e) {
    e.preventDefault();
    let activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
    if (!activeSequence || activeSequence.type !== 'sequence') {
        alert("Please select a sequence before adding a scene.");
        return;
    }
    
    const newScene = {
        id: Date.now(), description: document.getElementById('scene-description').value,
        number: document.getElementById('scene-number').value, sceneSetting: document.getElementById('scene-setting').value,
        dayNight: document.getElementById('day-night').value, date: document.getElementById('scene-date').value,
        time: document.getElementById('scene-time').value, type: document.getElementById('scene-type').value,
        shootLocation: document.getElementById('shoot-location').value, pages: document.getElementById('scene-pages').value,
        duration: document.getElementById('scene-duration').value, status: document.getElementById('scene-status').value,
        cast: document.getElementById('scene-cast').value, equipment: document.getElementById('scene-equipment').value,
        contact: document.getElementById('scene-contact').value, notes: document.getElementById('scene-notes').value,
    };
    activeSequence.scenes.push(newScene);
    lastContactPerson = newScene.contact;
    saveProjectData();
    renderSchedule();
    e.target.reset();
    document.getElementById('scene-contact').value = lastContactPerson;
}

function renderSchedule() {
    const container = document.getElementById('scene-strips-container');
    const display = document.getElementById('active-sequence-display');
    const pagination = document.getElementById('pagination-controls');
    container.innerHTML = '';
    pagination.innerHTML = '';

    const isGlobalFilterActive = activeFilter.type !== 'all' && activeFilter.value !== '';

    if (isGlobalFilterActive) {
        const filterName = document.querySelector(`#filter-by-select option[value="${activeFilter.type}"]`).textContent;
        display.textContent = `Filtered Results for: "${activeFilter.value}" in ${filterName}`;
        
        const results = getGloballyFilteredResults();
        
        if (results.length === 0) {
            container.innerHTML = `<p style="text-align:center; color: #9ca3af;">No scenes found matching the filter.</p>`;
            return;
        }

        let lastBreak = null;
        results.forEach(result => {
            if (result.scheduleBreak !== lastBreak) {
                const breakHeader = document.createElement('div');
                breakHeader.className = 'schedule-break-header';
                breakHeader.textContent = result.scheduleBreak;
                container.appendChild(breakHeader);
                lastBreak = result.scheduleBreak;
            }

            const seqHeader = document.createElement('div');
            seqHeader.className = 'sequence-header';
            seqHeader.textContent = result.sequence.name;
            container.appendChild(seqHeader);

            result.scenes.forEach(scene => renderSceneStrip(scene, container));
        });

    } else {
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if (!activeSequence || activeSequence.type !== 'sequence') {
            display.textContent = 'No active sequence. Create or select a sequence.';
            return;
        }
        
        display.textContent = `Current Sequence: ${activeSequence.name}`;
        const allScenes = getVisibleScenes();
        
        const startIndex = (currentPage - 1) * scenesPerPage;
        const endIndex = startIndex + scenesPerPage;
        const paginatedScenes = allScenes.slice(startIndex, endIndex);

        if (allScenes.length === 0) {
            container.innerHTML = `<p style="text-align:center; color: #9ca3af;">No scenes yet. Add one below!</p>`;
        } else {
            paginatedScenes.forEach(scene => renderSceneStrip(scene, container));
        }
        renderPaginationControls(allScenes.length, scenesPerPage);
    }
}

function renderSceneStrip(scene, container) {
    const stripWrapper = document.createElement('div');
    stripWrapper.className = 'scene-strip-wrapper';
    const statusClass = (scene.status || '').replace(/\s+/g, '-').toLowerCase();
    stripWrapper.innerHTML = `
        <div class="scene-strip" id="scene-strip-${scene.id}">
            <div class="strip-item"><strong>#${scene.number}</strong></div>
            <div class="strip-item">${scene.type || ''} ${scene.sceneSetting || ''} - ${scene.dayNight || ''}</div>
            <div class="strip-item">${(scene.description || '').substring(0, 50)}...</div>
            <div class="strip-item">${formatDateDDMMYYYY(scene.date)}</div><div class="strip-item">${formatTime12Hour(scene.time)}</div>
            <div class="strip-item">Location: <strong>${scene.shootLocation}</strong></div>
            <div class="strip-item">Pages: <strong>${scene.pages || 'N/A'}</strong></div>
            <div class="strip-item">Cast: <strong>${scene.cast || 'N/A'}</strong></div>
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
}


function renderPaginationControls(totalItems, itemsPerPage) {
    const container = document.getElementById('pagination-controls');
    container.innerHTML = '';
    if (totalItems <= itemsPerPage) return;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.className = 'btn-primary';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderSchedule();
        }
    });

    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.className = 'btn-primary';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderSchedule();
        }
    });

    container.appendChild(prevButton);
    container.appendChild(pageInfo);
    container.appendChild(nextButton);
}


function deleteScene(id) {
    projectData.panelItems.forEach(item => {
        if (item.type === 'sequence' && item.scenes) {
            item.scenes = item.scenes.filter(scene => scene.id !== id);
        }
    });
    saveProjectData();
    renderSchedule();
}

// =================================================================
// --- DATA PERSISTENCE & PROJECT FILES ---
// =================================================================
// MODIFIED: This function now decides whether to show the splash screen or the main app.
function loadProjectData() {
    let savedData = localStorage.getItem('projectData');
    
    // NEW: Check if data exists
    if (!savedData) {
        // NO DATA: Show the splash screen
        document.getElementById('splash-screen').style.display = 'flex';
        return; // Stop here, don't load anything else
    }

    // DATA EXISTS: Hide splash and show the main app
    hideSplashScreen();

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

// MODIFIED: When clearing a project, reload the app to show the splash screen again.
function clearProject() {
    if (confirm('Are you sure you want to clear the entire project? This action cannot be undone.')) {
        localStorage.removeItem('projectData');
        localStorage.removeItem('projectData_backup');
        location.reload(); // Reload the page to show the splash screen
    }
}

// MODIFIED: When opening a file, hide the splash screen on success.
function openProjectFile(event) {
    const file = event.target.files[0];
    if (!file) { return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data && typeof data === 'object' && Array.isArray(data.panelItems) && data.hasOwnProperty('projectInfo')) {
                projectData = data;
                if (!projectData.projectInfo) projectData.projectInfo = {};
                if (!projectData.panelItems) projectData.panelItems = [];
                if (projectData.activeItemId === null && projectData.panelItems.length > 0) {
                    const firstSequence = projectData.panelItems.find(i => i.type === 'sequence');
                    if (firstSequence) projectData.activeItemId = firstSequence.id;
                }
                saveProjectData();
                hideSplashScreen(); // <-- Hide splash screen on success
                loadProjectData(); // Reload the UI with the new data
                alert("Project loaded successfully.");
            } else {
                alert("Invalid project file format.");
            }
        } catch (error) {
            console.error("Error opening project file:", error);
            alert("Could not open project file. It may be corrupted or in the wrong format.");
        } finally {
            event.target.value = '';
        }
    };
    reader.onerror = () => {
        alert("Error reading file.");
        event.target.value = '';
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
        prodName: document.getElementById('prod-name').value, directorName: document.getElementById('director-name').value,
        contactNumber: document.getElementById('contact-number').value, contactEmail: document.getElementById('contact-email').value
    };
    saveProjectData();
    closeProjectModal();
}

function openEditModal(id) {
    let scene, sequence;
    for (const item of projectData.panelItems) {
        if (item.type === 'sequence' && item.scenes) {
            const foundScene = item.scenes.find(s => s.id === id);
            if (foundScene) {
                scene = foundScene;
                sequence = item;
                break;
            }
        }
    }

    if (!scene) return;
    
    document.getElementById('edit-scene-id').value = scene.id;
    document.getElementById('edit-scene-number').value = scene.number || '';
    document.getElementById('edit-scene-description').value = scene.description || '';
    document.getElementById('edit-scene-setting').value = scene.sceneSetting || '';
    document.getElementById('edit-day-night').value = scene.dayNight || 'DAY';
    document.getElementById('edit-scene-date').value = scene.date || '';
    document.getElementById('edit-scene-time').value = scene.time || '';
    document.getElementById('edit-scene-type').value = scene.type || 'INT';
    document.getElementById('edit-shoot-location').value = scene.shootLocation || '';
    document.getElementById('edit-scene-pages').value = scene.pages || '';
    document.getElementById('edit-scene-duration').value = scene.duration || '';
    document.getElementById('edit-scene-status').value = scene.status || 'Pending';
    document.getElementById('edit-scene-cast').value = scene.cast || '';
    document.getElementById('edit-scene-equipment').value = scene.equipment || '';
    document.getElementById('edit-scene-contact').value = scene.contact || '';
    document.getElementById('edit-scene-notes').value = scene.notes || '';
    document.getElementById('edit-scene-modal').style.display = 'block';
}
function closeEditModal() { document.getElementById('edit-scene-modal').style.display = 'none'; }

function handleSaveChanges() {
    const sceneId = parseInt(document.getElementById('edit-scene-id').value);
    let sceneIndex = -1;
    let sequence;

    for (const item of projectData.panelItems) {
        if (item.type === 'sequence' && item.scenes) {
            sceneIndex = item.scenes.findIndex(s => s.id === sceneId);
            if (sceneIndex !== -1) {
                sequence = item;
                break;
            }
        }
    }

    if (!sequence || sceneIndex === -1) return;

    sequence.scenes[sceneIndex] = {
        id: sceneId,
        number: document.getElementById('edit-scene-number').value, description: document.getElementById('edit-scene-description').value,
        sceneSetting: document.getElementById('edit-scene-setting').value, dayNight: document.getElementById('edit-day-night').value,
        date: document.getElementById('edit-scene-date').value, time: document.getElementById('edit-scene-time').value,
        type: document.getElementById('edit-scene-type').value, shootLocation: document.getElementById('edit-shoot-location').value,
        pages: document.getElementById('edit-scene-pages').value, duration: document.getElementById('edit-scene-duration').value,
        status: document.getElementById('edit-scene-status').value, cast: document.getElementById('edit-scene-cast').value,
        equipment: document.getElementById('edit-scene-equipment').value, contact: document.getElementById('edit-scene-contact').value,
        notes: document.getElementById('edit-scene-notes').value
    };
    saveProjectData();
    renderSchedule();
    closeEditModal();
}
function handleDeleteFromModal() {
    if(confirm("Are you sure you want to delete this scene?")) {
        const sceneId = parseInt(document.getElementById('edit-scene-id').value);
        deleteScene(sceneId);
        closeEditModal();
    }
}

// =================================================================
// --- EXPORT & SHARE FUNCTIONS ---
// =================================================================
function getOrderedPanelItems() {
    const listContainer = document.getElementById('sequence-list');
    if (!listContainer) return projectData.panelItems;
    const itemElements = Array.from(listContainer.children);
    const orderedIds = itemElements.map(el => parseInt(el.dataset.id));
    const idMap = new Map(projectData.panelItems.map(item => [item.id, item]));
    const orderedItems = orderedIds.map(id => idMap.get(id)).filter(Boolean);
    return orderedItems;
}


function saveAsExcel(isFullProject = false) {
    const projectInfo = projectData.projectInfo || {};
    const workbook = XLSX.utils.book_new();
    const orderedPanelItems = getOrderedPanelItems();

    try {
        if (isFullProject) {
            let exportedCount = 0;
            orderedPanelItems.forEach(item => {
                if (item.type === 'sequence' && item.scenes && item.scenes.length > 0) {
                    const worksheet = createSheet(item, item.scenes, orderedPanelItems);
                    const safeSheetName = item.name.replace(/[/\\?*:[\]]/g, '').substring(0, 31);
                    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
                    exportedCount++;
                }
            });
            if (exportedCount === 0) {
                alert("Export failed: No sequences with scenes were found in your project.");
                return;
            }
            XLSX.writeFile(workbook, `${(projectInfo.prodName || 'FullProject').replace(/[^a-zA-Z0-9]/g, '_')}_Schedule.xlsx`);
            alert(`Successfully exported ${exportedCount} sequence(s) into a single Excel file.`);

        } else {
            const isGlobalFilterActive = activeFilter.type !== 'all' && activeFilter.value !== '';
            if (isGlobalFilterActive) {
                const results = getGloballyFilteredResults();
                if (results.length === 0) {
                    alert("No scenes match the current filter to export.");
                    return;
                }
                const dataForSheet = [
                    ['Production:', projectInfo.prodName || 'N/A'], ['Director:', projectInfo.directorName || 'N/A'], [],
                    [`Filter: ${activeFilter.type} = "${activeFilter.value}"`], []
                ];
                const tableHeader = ['Schedule Break', 'Sequence', 'Scene #', 'Scene Description', 'Scene Setting', 'Day/Night', 'Date', 'Time', 'Type', 'Shoot Location', 'Pages', 'Duration', 'Status', 'Cast', 'Equipment', 'Contact', 'Notes'];
                dataForSheet.push(tableHeader);
                results.forEach(result => {
                    result.scenes.forEach(s => {
                        dataForSheet.push([
                            result.scheduleBreak, result.sequence.name, s.number, s.description, s.sceneSetting, s.dayNight, formatDateDDMMYYYY(s.date), s.time, s.type, s.shootLocation, s.pages, s.duration, s.status, s.cast, s.equipment, s.contact, s.notes
                        ]);
                    });
                });
                const worksheet = XLSX.utils.aoa_to_sheet(dataForSheet);
                XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Results");
                XLSX.writeFile(workbook, `Filtered_Results_Schedule.xlsx`);
                alert(`Successfully exported filtered results.`);
            } else {
                const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
                if (!activeSequence) { alert("Please select a sequence to export."); return; }
                const scenesToExport = getVisibleScenes();
                if (scenesToExport.length === 0) { alert(`No scenes in "${activeSequence.name}" to export.`); return; }
                const worksheet = createSheet(activeSequence, scenesToExport, orderedPanelItems);
                XLSX.utils.book_append_sheet(workbook, worksheet, activeSequence.name.replace(/[/\\?*:[\]]/g, '').substring(0, 31));
                XLSX.writeFile(workbook, `${activeSequence.name.replace(/[^a-zA-Z0-9]/g, '_')}_Schedule.xlsx`);
                alert(`Successfully exported the "${activeSequence.name}" sequence.`);
            }
        }
    } catch (error) {
        console.error("Excel Export Error:", error);
        alert("An error occurred while creating the Excel file. Please check the console for details.");
    }
}

function createSheet(sequence, scenesToPrint, panelItems) {
    const projectInfo = projectData.projectInfo || {};
    let scheduleBreakName = 'Uncategorized';
    const sequenceIndex = panelItems.findIndex(item => item.id === sequence.id);
    if (sequenceIndex > -1) {
        for (let i = sequenceIndex - 1; i >= 0; i--) {
            if (panelItems[i].type === 'schedule_break') {
                scheduleBreakName = panelItems[i].name;
                break;
            }
        }
    }
    const projectHeader = [
        ["Production:", projectInfo.prodName || 'N/A', null, "Director:", projectInfo.directorName || 'N/A'],
        ["Contact:", projectInfo.contactNumber || 'N/A', null, "Email:", projectInfo.contactEmail || 'N/A'],
        [],
        [`Schedule Break: ${scheduleBreakName}`], [`Sequence: ${sequence.name}`], []
    ];
    const tableHeader = ['Scene #', 'Scene Description', 'Scene Setting', 'Day/Night', 'Date', 'Time', 'Type', 'Shoot Location', 'Pages', 'Duration', 'Status', 'Cast', 'Key Equipment', 'Contact', 'Notes'];
    const tableBody = scenesToPrint.map(s => [s.number, s.description, s.sceneSetting, s.dayNight, formatDateDDMMYYYY(s.date), s.time, s.type, s.shootLocation, s.pages, s.duration, s.status, s.cast, s.equipment, s.contact, s.notes]);
    const fullSheetData = projectHeader.concat([tableHeader]).concat(tableBody);
    const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);
    return worksheet;
}


async function shareProject() {
    const projectInfo = projectData.projectInfo || {};
    const totalSequences = projectData.panelItems.filter(i => i.type === 'sequence').length;
    const totalScenes = projectData.panelItems
        .filter(i => i.type === 'sequence')
        .reduce((sum, seq) => sum + (seq.scenes ? seq.scenes.length : 0), 0);
    const shareText = `*ToshooT Project Summary*\nProduction: ${projectInfo.prodName || 'N/A'}\nDirector: ${projectInfo.directorName || 'N/A'}\nContact: ${projectInfo.contactNumber || 'N/A'}\n\nTotal Sequences: ${totalSequences}\nTotal Scenes: ${totalScenes}`;
    if (navigator.share) {
        try { await navigator.share({ title: `Project: ${projectInfo.prodName || 'Untitled'}`, text: shareText }); } catch (err) { console.error("Share failed:", err); }
    } else {
        try { await navigator.clipboard.writeText(shareText); alert("Project info copied to clipboard!"); } catch (err) { alert("Sharing is not supported on this browser, and copying to clipboard failed."); }
    }
}

async function shareScene(id) {
    let scene, sequence;
    for (const item of projectData.panelItems) {
        if (item.type === 'sequence' && item.scenes) {
            const foundScene = item.scenes.find(s => s.id === id);
            if (foundScene) { scene = foundScene; sequence = item; break; }
        }
    }
    if (!scene || !sequence) return;
    const projectInfo = projectData.projectInfo || {};
    let scheduleBreakName = 'Uncategorized';
    const orderedPanelItems = getOrderedPanelItems();
    const sequenceIndex = orderedPanelItems.findIndex(item => item.id === sequence.id);
    if (sequenceIndex > -1) {
        for (let i = sequenceIndex - 1; i >= 0; i--) {
            if (orderedPanelItems[i].type === 'schedule_break') {
                scheduleBreakName = orderedPanelItems[i].name;
                break;
            }
        }
    }
    const notesHTML = scene.notes ? `<div class="share-card-item"><strong>Notes:</strong> ${scene.notes}</div>` : '';
    const template = document.getElementById('share-card-template');
    template.innerHTML = `
        <div class="share-card-content">
            <div class="share-card-header">
                <h1>Scene ${scene.number || 'N/A'}</h1>
                <h2>${scheduleBreakName} / ${sequence.name}</h2>
            </div>
            <div class="share-card-item"><strong>Scene Setting:</strong> ${scene.type || ''} ${scene.sceneSetting || ''} - ${scene.dayNight || ''}</div>
            <div class="share-card-item description"><strong>Description:</strong> ${scene.description || 'N/A'}</div>
            <div class="share-card-item"><strong>Pages:</strong> ${scene.pages || 'N/A'}</div>
            <div class="share-card-item"><strong>Cast:</strong> ${scene.cast || 'N/A'}</div>
            <div class="share-card-item"><strong>Date:</strong> ${formatDateDDMMYYYY(scene.date)}</div>
            <div class="share-card-item"><strong>Time:</strong> ${formatTime12Hour(scene.time)}</div>
            <div class="share-card-item"><strong>Shoot Location:</strong> ${scene.shootLocation || 'N/A'}</div>
            <div class="share-card-item"><strong>Contact:</strong> ${scene.contact || 'N/A'}</div>
            ${notesHTML}
            <div class="share-card-footer">
                <div class="footer-project-info">
                    <div><strong>${projectInfo.prodName || 'Production'}</strong></div>
                    <div>${projectInfo.directorName ? 'Dir: ' + projectInfo.directorName : ''}</div>
                </div>
                <div class="footer-brand">ToassisT App</div>
            </div>
        </div>
    `;
   try {
        const canvas = await html2canvas(template, { useCORS: true, backgroundColor: '#1f2937' });
        canvas.toBlob(async (blob) => {
            const fileName = `Scene_${scene.number}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ title: `Shooting Info: Scene ${scene.number}`, text: `Details for Scene ${scene.number}`, files: [file] });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                link.click();
                URL.revokeObjectURL(link.href);
            }
        }, 'image/png');
    } catch (err) { console.error("Failed to share scene:", err); alert("Could not generate shareable image."); }
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
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}
function toggleAutoSave() {
    const statusEl = document.getElementById('auto-save-status');
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        statusEl.textContent = 'OFF';
        statusEl.className = 'auto-save-status off';
    } else {
        autoSaveInterval = setInterval(() => { saveProjectData(false); saveProjectData(true); }, 120000); 
        statusEl.textContent = 'ON';
        statusEl.className = 'auto-save-status on';
        alert('Auto-save is now ON. Your project will be saved to this browser\'s storage every 2 minutes.');
    }
}
