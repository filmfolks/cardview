// =================================================================
// --- GLOBAL STATE & INITIALIZATION ---
// =================================================================
let scheduleData = [];
let lastContactPerson = '';

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const newProjectBtn = document.getElementById('new-project-btn');
    const saveExcelBtn = document.getElementById('save-excel-btn');
    const scheduleForm = document.getElementById('schedule-form');
    
    // --- MODAL SELECTORS ---
    const projectModal = document.getElementById('project-info-modal');
    const editModal = document.getElementById('edit-scene-modal');
    
    // --- INITIAL PAGE LOAD ---
    if (scheduleForm) {
        const contactInput = document.getElementById('scene-contact');
        loadScheduleData();
        if (contactInput) contactInput.value = lastContactPerson;
    }

    // --- EVENT LISTENERS ---
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
    }

    document.addEventListener('click', (event) => {
        if (dropdownMenu && !dropdownMenu.contains(event.target) && !hamburgerBtn.contains(event.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    if (scheduleForm) {
        scheduleForm.addEventListener('submit', handleAddScene);
    }
    
    if (newProjectBtn) newProjectBtn.addEventListener('click', openProjectModal);
    if (saveExcelBtn) saveExcelBtn.addEventListener('click', saveAsExcel);
    
    // Project Modal Listeners
    if (projectModal) {
        projectModal.querySelector('#close-project-modal').addEventListener('click', closeProjectModal);
        document.getElementById('save-project-info-btn').addEventListener('click', handleSaveProjectInfo);
    }

    // Edit Modal Listeners
    if (editModal) {
        editModal.querySelector('#close-edit-modal').addEventListener('click', closeEditModal);
        document.getElementById('save-changes-btn').addEventListener('click', handleSaveChanges);
        document.getElementById('delete-scene-btn').addEventListener('click', handleDeleteFromModal);
    }

    // Close modals with a click on the background overlay
    window.onclick = (event) => {
        if (event.target == projectModal) closeProjectModal();
        if (event.target == editModal) closeEditModal();
    };
});


// =================================================================
// --- CORE SCHEDULE FUNCTIONS ---
// =================================================================
function handleAddScene(e) {
    e.preventDefault();
    const newScene = {
        id: Date.now(), number: document.getElementById('scene-number').value,
        heading: document.getElementById('scene-heading').value, date: document.getElementById('scene-date').value,
        time: document.getElementById('scene-time').value, type: document.getElementById('scene-type').value,
        location: document.getElementById('scene-location').value, pages: document.getElementById('scene-pages').value,
        duration: document.getElementById('scene-duration').value, status: document.getElementById('scene-status').value,
        cast: document.getElementById('scene-cast').value, equipment: document.getElementById('scene-equipment').value,
        contact: document.getElementById('scene-contact').value,
    };
    lastContactPerson = newScene.contact;
    scheduleData.push(newScene);
    saveScheduleData();
    renderSchedule();
    e.target.reset();
    document.getElementById('scene-contact').value = lastContactPerson;
}

function renderSchedule() {
    const container = document.getElementById('scene-strips-container');
    if (!container) return;
    container.innerHTML = ''; 

    scheduleData.forEach(scene => {
        const stripWrapper = document.createElement('div');
        stripWrapper.className = 'scene-strip-wrapper';
        const statusClass = scene.status.toLowerCase();
        stripWrapper.innerHTML = `
            <div class="scene-strip" id="scene-strip-${scene.id}">
                <div class="strip-item"><strong>#${scene.number}</strong></div>
                <div class="strip-item">${scene.heading}</div>
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

function saveScheduleData() { localStorage.setItem('scheduleData', JSON.stringify(scheduleData)); }

function loadScheduleData() {
    const savedData = localStorage.getItem('scheduleData');
    scheduleData = savedData ? JSON.parse(savedData) : [];
    if (scheduleData.length > 0) { lastContactPerson = scheduleData[scheduleData.length - 1].contact || ''; }
    renderSchedule();
}

// =================================================================
// --- MODAL & EDITING LOGIC ---
// =================================================================
function openProjectModal() {
    const projectInfo = JSON.parse(localStorage.getItem('projectInfo')) || {};
    document.getElementById('prod-name').value = projectInfo.prodName || '';
    document.getElementById('director-name').value = projectInfo.directorName || '';
    document.getElementById('contact-number').value = projectInfo.contactNumber || '';
    document.getElementById('contact-email').value = projectInfo.contactEmail || '';
    document.getElementById('project-info-modal').style.display = 'block';
}

function closeProjectModal() { document.getElementById('project-info-modal').style.display = 'none'; }

function handleSaveProjectInfo() {
    const projectInfo = {
        prodName: document.getElementById('prod-name').value, directorName: document.getElementById('director-name').value,
        contactNumber: document.getElementById('contact-number').value, contactEmail: document.getElementById('contact-email').value
    };
    localStorage.setItem('projectInfo', JSON.stringify(projectInfo));
    closeProjectModal();
}

function openEditModal(id) {
    const scene = scheduleData.find(s => s.id === id);
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
    const sceneIndex = scheduleData.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    scheduleData[sceneIndex] = {
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

    saveScheduleData();
    renderSchedule();
    closeEditModal();
}

function handleDeleteFromModal() {
    const sceneId = parseInt(document.getElementById('edit-scene-id').value);
    if (confirm('Are you sure you want to permanently delete this scene?')) {
        scheduleData = scheduleData.filter(scene => scene.id !== sceneId);
        saveScheduleData();
        renderSchedule();
        closeEditModal();
    }
}

// =================================================================
// --- EXPORT & SHARE FUNCTIONS ---
// =================================================================
function saveAsExcel() {
    if (scheduleData.length === 0) { alert("No schedule data to export."); return; }
    const worksheet = XLSX.utils.json_to_sheet(scheduleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shooting Schedule");
    XLSX.writeFile(workbook, "ShootingSchedule.xlsx");
}

async function shareScene(id) {
    const template = document.getElementById('share-card-template');
    const scene = scheduleData.find(s => s.id === id); 
    const projectInfo = JSON.parse(localStorage.getItem('projectInfo')) || {};

    if (!template || !scene) return;
    
    let footerHtml = `<div class="footer-project-info">
            ${projectInfo.prodName ? `<div>${projectInfo.prodName}</div>` : ''}
            ${projectInfo.directorName ? `<div>Dir: ${projectInfo.directorName}</div>` : ''}
        </div><div class="footer-brand">@Thosho Tech</div>`;

    template.innerHTML = `<div class="share-card-content">
            <div class="share-card-header"><h1>Scene #${scene.number}</h1><h2>${scene.heading}</h2></div>
            <p class="share-card-item"><strong>Date:</strong> ${scene.date}</p>
            <p class="share-card-item"><strong>Time:</strong> ${formatTime12Hour(scene.time)}</p>
            <p class="share-card-item"><strong>Location:</strong> ${scene.type}. ${scene.location}</p>
            <p class="share-card-item"><strong>Cast:</strong> ${scene.cast || 'N/A'}</p>
            <p class="share-card-item"><strong>Contact:</strong> 📞 ${scene.contact || 'N/A'}</p>
            <div class="share-card-footer">${footerHtml}</div></div>`;

    try {
        const canvas = await html2canvas(template, { scale: 2 });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], `scene_${scene.number}.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Shooting Schedule - Scene ${scene.number}` });
        } else {
            const imgUrl = URL.createObjectURL(blob);
            window.open(imgUrl, '_blank');
        }
    } catch (error) { console.error('Sharing failed:', error); }
}

function formatTime12Hour(timeString) {
    if (!timeString) return "N/A";
    const [hour, minute] = timeString.split(':');
    const hourInt = parseInt(hour, 10);
    const ampm = hourInt >= 12 ? 'PM' : 'AM';
    const hour12 = hourInt % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
}
