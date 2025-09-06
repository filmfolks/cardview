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
                if (document.getElementById('dropdown-menu')) {
                    document.getElementById('dropdown-menu').classList.remove('show');
                }
            });
        } else {
            console.error(`Error: Dropdown element with ID '${id}' not found.`);
        }
    };

    // Splash screen listeners
    safeAddListener('start-new-project-btn', 'click', () => {
        hideSplashScreen();
        openProjectModal();
    });

    safeAddListener('open-project-link', 'click', (e) => {
        e.preventDefault();
        document.getElementById('file-input').click();
    });

    // Main app listeners
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
// --- SPLASH SCREEN & APP VISIBILITY ---
// =================================================================
function hideSplashScreen() {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('main-app-container').style.display = 'block';
}

function showSplashScreen() {
    document.getElementById('splash-screen').style.display = 'flex';
    document.getElementById('main-app-container').style.display = 'none';
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

// ... All other JavaScript functions go here, unchanged from the last correct version ...
// To save space, only the corrected openProjectFile function is shown below, but you should have the full file.

// =================================================================
// --- DATA PERSISTENCE & PROJECT FILES ---
// =================================================================
function saveProjectData(isBackup = false) {
    const key = 'projectData';
    localStorage.setItem(key, JSON.stringify(projectData));
}

function loadProjectData() {
    let savedData = localStorage.getItem('projectData');
    if (!savedData) {
        showSplashScreen();
        return; 
    }
    hideSplashScreen();
    projectData = JSON.parse(savedData);
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
    if (confirm('Are you sure you want to clear the entire project? This action cannot be undone.')) {
        localStorage.removeItem('projectData');
        localStorage.removeItem('projectData_backup');
        location.reload();
    }
}

// CORRECTED: This function now properly renders the UI after loading a file.
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
                hideSplashScreen(); 
                
                // FIXED: Call the render functions directly instead of loadProjectData()
                renderSequencePanel();
                renderSchedule();

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

// ... All your other functions go here ...
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
function setStatusBarHeight(heightInPixels) {
    const pageHeader = document.querySelector('.page-header');
    if (pageHeader) {
        pageHeader.style.paddingTop = `${heightInPixels}px`;
    }
}
