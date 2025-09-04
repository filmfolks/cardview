document.addEventListener('DOMContentLoaded', () => {
    // --- CATEGORY DEFINITIONS ---
    const categories = [
        { key: 'cast', title: 'Cast', icon: 'fa-user-ninja', color: 'var(--color-cast)' },
        { key: 'props', title: 'Props', icon: 'fa-magic-wand-sparkles', color: 'var(--color-props)' },
        { key: 'costumes', title: 'Costumes & Wardrobe', icon: 'fa-shirt', color: 'var(--color-costumes)' },
        { key: 'makeup', title: 'Hair & Makeup', icon: 'fa-palette', color: 'var(--color-makeup)' },
        { key: 'vehicles', title: 'Vehicles', icon: 'fa-car', color: 'var(--color-vehicles)' },
        { key: 'sfx', title: 'Special Effects (SFX)', icon: 'fa-bomb', color: 'var(--color-sfx)' },
        { key: 'sound', title: 'Sound', icon: 'fa-volume-high', color: 'var(--color-sound)' },
        { key: 'stunts', title: 'Stunts', icon: 'fa-bolt', color: 'var(--color-stunts)' },
    ];

    // --- GLOBAL STATE ---
    let breakdownData = {};

    // --- DOM ELEMENTS ---
    const breakdownGrid = document.getElementById('breakdown-grid');
    const saveSceneDetailsBtn = document.getElementById('save-scene-details-btn');

    // --- INITIALIZATION ---
    function initialize() {
        if (!breakdownGrid || !saveSceneDetailsBtn) {
            console.error("Critical HTML elements are missing. Aborting initialization.");
            return;
        }
        
        // Load any saved data from the browser
        loadBreakdownData();
        // Create the UI for each category
        categories.forEach(createCategoryUI);
        // Render the loaded data onto the newly created UI
        renderAll();

        // Attach event listener to the "Save Scene Details" button
        saveSceneDetailsBtn.addEventListener('click', saveSceneDetails);
    }

    // --- UI CREATION ---
    function createCategoryUI(category) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'breakdown-category';
        categoryDiv.id = `category-${category.key}`;
        categoryDiv.style.borderTopColor = category.color;

        categoryDiv.innerHTML = `
            <h4><i class="fas ${category.icon}"></i> ${category.title}</h4>
            <form class="add-item-form">
                <input type="text" placeholder="Add element..." required>
                <button type="submit">Add</button>
            </form>
            <ul class="item-list"></ul>
        `;

        categoryDiv.querySelector('.add-item-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = e.target.querySelector('input');
            const value = input.value.trim();
            if (value) {
                addItem(category.key, value);
                input.value = '';
            }
        });

        breakdownGrid.appendChild(categoryDiv);
    }

    // --- DATA HANDLING ---
    function addItem(categoryKey, value) {
        if (!breakdownData[categoryKey]) {
            breakdownData[categoryKey] = [];
        }
        breakdownData[categoryKey].push(value);
        saveBreakdownData();
        renderCategory(categoryKey);
    }

    function deleteItem(categoryKey, index) {
        if (breakdownData[categoryKey] && breakdownData[categoryKey][index] !== undefined) {
            breakdownData[categoryKey].splice(index, 1);
            saveBreakdownData();
            renderCategory(categoryKey);
        }
    }

    function saveSceneDetails() {
        breakdownData.sceneNumber = document.getElementById('scene-number').value;
        breakdownData.sceneType = document.getElementById('scene-type').value;
        breakdownData.sceneLocation = document.getElementById('scene-location').value;
        breakdownData.sceneTime = document.getElementById('scene-time').value;
        breakdownData.sceneDescription = document.getElementById('scene-description').value;
        saveBreakdownData();
        alert('Scene details saved!');
    }

    // --- RENDERING ---
    function renderCategory(categoryKey) {
        const itemList = document.querySelector(`#category-${categoryKey} .item-list`);
        if (!itemList) return;
        itemList.innerHTML = '';

        const items = breakdownData[categoryKey] || [];
        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'tagged-item';
            li.innerHTML = `
                <span>${item}</span>
                <button class="delete-item-btn" title="Delete Item">&times;</button>
            `;
            li.querySelector('.delete-item-btn').addEventListener('click', () => deleteItem(categoryKey, index));
            itemList.appendChild(li);
        });
    }

    function renderAll() {
        // Render scene details
        document.getElementById('scene-number').value = breakdownData.sceneNumber || '';
        document.getElementById('scene-type').value = breakdownData.sceneType || 'INT.';
        document.getElementById('scene-location').value = breakdownData.sceneLocation || '';
        document.getElementById('scene-time').value = breakdownData.sceneTime || 'DAY';
        document.getElementById('scene-description').value = breakdownData.sceneDescription || '';

        // Render each category's list of items
        categories.forEach(cat => renderCategory(cat.key));
    }

    // --- LOCALSTORAGE PERSISTENCE ---
    function saveBreakdownData() {
        localStorage.setItem('scriptBreakdownData', JSON.stringify(breakdownData));
    }

    function loadBreakdownData() {
        const savedData = localStorage.getItem('scriptBreakdownData');
        if (savedData) {
            breakdownData = JSON.parse(savedData);
        } else {
            // Initialize with an empty data structure if nothing is saved
            breakdownData = {};
            categories.forEach(cat => {
                breakdownData[cat.key] = [];
            });
        }
    }

    // --- START THE APP ---
    initialize();
});
