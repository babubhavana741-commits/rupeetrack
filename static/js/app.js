// RupeeTrack - Core Frontend Logic

let appSummary = null;
let appPersons = [];
let selectedPersonId = null;
let personChartInstance = null;
let categoryChartInstance = null;

// Category Badge Color & Icon Mapping
const CATEGORY_META = {
    'Food & Dining': { icon: 'fa-utensils', bg: 'bg-orange-100', text: 'text-orange-800' },
    'Groceries': { icon: 'fa-cart-shopping', bg: 'bg-emerald-100', text: 'text-emerald-800' },
    'Bills & Utilities': { icon: 'fa-bolt', bg: 'bg-amber-100', text: 'text-amber-800' },
    'Travel & Commute': { icon: 'fa-car', bg: 'bg-sky-100', text: 'text-sky-800' },
    'Shopping': { icon: 'fa-bag-shopping', bg: 'bg-pink-100', text: 'text-pink-800' },
    'Health & Medical': { icon: 'fa-heart-pulse', bg: 'bg-rose-100', text: 'text-rose-800' },
    'Entertainment': { icon: 'fa-film', bg: 'bg-purple-100', text: 'text-purple-800' },
    'Education': { icon: 'fa-graduation-cap', bg: 'bg-indigo-100', text: 'text-indigo-800' },
    'Others': { icon: 'fa-box', bg: 'bg-slate-100', text: 'text-slate-800' }
};

// Indian Rupee (INR) Formatter
function formatINR(amount) {
    if (isNaN(amount) || amount === null) amount = 0;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Get Initials from Name
function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    // Set default date for expense input to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('input-expense-date');
    if (dateInput) dateInput.value = today;

    // Search input listener
    const searchInput = document.getElementById('expense-search-input');
    if (searchInput) {
        let timeout = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                loadAllExpenses();
            }, 300);
        });
    }

    // Initial data fetch
    refreshAllData();
});

// Refresh all components
async function refreshAllData() {
    await loadSummary();
    await loadPersons();
    await loadAllExpenses();
    if (selectedPersonId) {
        await loadIndividualTracker(selectedPersonId);
    }
}

// =================== SUMMARY & OVERVIEW ===================
async function loadSummary() {
    try {
        const res = await fetch('/api/summary');
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        
        appSummary = json.data;
        updateSummaryCards(appSummary);
        renderCharts(appSummary);
        renderPersonsSummaryGrid(appSummary.persons);
    } catch (err) {
        console.error('Failed to load summary:', err);
    }
}

function updateSummaryCards(summary) {
    // 1. Initial Balance Card
    const initialEl = document.getElementById('card-initial-balance');
    if (initialEl) initialEl.textContent = formatINR(summary.initial_balance);

    // 2. Total Expenses Card
    const totalSpentEl = document.getElementById('card-total-spent');
    if (totalSpentEl) totalSpentEl.textContent = formatINR(summary.total_spent);
    
    const totalCountEl = document.getElementById('card-total-count-label');
    if (totalCountEl) {
        totalCountEl.textContent = `${summary.total_count} ${summary.total_count === 1 ? 'expense' : 'expenses'} recorded`;
    }

    // 3. Remaining Balance Card & Status
    const remainingEl = document.getElementById('card-remaining-balance');
    const statusEl = document.getElementById('card-remaining-status');
    const circleEl = document.getElementById('remaining-bg-circle');
    const badgeIconEl = document.getElementById('remaining-badge-icon');

    if (remainingEl) remainingEl.textContent = formatINR(summary.remaining_balance);

    if (summary.remaining_balance < 0) {
        remainingEl.className = 'text-2xl font-extrabold text-rose-600 mb-1 relative z-10';
        if (circleEl) circleEl.className = 'absolute -right-4 -bottom-4 w-20 h-20 bg-rose-50 rounded-full group-hover:scale-110 transition-transform';
        if (badgeIconEl) badgeIconEl.className = 'p-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold';
        if (statusEl) statusEl.innerHTML = `<span class="text-rose-600 font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Over budget by ${formatINR(Math.abs(summary.remaining_balance))}</span>`;
    } else if (summary.percent_spent > 85) {
        remainingEl.className = 'text-2xl font-extrabold text-amber-600 mb-1 relative z-10';
        if (circleEl) circleEl.className = 'absolute -right-4 -bottom-4 w-20 h-20 bg-amber-50 rounded-full group-hover:scale-110 transition-transform';
        if (badgeIconEl) badgeIconEl.className = 'p-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold';
        if (statusEl) statusEl.innerHTML = `<span class="text-amber-600 font-bold"><i class="fa-solid fa-circle-exclamation mr-1"></i> Warning: >85% budget used</span>`;
    } else {
        remainingEl.className = 'text-2xl font-extrabold text-emerald-600 mb-1 relative z-10';
        if (circleEl) circleEl.className = 'absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform';
        if (badgeIconEl) badgeIconEl.className = 'p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold';
        if (statusEl) statusEl.innerHTML = `<span class="text-emerald-700 font-semibold"><i class="fa-solid fa-check mr-1"></i> Budget healthy</span>`;
    }

    // 4. Budget Progress Bar
    const progressBar = document.getElementById('budget-progress-bar');
    const progressPercent = document.getElementById('budget-progress-percent');
    const pct = Math.min(Math.max(summary.percent_spent, 0), 100);

    if (progressBar) {
        progressBar.style.width = `${pct}%`;
        if (summary.percent_spent > 100) {
            progressBar.className = 'h-full rounded-full transition-all duration-700 bg-rose-500';
        } else if (summary.percent_spent > 80) {
            progressBar.className = 'h-full rounded-full transition-all duration-700 bg-amber-500';
        } else {
            progressBar.className = 'h-full rounded-full transition-all duration-700 bg-indigo-600';
        }
    }
    if (progressPercent) {
        progressPercent.textContent = `${summary.percent_spent}% Used (${formatINR(summary.remaining_balance)} left)`;
    }
}

// Render Overview Person Highlights
function renderPersonsSummaryGrid(persons) {
    const container = document.getElementById('persons-summary-grid');
    if (!container) return;

    if (!persons || persons.length === 0) {
        container.innerHTML = `
            <div class="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                <i class="fa-solid fa-users text-3xl mb-2"></i>
                <p>No persons configured yet. Add members in the Persons Management tab.</p>
            </div>
        `;
        return;
    }

    let html = '';
    persons.forEach(p => {
        const initials = getInitials(p.name);
        html += `
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group" onclick="selectAndOpenIndividualTracker(${p.id})">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md" style="background-color: ${p.color};">
                            ${initials}
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">${escapeHtml(p.name)}</h4>
                            <span class="text-xs text-slate-400">${p.expense_count} ${p.expense_count === 1 ? 'transaction' : 'transactions'}</span>
                        </div>
                    </div>
                    <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        ${p.share_of_spent}% share
                    </span>
                </div>

                <div class="space-y-2 border-t border-slate-100 pt-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-slate-500">Total Spent</span>
                        <span class="text-base font-extrabold text-slate-900">${formatINR(p.total_spent)}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div class="h-full rounded-full" style="width: ${Math.min(p.share_of_spent, 100)}%; background-color: ${p.color};"></div>
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Pool Impact: ${p.share_of_initial}% of total balance</span>
                        <span class="text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            Tracker <i class="fa-solid fa-chevron-right text-[9px]"></i>
                        </span>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Render Chart.js Analytics
function renderCharts(summary) {
    // 1. Person Spending Chart (Doughnut)
    const personCtx = document.getElementById('personChart');
    if (personCtx) {
        if (personChartInstance) personChartInstance.destroy();

        const labels = summary.persons.map(p => p.name);
        const data = summary.persons.map(p => p.total_spent);
        const bgColors = summary.persons.map(p => p.color || '#4F46E5');

        personChartInstance = new Chart(personCtx, {
            type: 'doughnut',
            data: {
                labels: labels.length > 0 ? labels : ['No expenses'],
                datasets: [{
                    data: data.length > 0 && data.some(v => v > 0) ? data : [1],
                    backgroundColor: data.length > 0 && data.some(v => v > 0) ? bgColors : ['#e2e8f0'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: { family: '"Plus Jakarta Sans", sans-serif', size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw || 0;
                                return ` ${context.label}: ${formatINR(val)}`;
                            }
                        }
                    }
                },
                cutout: '68%'
            }
        });
    }

    // 2. Category Spending Chart (Bar)
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        if (categoryChartInstance) categoryChartInstance.destroy();

        const catLabels = summary.categories.map(c => c.category);
        const catData = summary.categories.map(c => c.total);

        categoryChartInstance = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: catLabels.length > 0 ? catLabels : ['None'],
                datasets: [{
                    label: 'Spent (₹)',
                    data: catData.length > 0 ? catData : [0],
                    backgroundColor: '#6366F1',
                    borderRadius: 8,
                    maxBarThickness: 32
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` Spent: ${formatINR(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: '"Plus Jakarta Sans", sans-serif', size: 10 }
                        }
                    },
                    y: {
                        grid: { color: '#f1f5f9' },
                        ticks: {
                            font: { family: '"Plus Jakarta Sans", sans-serif', size: 10 },
                            callback: function(value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                }
            }
        });
    }
}

// =================== PERSONS MANAGEMENT ===================
async function loadPersons() {
    try {
        const res = await fetch('/api/persons');
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        appPersons = json.data;

        // Update card count
        const personCountEl = document.getElementById('card-person-count');
        if (personCountEl) personCountEl.textContent = appPersons.length;

        const personNamesEl = document.getElementById('card-person-names');
        if (personNamesEl && appPersons.length > 0) {
            const names = appPersons.map(p => p.name).slice(0, 3).join(', ');
            personNamesEl.innerHTML = `<span class="truncate">${names}${appPersons.length > 3 ? '...' : ''}</span>`;
        }

        // Update Select dropdown in Expense Modal
        populateExpensePersonDropdown(appPersons);

        // Update Filter Select dropdown
        populateFilterPersonDropdown(appPersons);

        // Render Person Management list
        renderPersonsManagement(appPersons);

        // Render Individual Tracker Pills
        renderIndividualTrackerPills(appPersons);

        // If no person selected yet and persons exist, default to the first one
        if ((!selectedPersonId || !appPersons.some(p => p.id === selectedPersonId)) && appPersons.length > 0) {
            selectedPersonId = appPersons[0].id;
        }

    } catch (err) {
        console.error('Failed to load persons:', err);
    }
}

function populateExpensePersonDropdown(persons) {
    const select = document.getElementById('input-expense-person');
    if (!select) return;
    select.innerHTML = '';
    persons.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
    });
}

function populateFilterPersonDropdown(persons) {
    const select = document.getElementById('filter-person-select');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">All Persons</option>';
    persons.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
    });
    select.value = currentVal;
}

function renderPersonsManagement(persons) {
    const container = document.getElementById('persons-manage-grid');
    if (!container) return;

    if (persons.length === 0) {
        container.innerHTML = `
            <div class="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                <i class="fa-solid fa-users text-4xl mb-3 text-slate-300"></i>
                <p class="font-medium text-slate-600">No persons added yet</p>
                <p class="text-xs text-slate-400 mt-1">Click "Add New Person" above to begin tracking individual contributions.</p>
            </div>
        `;
        return;
    }

    let html = '';
    persons.forEach(p => {
        const initials = getInitials(p.name);
        html += `
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-md" style="background-color: ${p.color};">
                            ${initials}
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-800 text-base">${escapeHtml(p.name)}</h3>
                            <span class="text-xs text-slate-400">Added on ${p.created_at ? p.created_at.split(' ')[0] : 'N/A'}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button onclick="openEditPersonModal(${p.id}, '${escapeHtml(p.name)}', '${p.color}')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit Person">
                            <i class="fa-solid fa-pen-to-square text-sm"></i>
                        </button>
                        <button onclick="confirmDeletePerson(${p.id}, '${escapeHtml(p.name)}')" class="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Person">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </div>
                </div>

                <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 mb-4">
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-500 font-medium">Total Expenses Recorded:</span>
                        <span class="font-bold text-slate-800">${p.expense_count}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-500 font-medium">Cumulative Amount Spent:</span>
                        <span class="font-black text-emerald-600 text-sm">${formatINR(p.total_spent)}</span>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button onclick="selectAndOpenIndividualTracker(${p.id})" class="flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-chart-user"></i> View Individual Tracker
                    </button>
                    <button onclick="openAddExpenseForSpecificPerson(${p.id})" class="py-2 px-3 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors" title="Add Expense for this person">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// =================== INDIVIDUAL TRACKER ===================
function renderIndividualTrackerPills(persons) {
    const container = document.getElementById('individual-person-pills');
    if (!container) return;

    if (persons.length === 0) {
        container.innerHTML = `<span class="text-xs text-slate-400">No persons available</span>`;
        return;
    }

    let html = '';
    persons.forEach(p => {
        const isSelected = p.id === selectedPersonId;
        const activeClass = isSelected
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium';

        html += `
            <button onclick="selectIndividualPerson(${p.id})" class="px-3.5 py-1.5 text-xs rounded-xl transition-all flex items-center gap-2 ${activeClass}">
                <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${p.color};"></span>
                <span>${escapeHtml(p.name)}</span>
            </button>
        `;
    });

    container.innerHTML = html;
}

function selectIndividualPerson(personId) {
    selectedPersonId = personId;
    renderIndividualTrackerPills(appPersons);
    loadIndividualTracker(personId);
}

function selectAndOpenIndividualTracker(personId) {
    selectedPersonId = personId;
    switchTab('individual-tab');
    renderIndividualTrackerPills(appPersons);
    loadIndividualTracker(personId);
}

async function loadIndividualTracker(personId) {
    if (!personId) return;

    // Find person in appPersons or summary
    const person = appPersons.find(p => p.id === personId);
    if (!person) return;

    // Update Hero Card
    const initials = getInitials(person.name);
    const avatarEl = document.getElementById('ind-avatar');
    if (avatarEl) {
        avatarEl.textContent = initials;
        avatarEl.style.backgroundColor = person.color || '#4F46E5';
    }

    const nameEl = document.getElementById('ind-person-name');
    if (nameEl) nameEl.textContent = person.name;

    const subEl = document.getElementById('ind-person-sub');
    if (subEl) subEl.textContent = `${person.expense_count} total expenses recorded`;

    const totalSpentEl = document.getElementById('ind-total-spent');
    if (totalSpentEl) totalSpentEl.textContent = formatINR(person.total_spent);

    const shareTotalEl = document.getElementById('ind-share-total');
    if (shareTotalEl) {
        const totalGroupSpent = appSummary ? appSummary.total_spent : 0;
        const share = totalGroupSpent > 0 ? ((person.total_spent / totalGroupSpent) * 100).toFixed(1) : 0;
        shareTotalEl.textContent = `${share}%`;
    }

    const sharePoolEl = document.getElementById('ind-share-pool');
    if (sharePoolEl) {
        const poolInitial = appSummary ? appSummary.initial_balance : 0;
        const poolImpact = poolInitial > 0 ? ((person.total_spent / poolInitial) * 100).toFixed(1) : 0;
        sharePoolEl.textContent = `${poolImpact}%`;
    }

    const titleEl = document.getElementById('ind-table-title');
    if (titleEl) titleEl.textContent = `Expenses by ${person.name}`;

    // Load person's specific expenses
    try {
        const res = await fetch(`/api/expenses?person_id=${personId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        renderIndividualExpensesTable(json.data);
    } catch (err) {
        console.error('Failed to load individual expenses:', err);
    }
}

function renderIndividualExpensesTable(expenses) {
    const tbody = document.getElementById('ind-expense-tbody');
    const emptyState = document.getElementById('ind-expense-empty');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!expenses || expenses.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    expenses.forEach(exp => {
        const cat = CATEGORY_META[exp.category] || CATEGORY_META['Others'];
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/80 transition-colors';
        tr.innerHTML = `
            <td class="py-3.5 px-5 font-medium text-slate-500 text-xs whitespace-nowrap">
                ${exp.date}
            </td>
            <td class="py-3.5 px-5">
                <div class="font-bold text-slate-800">${escapeHtml(exp.title)}</div>
                ${exp.notes ? `<div class="text-xs text-slate-400 mt-0.5">${escapeHtml(exp.notes)}</div>` : ''}
            </td>
            <td class="py-3.5 px-5 whitespace-nowrap">
                <span class="badge-category ${cat.bg} ${cat.text}">
                    <i class="fa-solid ${cat.icon} mr-1.5 text-[10px]"></i> ${exp.category}
                </span>
            </td>
            <td class="py-3.5 px-5 whitespace-nowrap">
                <span class="mode-pill">
                    <i class="fa-solid fa-credit-card text-[9px] text-slate-400"></i> ${exp.payment_mode || 'UPI'}
                </span>
            </td>
            <td class="py-3.5 px-5 text-right font-black text-slate-900 whitespace-nowrap">
                ${formatINR(exp.amount)}
            </td>
            <td class="py-3.5 px-5 text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-1">
                    <button onclick="openEditExpenseModal(${exp.id})" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                        <i class="fa-solid fa-pen-to-square text-xs"></i>
                    </button>
                    <button onclick="confirmDeleteExpense(${exp.id})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// =================== ALL EXPENSES LOG ===================
async function loadAllExpenses() {
    try {
        const personId = document.getElementById('filter-person-select')?.value || '';
        const category = document.getElementById('filter-category-select')?.value || '';
        const search = document.getElementById('expense-search-input')?.value || '';

        let url = `/api/expenses?`;
        if (personId) url += `person_id=${personId}&`;
        if (category) url += `category=${encodeURIComponent(category)}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;

        const res = await fetch(url);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        renderAllExpensesTable(json.data);
    } catch (err) {
        console.error('Failed to load all expenses:', err);
    }
}

function renderAllExpensesTable(expenses) {
    const tbody = document.getElementById('all-expenses-tbody');
    const emptyState = document.getElementById('all-expenses-empty');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!expenses || expenses.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    expenses.forEach(exp => {
        const cat = CATEGORY_META[exp.category] || CATEGORY_META['Others'];
        const initials = getInitials(exp.person_name);
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/80 transition-colors';
        tr.innerHTML = `
            <td class="py-3.5 px-5 font-medium text-slate-500 text-xs whitespace-nowrap">
                ${exp.date}
            </td>
            <td class="py-3.5 px-5">
                <div class="font-bold text-slate-800">${escapeHtml(exp.title)}</div>
                ${exp.notes ? `<div class="text-xs text-slate-400 mt-0.5">${escapeHtml(exp.notes)}</div>` : ''}
            </td>
            <td class="py-3.5 px-5 whitespace-nowrap">
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg text-white flex items-center justify-center text-[10px] font-bold shadow-sm" style="background-color: ${exp.person_color || '#4F46E5'};">
                        ${initials}
                    </span>
                    <span class="font-semibold text-slate-700 text-xs">${escapeHtml(exp.person_name)}</span>
                </div>
            </td>
            <td class="py-3.5 px-5 whitespace-nowrap">
                <span class="badge-category ${cat.bg} ${cat.text}">
                    <i class="fa-solid ${cat.icon} mr-1.5 text-[10px]"></i> ${exp.category}
                </span>
            </td>
            <td class="py-3.5 px-5 whitespace-nowrap">
                <span class="mode-pill">
                    <i class="fa-solid fa-credit-card text-[9px] text-slate-400"></i> ${exp.payment_mode || 'UPI'}
                </span>
            </td>
            <td class="py-3.5 px-5 text-right font-black text-slate-900 whitespace-nowrap">
                ${formatINR(exp.amount)}
            </td>
            <td class="py-3.5 px-5 text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-1">
                    <button onclick="openEditExpenseModal(${exp.id})" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                        <i class="fa-solid fa-pen-to-square text-xs"></i>
                    </button>
                    <button onclick="confirmDeleteExpense(${exp.id})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function resetExpenseFilters() {
    const searchInput = document.getElementById('expense-search-input');
    const personSelect = document.getElementById('filter-person-select');
    const catSelect = document.getElementById('filter-category-select');

    if (searchInput) searchInput.value = '';
    if (personSelect) personSelect.value = '';
    if (catSelect) catSelect.value = '';

    loadAllExpenses();
}

// =================== TAB SWITCHING ===================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active-tab');
        btn.classList.add('text-slate-500');
    });

    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.remove('hidden');

    const activeBtn = document.getElementById(`tab-btn-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.add('active-tab');
        activeBtn.classList.remove('text-slate-500');
    }

    if (tabId === 'individual-tab' && selectedPersonId) {
        loadIndividualTracker(selectedPersonId);
    }
}

// =================== MODAL ACTIONS ===================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

// --- Initial Balance Modal ---
function openBalanceModal() {
    const input = document.getElementById('input-initial-balance');
    if (input && appSummary) {
        input.value = appSummary.initial_balance;
    }
    openModal('modal-balance');
}

function setBalanceInput(val) {
    const input = document.getElementById('input-initial-balance');
    if (input) input.value = val;
}

async function handleUpdateBalance(e) {
    e.preventDefault();
    const input = document.getElementById('input-initial-balance');
    const newBalance = parseFloat(input.value);

    try {
        const res = await fetch('/api/settings/initial-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initial_balance: newBalance })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        closeModal('modal-balance');
        Swal.fire({
            icon: 'success',
            title: 'Initial Balance Updated!',
            text: `Initial balance successfully set to ${formatINR(newBalance)}`,
            timer: 2000,
            showConfirmButton: false
        });

        refreshAllData();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

// --- Expense Modal ---
function openAddExpenseModal() {
    document.getElementById('input-expense-id').value = '';
    document.getElementById('input-expense-title').value = '';
    document.getElementById('input-expense-amount').value = '';
    document.getElementById('input-expense-notes').value = '';
    document.getElementById('modal-expense-title').textContent = 'Record New Expense';

    const dateInput = document.getElementById('input-expense-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    if (appPersons.length === 0) {
        Swal.fire('No Persons Found', 'Please add at least one person before recording an expense.', 'warning');
        switchTab('persons-tab');
        return;
    }

    openModal('modal-expense');
}

function openAddExpenseForCurrentPerson() {
    openAddExpenseModal();
    if (selectedPersonId) {
        const select = document.getElementById('input-expense-person');
        if (select) select.value = selectedPersonId;
    }
}

function openAddExpenseForSpecificPerson(personId) {
    openAddExpenseModal();
    const select = document.getElementById('input-expense-person');
    if (select) select.value = personId;
}

async function openEditExpenseModal(expenseId) {
    try {
        const res = await fetch(`/api/expenses/${expenseId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        const exp = json.data;
        document.getElementById('input-expense-id').value = exp.id;
        document.getElementById('input-expense-title').value = exp.title;
        document.getElementById('input-expense-amount').value = exp.amount;
        document.getElementById('input-expense-category').value = exp.category;
        document.getElementById('input-expense-person').value = exp.person_id;
        document.getElementById('input-expense-date').value = exp.date;
        document.getElementById('input-expense-mode').value = exp.payment_mode || 'UPI';
        document.getElementById('input-expense-notes').value = exp.notes || '';

        document.getElementById('modal-expense-title').textContent = 'Edit Expense';
        openModal('modal-expense');
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function handleSaveExpense(e) {
    e.preventDefault();
    const id = document.getElementById('input-expense-id').value;
    const title = document.getElementById('input-expense-title').value.trim();
    const amount = parseFloat(document.getElementById('input-expense-amount').value);
    const category = document.getElementById('input-expense-category').value;
    const person_id = parseInt(document.getElementById('input-expense-person').value);
    const date = document.getElementById('input-expense-date').value;
    const payment_mode = document.getElementById('input-expense-mode').value;
    const notes = document.getElementById('input-expense-notes').value.trim();

    const payload = { title, amount, category, person_id, date, payment_mode, notes };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/expenses/${id}` : '/api/expenses';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        closeModal('modal-expense');
        Swal.fire({
            icon: 'success',
            title: id ? 'Expense Updated!' : 'Expense Added!',
            text: `${title} (${formatINR(amount)}) has been recorded.`,
            timer: 1800,
            showConfirmButton: false
        });

        refreshAllData();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function confirmDeleteExpense(expenseId) {
    const result = await Swal.fire({
        title: 'Delete this expense?',
        text: 'This will restore the amount to the remaining balance.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, delete'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Expense removed.',
                timer: 1500,
                showConfirmButton: false
            });

            refreshAllData();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    }
}

// --- Person Modal ---
function openAddPersonModal() {
    document.getElementById('input-person-id').value = '';
    document.getElementById('input-person-name').value = '';
    document.getElementById('input-person-color').value = '#4F46E5';
    document.getElementById('modal-person-title').textContent = 'Add New Person';
    openModal('modal-person');
}

function openEditPersonModal(id, name, color) {
    document.getElementById('input-person-id').value = id;
    document.getElementById('input-person-name').value = name;
    document.getElementById('input-person-color').value = color || '#4F46E5';
    document.getElementById('modal-person-title').textContent = 'Edit Person';
    openModal('modal-person');
}

function setPersonColor(colorHex) {
    const input = document.getElementById('input-person-color');
    if (input) input.value = colorHex;
}

async function handleSavePerson(e) {
    e.preventDefault();
    const id = document.getElementById('input-person-id').value;
    const name = document.getElementById('input-person-name').value.trim();
    const color = document.getElementById('input-person-color').value;

    const payload = { name, color };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/persons/${id}` : '/api/persons';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        closeModal('modal-person');
        Swal.fire({
            icon: 'success',
            title: id ? 'Person Updated!' : 'Person Added!',
            text: `${name} is ready for tracking.`,
            timer: 1800,
            showConfirmButton: false
        });

        if (!id && json.id) {
            selectedPersonId = json.id;
        }

        refreshAllData();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function confirmDeletePerson(personId, personName) {
    const result = await Swal.fire({
        title: `Delete ${personName}?`,
        text: 'All associated expenses recorded for this person will also be deleted from the system and pool!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, delete person & expenses'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/persons/${personId}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: `${personName} and their records were removed.`,
                timer: 1500,
                showConfirmButton: false
            });

            if (selectedPersonId === personId) {
                selectedPersonId = null;
            }

            refreshAllData();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    }
}

// Utility: HTML escape
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
