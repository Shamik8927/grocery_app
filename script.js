// ========== DATA STRUCTURES ==========
let currentList = []; // { id, name, qty, unit, purchased }
let purchaseHistory = []; // { id, date, totalBill, items, formattedDate }
let itemFrequency = {}; // { name: count }
let currentMonth = new Date();
let editingItemId = null; // Track which item is being edited

// Search filter variables
let currentFilter = {
    month: 'all',
    year: 'all'
};

// ========== INITIALIZATION ==========
function init() {
    loadFromLocalStorage();
    populateYearFilter();
    renderCurrentList();
    updateStats();
    renderCalendar();
    renderPurchaseHistory();
    setupEventListeners();
}

// ========== POPULATE YEAR FILTER ==========
function populateYearFilter() {
    const yearSelect = document.getElementById('searchYear');
    const years = new Set();
    
    // Get all years from purchase history
    purchaseHistory.forEach(purchase => {
        const year = new Date(purchase.date).getFullYear();
        years.add(year);
    });
    
    // Clear existing options except "All Years"
    yearSelect.innerHTML = '<option value="all">All Years</option>';
    
    // Add years in descending order (newest first)
    Array.from(years).sort((a, b) => b - a).forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}

// ========== APPLY FILTER ==========
function applyFilter() {
    const month = document.getElementById('searchMonth').value;
    const year = document.getElementById('searchYear').value;
    
    currentFilter = { month, year };
    renderPurchaseHistory();
    
    // Show filter summary
    updateFilterSummary();
}

// ========== CLEAR FILTER ==========
function clearFilter() {
    document.getElementById('searchMonth').value = 'all';
    document.getElementById('searchYear').value = 'all';
    currentFilter = { month: 'all', year: 'all' };
    renderPurchaseHistory();
    hideFilterSummary();
}

// ========== UPDATE FILTER SUMMARY ==========
function updateFilterSummary() {
    const summaryDiv = document.getElementById('filterSummary');
    const filterStatsDiv = document.getElementById('filterStats');
    
    let filterText = '';
    if (currentFilter.month !== 'all' && currentFilter.year !== 'all') {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        filterText = `Showing purchases from ${monthNames[parseInt(currentFilter.month)]} ${currentFilter.year}`;
    } else if (currentFilter.month !== 'all') {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        filterText = `Showing purchases from ${monthNames[parseInt(currentFilter.month)]} (all years)`;
    } else if (currentFilter.year !== 'all') {
        filterText = `Showing purchases from year ${currentFilter.year}`;
    }
    
    if (filterText) {
        summaryDiv.textContent = `🔍 ${filterText}`;
        summaryDiv.style.display = 'block';
    } else {
        summaryDiv.style.display = 'none';
    }
    
    // Update stats after filter is applied
    updateFilterStats();
}

function hideFilterSummary() {
    document.getElementById('filterSummary').style.display = 'none';
    document.getElementById('filterStats').style.display = 'none';
}

// ========== UPDATE FILTER STATS ==========
function updateFilterStats() {
    const filteredPurchases = getFilteredPurchases();
    const totalPurchases = purchaseHistory.length;
    const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.totalBill, 0);
    
    const statsDiv = document.getElementById('filterStats');
    const showingCountSpan = document.getElementById('showingCount');
    const totalCountSpan = document.getElementById('totalCount');
    const filteredTotalSpan = document.getElementById('filteredTotal');
    
    if (currentFilter.month !== 'all' || currentFilter.year !== 'all') {
        showingCountSpan.textContent = filteredPurchases.length;
        totalCountSpan.textContent = totalPurchases;
        filteredTotalSpan.textContent = totalAmount.toFixed(2);
        statsDiv.style.display = 'block';
    } else {
        statsDiv.style.display = 'none';
    }
}

// ========== GET FILTERED PURCHASES ==========
function getFilteredPurchases() {
    let filtered = [...purchaseHistory];
    
    if (currentFilter.month !== 'all') {
        const month = parseInt(currentFilter.month);
        filtered = filtered.filter(purchase => {
            const purchaseMonth = new Date(purchase.date).getMonth();
            return purchaseMonth === month;
        });
    }
    
    if (currentFilter.year !== 'all') {
        const year = parseInt(currentFilter.year);
        filtered = filtered.filter(purchase => {
            const purchaseYear = new Date(purchase.date).getFullYear();
            return purchaseYear === year;
        });
    }
    
    return filtered;
}

// ========== ADD ITEM ==========
function addItem() {
    const name = document.getElementById('itemInput').value.trim();
    const qty = parseFloat(document.getElementById('qtyInput').value);
    const unit = document.getElementById('unitSelect').value;

    if (!name) {
        alert('Please enter an item name');
        return;
    }
    if (isNaN(qty) || qty <= 0) {
        alert('Please enter a valid quantity');
        return;
    }

    // Check for duplicate unchecked item
    const duplicate = currentList.find(i => i.name.toLowerCase() === name.toLowerCase() && !i.purchased);
    if (duplicate) {
        alert(`"${name}" is already in your list!`);
        return;
    }

    const newItem = {
        id: Date.now(),
        name: name,
        qty: qty,
        unit: unit,
        purchased: false
    };

    currentList.push(newItem);
    updateFrequency(name);
    renderCurrentList();
    updateStats();
    saveToLocalStorage();
    
    document.getElementById('itemInput').value = '';
    document.getElementById('suggestions').classList.remove('active');
}

// ========== EDIT ITEM FUNCTIONS ==========
function openEditModal(id) {
    const item = currentList.find(i => i.id === id);
    if (!item) return;
    
    editingItemId = id;
    
    // Fill the edit form with current item values
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemQty').value = item.qty;
    document.getElementById('editItemUnit').value = item.unit;
    
    // Show the modal
    document.getElementById('editModal').classList.add('active');
}

function saveEditedItem() {
    if (!editingItemId) return;
    
    const newName = document.getElementById('editItemName').value.trim();
    const newQty = parseFloat(document.getElementById('editItemQty').value);
    const newUnit = document.getElementById('editItemUnit').value;
    
    // Validation
    if (!newName) {
        alert('Please enter an item name');
        return;
    }
    if (isNaN(newQty) || newQty <= 0) {
        alert('Please enter a valid quantity');
        return;
    }
    
    const itemIndex = currentList.findIndex(i => i.id === editingItemId);
    if (itemIndex === -1) return;
    
    // Check for duplicate name (excluding current item)
    const duplicate = currentList.find(i => 
        i.name.toLowerCase() === newName.toLowerCase() && 
        i.id !== editingItemId && 
        !i.purchased
    );
    
    if (duplicate) {
        alert(`"${newName}" is already in your list!`);
        return;
    }
    
    // Update the item
    currentList[itemIndex] = {
        ...currentList[itemIndex],
        name: newName,
        qty: newQty,
        unit: newUnit
    };
    
    // Update frequency for the new name if it changed
    if (newName.toLowerCase() !== currentList[itemIndex].name.toLowerCase()) {
        updateFrequency(newName);
    }
    
    // Close modal and refresh
    closeEditModal();
    renderCurrentList();
    updateStats();
    saveToLocalStorage();
    
    // Show success message
    showToast('Item updated successfully!', 'success');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    editingItemId = null;
    // Clear form
    document.getElementById('editItemName').value = '';
    document.getElementById('editItemQty').value = '';
    document.getElementById('editItemUnit').value = 'Pcs';
}

// Toast notification function
function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4ade80' : '#ef4444'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 2 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Add animation keyframes to document
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ========== FREQUENCY TRACKING FOR SUGGESTIONS ==========
function updateFrequency(name) {
    const key = name.toLowerCase();
    itemFrequency[key] = (itemFrequency[key] || 0) + 1;
    saveToLocalStorage();
}

// ========== SMART SUGGESTIONS ==========
function getSuggestions(input) {
    if (!input.trim()) return [];
    
    const inputLower = input.toLowerCase();
    const suggestions = [];
    
    // Collect from purchase history
    purchaseHistory.forEach(purchase => {
        purchase.items.forEach(item => {
            const existing = suggestions.find(s => s.name.toLowerCase() === item.name.toLowerCase());
            if (existing) {
                existing.count++;
            } else {
                suggestions.push({
                    name: item.name,
                    count: 1,
                    lastBought: purchase.formattedDate
                });
            }
        });
    });
    
    // Add current list items
    currentList.forEach(item => {
        const existing = suggestions.find(s => s.name.toLowerCase() === item.name.toLowerCase());
        if (!existing) {
            suggestions.push({
                name: item.name,
                count: 0,
                inCurrent: true
            });
        }
    });
    
    return suggestions
        .filter(s => s.name.toLowerCase().includes(inputLower))
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 5);
}

function showSuggestions(input) {
    const suggestions = getSuggestions(input);
    const suggestionsDiv = document.getElementById('suggestions');
    
    if (suggestions.length === 0 || !input.trim()) {
        suggestionsDiv.classList.remove('active');
        return;
    }
    
    suggestionsDiv.innerHTML = suggestions.map(s => `
        <div class="suggestion-item" data-name="${s.name}">
            ${escapeHtml(s.name)}
            <div class="suggestion-stats">
                ${s.count > 0 ? `🛒 Bought ${s.count} time${s.count > 1 ? 's' : ''} | Last: ${s.lastBought || 'N/A'}` : ''}
                ${s.inCurrent ? '✓ Already in current list' : ''}
            </div>
        </div>
    `).join('');
    
    suggestionsDiv.classList.add('active');
    
    document.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
            document.getElementById('itemInput').value = el.dataset.name;
            suggestionsDiv.classList.remove('active');
        });
    });
}

// ========== TOGGLE PURCHASED STATUS ==========
function togglePurchased(id) {
    const item = currentList.find(i => i.id === id);
    if (item) {
        item.purchased = !item.purchased;
        renderCurrentList();
        updateStats();
        saveToLocalStorage();
    }
}

function deleteItem(id) {
    if (confirm('Delete this item?')) {
        currentList = currentList.filter(i => i.id !== id);
        renderCurrentList();
        updateStats();
        saveToLocalStorage();
        showToast('Item deleted', 'success');
    }
}

// ========== FINALIZE PURCHASE ==========
function finalizePurchase() {
    const purchasedItems = currentList.filter(i => i.purchased);
    
    if (purchasedItems.length === 0) {
        alert('Please check the items you purchased first!');
        return;
    }
    
    const totalBill = parseFloat(document.getElementById('totalBillInput').value);
    
    if (isNaN(totalBill) || totalBill <= 0) {
        alert('Please enter the total bill amount from your receipt!');
        return;
    }
    
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    const purchase = {
        id: Date.now(),
        date: now.toISOString(),
        formattedDate: formattedDate,
        totalBill: totalBill,
        items: [...purchasedItems],
        itemCount: purchasedItems.length
    };
    
    purchaseHistory.unshift(purchase);
    
    // Remove purchased items from current list
    currentList = currentList.filter(i => !i.purchased);
    
    // Clear bill input
    document.getElementById('totalBillInput').value = '';
    
    // Update year filter options
    populateYearFilter();
    
    saveToLocalStorage();
    renderCurrentList();
    updateStats();
    renderPurchaseHistory();
    renderCalendar();
    
    showToast(`✅ Purchase saved! Total bill: ₹${totalBill.toFixed(2)}`, 'success');
}

// ========== RENDER CURRENT LIST ==========
function renderCurrentList() {
    const listEl = document.getElementById('groceryList');
    
    if (currentList.length === 0) {
        listEl.innerHTML = '<li class="empty-state">✨ Your list is empty. Add items above!</li>';
        return;
    }
    
    const sorted = [...currentList].sort((a, b) => a.purchased - b.purchased);
    
    listEl.innerHTML = sorted.map(item => `
        <li class="grocery-item ${item.purchased ? 'purchased' : ''}">
            <input type="checkbox" class="item-checkbox" ${item.purchased ? 'checked' : ''} data-id="${item.id}">
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span class="item-qty">${item.qty} ${item.unit}</span>
            <div class="item-actions">
                <button class="edit-btn" data-id="${item.id}">✏️ Edit</button>
                <button class="delete-btn" data-id="${item.id}">🗑️ Delete</button>
            </div>
        </li>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => togglePurchased(parseInt(e.target.dataset.id)));
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(parseInt(btn.dataset.id));
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteItem(parseInt(btn.dataset.id));
        });
    });
}

// ========== UPDATE STATS ==========
function updateStats() {
    const total = currentList.length;
    const purchased = currentList.filter(i => i.purchased).length;
    const remaining = total - purchased;
    
    document.getElementById('totalItems').textContent = total;
    document.getElementById('purchasedItems').textContent = purchased;
    document.getElementById('remainingItems').textContent = remaining;
}

// ========== CLEAR FUNCTIONS ==========
function clearPurchased() {
    if (confirm('Remove all purchased items from the list?')) {
        currentList = currentList.filter(i => !i.purchased);
        renderCurrentList();
        updateStats();
        saveToLocalStorage();
        showToast('Purchased items cleared', 'success');
    }
}

function clearAll() {
    if (confirm('⚠️ Clear ALL items from current list? This cannot be undone.')) {
        currentList = [];
        renderCurrentList();
        updateStats();
        saveToLocalStorage();
        showToast('All items cleared', 'success');
    }
}

// ========== RENDER PURCHASE HISTORY (WITH FILTER) ==========
function renderPurchaseHistory() {
    const historyEl = document.getElementById('purchaseHistory');
    const filteredPurchases = getFilteredPurchases();
    
    if (filteredPurchases.length === 0) {
        if (purchaseHistory.length === 0) {
            historyEl.innerHTML = '<p class="empty-state">No purchases yet</p>';
        } else {
            historyEl.innerHTML = '<p class="empty-state">🔍 No purchases found for selected filter</p>';
        }
        return;
    }
    
    historyEl.innerHTML = filteredPurchases.map(p => `
        <div class="history-item" onclick="viewPurchaseDetails(${p.id})">
            <span class="history-date">📅 ${p.formattedDate}</span>
            <span class="history-amount">₹${p.totalBill.toFixed(2)}</span>
            <div class="history-items">
                ${p.items.length} item${p.items.length > 1 ? 's' : ''}: ${p.items.map(i => i.name).slice(0, 3).join(', ')}${p.items.length > 3 ? '...' : ''}
            </div>
        </div>
    `).join('');
}

// ========== VIEW PURCHASE DETAILS ==========
function viewPurchaseDetails(id) {
    const purchase = purchaseHistory.find(p => p.id === id);
    if (!purchase) return;
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = `Purchase - ${purchase.formattedDate}`;
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
            <p style="font-size: 24px; color: #4ade80; text-align: center; margin: 20px 0;">
                ₹${purchase.totalBill.toFixed(2)}
            </p>
            <p><strong>Items Purchased (${purchase.items.length}):</strong></p>
            <ul style="margin: 15px 0 0 20px;">
                ${purchase.items.map(i => `
                    <li style="margin-bottom: 8px;">${escapeHtml(i.name)} — ${i.qty} ${i.unit}</li>
                `).join('')}
            </ul>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// ========== CALENDAR FUNCTIONS ==========
function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    
    document.getElementById('currentMonthYear').textContent = 
        currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Group purchases by date
    const purchasesByDate = {};
    purchaseHistory.forEach(p => {
        const dateKey = new Date(p.date).toLocaleDateString('en-IN');
        if (!purchasesByDate[dateKey]) purchasesByDate[dateKey] = [];
        purchasesByDate[dateKey].push(p);
    });
    
    let gridHtml = '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        gridHtml += `<div class="calendar-day-header">${day}</div>`;
    });
    
    for (let i = 0; i < startDay; i++) {
        gridHtml += `<div class="calendar-day"></div>`;
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const dateKey = date.toLocaleDateString('en-IN');
        const hasPurchase = purchasesByDate[dateKey];
        const totalAmount = hasPurchase ? hasPurchase.reduce((sum, p) => sum + p.totalBill, 0) : 0;
        const isToday = date.toDateString() === new Date().toDateString();
        
        gridHtml += `
            <div class="calendar-day ${hasPurchase ? 'has-purchase' : ''} ${isToday ? 'highlight' : ''}" 
                 onclick="showPurchasesForDate('${dateKey}')">
                ${d}
                ${hasPurchase ? `<div class="amount">₹${totalAmount}</div>` : ''}
            </div>
        `;
    }
    
    document.getElementById('calendarGrid').innerHTML = gridHtml;
}

function showPurchasesForDate(dateKey) {
    const purchases = purchaseHistory.filter(p => new Date(p.date).toLocaleDateString('en-IN') === dateKey);
    if (purchases.length === 0) return;
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = `Purchases on ${dateKey}`;
    modalBody.innerHTML = purchases.map(p => `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #2d3555; padding-bottom: 15px;">
            <p style="font-size: 20px; color: #4ade80;"><strong>₹${p.totalBill.toFixed(2)}</strong></p>
            <p><strong>Items:</strong></p>
            <ul style="margin-left: 20px;">
                ${p.items.map(i => `<li>${escapeHtml(i.name)} — ${i.qty} ${i.unit}</li>`).join('')}
            </ul>
        </div>
    `).join('');
    
    modal.classList.add('active');
}

function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    renderCalendar();
}

// ========== LOCAL STORAGE ==========
function saveToLocalStorage() {
    localStorage.setItem('groceryCurrentList', JSON.stringify(currentList));
    localStorage.setItem('groceryPurchaseHistory', JSON.stringify(purchaseHistory));
    localStorage.setItem('groceryItemFrequency', JSON.stringify(itemFrequency));
}

function loadFromLocalStorage() {
    const savedList = localStorage.getItem('groceryCurrentList');
    if (savedList) currentList = JSON.parse(savedList);
    
    const savedHistory = localStorage.getItem('groceryPurchaseHistory');
    if (savedHistory) purchaseHistory = JSON.parse(savedHistory);
    
    const savedFreq = localStorage.getItem('groceryItemFrequency');
    if (savedFreq) itemFrequency = JSON.parse(savedFreq);
}

// ========== UTILITY FUNCTIONS ==========
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    document.getElementById('addBtn').addEventListener('click', addItem);
    document.getElementById('finalizePurchaseBtn').addEventListener('click', finalizePurchase);
    document.getElementById('clearPurchasedBtn').addEventListener('click', clearPurchased);
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('saveEditBtn').addEventListener('click', saveEditedItem);
    document.getElementById('applyFilterBtn').addEventListener('click', applyFilter);
    document.getElementById('clearFilterBtn').addEventListener('click', clearFilter);
    
    document.getElementById('itemInput').addEventListener('input', (e) => showSuggestions(e.target.value));
    document.getElementById('itemInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem();
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.input-group')) {
            document.getElementById('suggestions').classList.remove('active');
        }
        if (e.target.classList.contains('modal')) {
            closeModal();
            closeEditModal();
        }
    });
    
    // Close edit modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditModal();
            closeModal();
        }
    });
}

// ========== EXPOSE GLOBAL FUNCTIONS ==========
window.viewPurchaseDetails = viewPurchaseDetails;
window.closeModal = closeModal;
window.closeEditModal = closeEditModal;
window.showPurchasesForDate = showPurchasesForDate;

// ========== START THE APPLICATION ==========
init();