// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

// Search Functionality
let searchTimeout;
function searchRecipes(query) {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const recipes = await response.json();
            displayRecipes(recipes);
        } catch (error) {
            console.error('Грешка при търсене:', error);
            showNotification('Грешка при търсене на рецепти', 'error');
        }
    }, 300); // Debounce 300ms
}

function displayRecipes(recipes) {
    const grid = document.getElementById('recipe-grid');
    if (!grid) return;
    
    if (recipes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">🔍</div>
                <h3>Няма намерени рецепти</h3>
                <p>Опитайте с друго търсене</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = recipes.map(recipe => `
        <div class="recipe-card" onclick="window.location.href='/recipe/${recipe.id}'">
            <h3>${escapeHtml(recipe.name)}</h3>
            <p>${escapeHtml(recipe.ingredients.substring(0, 100))}${recipe.ingredients.length > 100 ? '...' : ''}</p>
        </div>
    `).join('');
}

// Text-to-Speech Functionality
let currentSpeech = null;

function toggleTTS(text, button) {
    if (!('speechSynthesis' in window)) {
        showNotification('Text-to-Speech не е поддържан от този браузър', 'error');
        return;
    }
    
    // Ако вече чете, спри
    if (currentSpeech && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        button.textContent = '🔊 Изчети стъпките';
        button.classList.remove('playing');
        currentSpeech = null;
        return;
    }
    
    // Започни ново четене
    currentSpeech = new SpeechSynthesisUtterance(text);
    
    // Опитай се да намериш български глас
    const voices = window.speechSynthesis.getVoices();
    const bulgarianVoice = voices.find(voice => voice.lang.startsWith('bg'));
    if (bulgarianVoice) {
        currentSpeech.voice = bulgarianVoice;
    }
    
    currentSpeech.lang = 'bg-BG';
    currentSpeech.rate = 0.9; // Малко по-бавно за по-добро разбиране
    currentSpeech.pitch = 1.0;
    
    currentSpeech.onstart = () => {
        button.textContent = '⏸️ Спри четенето';
        button.classList.add('playing');
    };
    
    currentSpeech.onend = () => {
        button.textContent = '🔊 Изчети стъпките';
        button.classList.remove('playing');
        currentSpeech = null;
    };
    
    currentSpeech.onerror = (event) => {
        console.error('TTS грешка:', event);
        button.textContent = '🔊 Изчети стъпките';
        button.classList.remove('playing');
        currentSpeech = null;
        showNotification('Грешка при четенето', 'error');
    };
    
    window.speechSynthesis.speak(currentSpeech);
}

// Admin Functions
async function addRecipe(event) {
    event.preventDefault();
    
    const name = document.getElementById('recipe-name').value.trim();
    const ingredients = document.getElementById('recipe-ingredients').value.trim();
    const instructions = document.getElementById('recipe-instructions').value.trim();
    
    if (!name || !ingredients || !instructions) {
        showNotification('Моля попълнете всички полета', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, ingredients, instructions })
        });
        
        if (response.ok) {
            showNotification('Рецептата е добавена успешно', 'success');
            document.getElementById('recipe-form').reset();
            loadAdminRecipes();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Грешка при добавяне', 'error');
        }
    } catch (error) {
        console.error('Грешка:', error);
        showNotification('Грешка при връзка със сървъра', 'error');
    }
}

async function loadAdminRecipes() {
    try {
        const response = await fetch('/api/search?q=');
        const recipes = await response.json();
        displayAdminRecipes(recipes);
    } catch (error) {
        console.error('Грешка при зареждане:', error);
    }
}

function displayAdminRecipes(recipes) {
    const list = document.getElementById('admin-recipe-list');
    if (!list) return;
    
    if (recipes.length === 0) {
        list.innerHTML = '<p class="empty-state">Все още няма рецепти</p>';
        return;
    }
    
    list.innerHTML = recipes.map(recipe => `
        <div class="admin-recipe-item">
            <div class="admin-recipe-name">${escapeHtml(recipe.name)}</div>
            <div class="admin-recipe-actions">
                <button class="btn btn-secondary" onclick="editRecipe(${recipe.id})">✏️ Редактирай</button>
                <button class="btn btn-danger" onclick="deleteRecipe(${recipe.id}, '${escapeHtml(recipe.name)}')">🗑️ Изтрий</button>
            </div>
        </div>
    `).join('');
}

async function editRecipe(id) {
    try {
        const response = await fetch(`/api/recipe/${id}`);
        const recipe = await response.json();
        
        document.getElementById('recipe-name').value = recipe.name;
        document.getElementById('recipe-ingredients').value = recipe.ingredients;
        document.getElementById('recipe-instructions').value = recipe.instructions;
        setCategoryValue(recipe.category || 'Други');
        
        // Променяме формата за редактиране
        const form = document.getElementById('recipe-form');
        form.setAttribute('data-edit-id', id);
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = '💾 Обнови рецепта';
        
        // Добавяме бутон за отказ
        if (!form.querySelector('.btn-cancel')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn btn-back btn-cancel';
            cancelBtn.textContent = '❌ Отказ';
            cancelBtn.onclick = cancelEdit;
            submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
        }
        
        // Скролираме до формата
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('Грешка при зареждане:', error);
        showNotification('Грешка при зареждане на рецептата', 'error');
    }
}

function cancelEdit() {
    const form = document.getElementById('recipe-form');
    form.reset();
    form.removeAttribute('data-edit-id');
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = '➕ Добави рецепта';
    
    const cancelBtn = form.querySelector('.btn-cancel');
    if (cancelBtn) cancelBtn.remove();
}

async function submitRecipe(event) {
    event.preventDefault();
    
    const form = document.getElementById('recipe-form');
    const editId = form.getAttribute('data-edit-id');
    
    const name = document.getElementById('recipe-name').value.trim();
    const ingredients = document.getElementById('recipe-ingredients').value.trim();
    const instructions = document.getElementById('recipe-instructions').value.trim();
    const category = getCategoryValue();
    
    if (!name || !ingredients || !instructions) {
        showNotification('Моля попълнете всички полета', 'error');
        return;
    }
    
    try {
        const url = editId ? `/api/recipe/${editId}` : '/api/recipe';
        const method = editId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, ingredients, instructions, category })
        });
        
        if (response.ok) {
            showNotification(editId ? 'Рецептата е обновена' : 'Рецептата е добавена', 'success');
            cancelEdit();
            loadAdminRecipes();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Грешка', 'error');
        }
    } catch (error) {
        console.error('Грешка:', error);
        showNotification('Грешка при връзка със сървъра', 'error');
    }
}

async function deleteRecipe(id, name) {
    if (!confirm(`Сигурни ли сте, че искате да изтриете "${name}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/recipe/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Рецептата е изтрита', 'success');
            loadAdminRecipes();
        } else {
            showNotification('Грешка при изтриване', 'error');
        }
    } catch (error) {
        console.error('Грешка:', error);
        showNotification('Грешка при връзка със сървъра', 'error');
    }
}

// Notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Category Functions
function handleCategorySelect(value) {
    const selectElement = document.getElementById('recipe-category-select');
    const inputElement = document.getElementById('recipe-category-input');
    
    if (value === '__new__') {
        // Показваме текстовото поле за нова категория
        inputElement.style.display = 'block';
        inputElement.focus();
        selectElement.value = '';
    } else {
        // Скриваме текстовото поле
        inputElement.style.display = 'none';
        inputElement.value = '';
    }
}

function getCategoryValue() {
    const selectElement = document.getElementById('recipe-category-select');
    const inputElement = document.getElementById('recipe-category-input');
    
    // Ако има въведена нова категория, използваме нея
    if (inputElement.value.trim()) {
        return inputElement.value.trim();
    }
    
    // Иначе използваме избраната от dropdown
    if (selectElement.value && selectElement.value !== '__new__') {
        return selectElement.value;
    }
    
    // По подразбиране "Други"
    return 'Други';
}

function setCategoryValue(category) {
    const selectElement = document.getElementById('recipe-category-select');
    const inputElement = document.getElementById('recipe-category-input');
    
    // Проверяваме дали категорията съществува в dropdown
    const option = Array.from(selectElement.options).find(opt => opt.value === category);
    
    if (option) {
        selectElement.value = category;
        inputElement.style.display = 'none';
        inputElement.value = '';
    } else {
        // Ако не съществува, показваме като нова
        selectElement.value = '__new__';
        inputElement.style.display = 'block';
        inputElement.value = category;
    }
}

// Global Search (from index page)
function searchRecipesGlobal(query) {
    const resultsDiv = document.getElementById('search-results');
    const categoriesDiv = document.getElementById('categories-view');
    const resultsGrid = document.getElementById('search-results-grid');
    
    if (!query.trim()) {
        resultsDiv.style.display = 'none';
        categoriesDiv.style.display = 'block';
        return;
    }
    
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const recipes = await response.json();
            
            categoriesDiv.style.display = 'none';
            resultsDiv.style.display = 'block';
            
            if (recipes.length === 0) {
                resultsGrid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <div class="empty-state-icon">🔍</div>
                        <h3>Няма намерени рецепти</h3>
                        <p>Опитайте с друго търсене</p>
                    </div>
                `;
                return;
            }
            
            resultsGrid.innerHTML = recipes.map(recipe => `
                <div class="recipe-card" onclick="window.location.href='/recipe/${recipe.id}'">
                    <h3>${escapeHtml(recipe.name)}</h3>
                    <p class="recipe-category-badge-small">📂 ${escapeHtml(recipe.category)}</p>
                    <p>${escapeHtml(recipe.ingredients.substring(0, 100))}${recipe.ingredients.length > 100 ? '...' : ''}</p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Грешка при търсене:', error);
            showNotification('Грешка при търсене на рецепти', 'error');
        }
    }, 300);
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('categories-view').style.display = 'block';
}

// Search in Category
function searchInCategory(query, categoryName) {
    const grid = document.getElementById('recipe-grid');
    if (!grid) return;
    
    clearTimeout(searchTimeout);
    
    if (!query.trim()) {
        // Reload page to show all recipes in category
        window.location.reload();
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const allRecipes = await response.json();
            
            // Filter only recipes from this category
            const recipes = allRecipes.filter(r => r.category === categoryName);
            
            if (recipes.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <div class="empty-state-icon">🔍</div>
                        <h3>Няма намерени рецепти</h3>
                        <p>Опитайте с друго търсене</p>
                    </div>
                `;
                return;
            }
            
            grid.innerHTML = recipes.map(recipe => `
                <div class="recipe-card" onclick="window.location.href='/recipe/${recipe.id}'">
                    <h3>${escapeHtml(recipe.name)}</h3>
                    <p>${escapeHtml(recipe.ingredients.substring(0, 100))}${recipe.ingredients.length > 100 ? '...' : ''}</p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Грешка при търсене:', error);
        }
    }, 300);
}

// Category Management Functions
let currentEditCategory = null;

function editCategory(categoryName) {
    currentEditCategory = categoryName;
    document.getElementById('edit-category-old').value = categoryName;
    document.getElementById('edit-category-new').value = categoryName;
    document.getElementById('edit-category-modal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('edit-category-modal').style.display = 'none';
    currentEditCategory = null;
}

async function saveEditCategory() {
    const newName = document.getElementById('edit-category-new').value.trim();
    
    if (!newName) {
        showNotification('Моля въведете ново име', 'error');
        return;
    }
    
    if (newName === currentEditCategory) {
        closeEditModal();
        return;
    }
    
    try {
        const response = await fetch(`/api/category/${encodeURIComponent(currentEditCategory)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ new_name: newName })
        });
        
        if (response.ok) {
            showNotification('Категорията е преименувана успешно', 'success');
            closeEditModal();
            window.location.reload();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Грешка при преименуване', 'error');
        }
    } catch (error) {
        console.error('Грешка:', error);
        showNotification('Грешка при връзка със сървъра', 'error');
    }
}

async function deleteCategory(categoryName, recipeCount) {
    let confirmMessage = `Сигурни ли сте, че искате да изтриете категорията "${categoryName}"?`;
    
    if (recipeCount > 0) {
        confirmMessage += `\n\n${recipeCount} ${recipeCount === 1 ? 'рецепта' : 'рецепти'} ще ${recipeCount === 1 ? 'бъде преместена' : 'бъдат преместени'} в категория "Други".`;
    }
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/category/${encodeURIComponent(categoryName)}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Категорията е изтрита', 'success');
            window.location.reload();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Грешка при изтриване', 'error');
        }
    } catch (error) {
        console.error('Грешка:', error);
        showNotification('Грешка при връзка със сървъра', 'error');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    // Load voices for TTS (some browsers need this)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }
});
