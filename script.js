// ========== DATA STRUCTURES ==========
let currentList = []; // { id, name, qty, unit, purchased }
let purchaseHistory = []; // { id, date, totalBill, items, formattedDate }
let itemFrequency = {}; // { name: count }
let currentChart = null;
let currentMonth = new Date();

// ========== INITIALIZATION ==========
function init() {
    loadFromLocalStorage();
    renderCurrentList();
    updateStats();
    renderCalendar();
    renderPurchaseHistory();
    updateChart();
    setupEventListeners();
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
    currentList = currentList.filter(i => i.id !== id);
    renderCurrentList();
    updateStats();
    saveToLocalStorage();
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
    
    saveToLocalStorage();
    renderCurrentList();
    updateStats();
    renderPurchaseHistory();
    renderCalendar();
    updateChart();
    
    alert(`✅ Purchase saved! Total bill: ₹${totalBill.toFixed(2)}`);
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
            <button class="delete-btn" data-id="${item.id}">✗</button>
        </li>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => togglePurchased(parseInt(e.target.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteItem(parseInt(e.target.dataset.id)));
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
    currentList = currentList.filter(i => !i.purchased);
    renderCurrentList();
    updateStats();
    saveToLocalStorage();
}

function clearAll() {
    if (confirm('Clear ALL items from current list?')) {
        currentList = [];
        renderCurrentList();
        updateStats();
        saveToLocalStorage();
    }
}

// ========== RENDER PURCHASE HISTORY ==========
function renderPurchaseHistory() {
    const historyEl = document.getElementById('purchaseHistory');
    
    if (purchaseHistory.length === 0) {
        historyEl.innerHTML = '<p class="empty-state">No purchases yet</p>';
        return;
    }
    
    historyEl.innerHTML = purchaseHistory.map(p => `
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

// ========== UPDATE CHART ==========
function updateChart() {
    const ctx = document.getElementById('purchaseChart').getContext('2d');
    
    // Count frequency of each item across all purchases
    const itemCount = {};
    purchaseHistory.forEach(purchase => {
        purchase.items.forEach(item => {
            const key = item.name;
            itemCount[key] = (itemCount[key] || 0) + 1;
        });
    });
    
    const sorted = Object.entries(itemCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);
    
    if (currentChart) currentChart.destroy();
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Times Purchased',
                data: data,
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: '#667eea',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#e0e0e0' } },
                tooltip: { callbacks: { label: (ctx) => `Purchased ${ctx.raw} time${ctx.raw > 1 ? 's' : ''}` } }
            },
            scales: {
                y: { 
                    title: { display: true, text: 'Times Purchased', color: '#e0e0e0' },
                    ticks: { color: '#e0e0e0', stepSize: 1 }
                },
                x: { ticks: { color: '#e0e0e0', rotation: 45, maxRotation: 45, minRotation: 45 } }
            }
        }
    });
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
    
    document.getElementById('itemInput').addEventListener('input', (e) => showSuggestions(e.target.value));
    document.getElementById('itemInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem();
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.input-group')) {
            document.getElementById('suggestions').classList.remove('active');
        }
    });
}

// ========== EXPOSE GLOBAL FUNCTIONS ==========
window.viewPurchaseDetails = viewPurchaseDetails;
window.closeModal = closeModal;
window.showPurchasesForDate = showPurchasesForDate;

// ========== START THE APPLICATION ==========
init();