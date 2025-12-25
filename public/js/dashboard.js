// SellerSync Dashboard Script

// Check authentication
if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
}

let sellers = [];
let payments = [];
let pendingAmounts = [];

// Load all dashboard data
async function loadDashboard() {
    try {
        // Load summary
        const summary = await api.get('/payments/summary');
        updateSummaryCards(summary);

        // Load sellers for dropdown
        sellers = await api.get('/sellers');
        renderSellersList();
        populateSellerDropdown();

        // Load pending amounts
        pendingAmounts = await api.get('/payments/pending');
        renderPendingTable();

        // Load recent payments
        payments = await api.get('/payments');
        renderRecentPayments();

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

function updateSummaryCards(summary) {
    document.getElementById('totalPayments').textContent = formatCurrency(summary.total_payments);
    document.getElementById('cashInHand').textContent = formatCurrency(summary.cash_in_hand);
    document.getElementById('totalPending').textContent = formatCurrency(summary.total_pending);
    document.getElementById('activeSellers').textContent = summary.by_seller.length;

    // Update payment change indicator
    const changeEl = document.querySelector('#paymentChange span');
    if (changeEl) {
        changeEl.textContent = `₹${formatNumber(summary.total_payments)} total`;
    }
}

function renderSellersList() {
    const container = document.getElementById('sellersList');
    
    if (sellers.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-500);">No sellers found</p>';
        return;
    }

    container.innerHTML = sellers.slice(0, 3).map(seller => `
        <div class="seller-card" style="margin-bottom: var(--space-md);">
            <div class="seller-header">
                <div>
                    <div class="seller-name">${seller.name}</div>
                    <div class="seller-location">${seller.location || 'No location'}</div>
                </div>
                <span class="badge ${seller.status === 'active' ? 'badge-success' : 'badge-danger'}">
                    ${seller.status}
                </span>
            </div>
            <div class="seller-stats">
                <div>
                    <div class="seller-stat-label">Paid</div>
                    <div class="seller-stat-value" style="color: var(--success);">₹${formatNumber(seller.total_payments)}</div>
                </div>
                <div>
                    <div class="seller-stat-label">Pending</div>
                    <div class="seller-stat-value" style="color: var(--danger);">₹${formatNumber(seller.pending_amount)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderPendingTable() {
    const tbody = document.getElementById('pendingTable');
    document.getElementById('pendingCount').textContent = `${pendingAmounts.length} pending`;

    if (pendingAmounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--gray-500);">No pending amounts</td></tr>';
        return;
    }

    tbody.innerHTML = pendingAmounts.map(p => `
        <tr>
            <td>${p.seller_name}</td>
            <td class="amount negative">₹${formatNumber(p.amount)}</td>
            <td>${p.due_date ? formatDate(p.due_date) : '-'}</td>
            <td><span class="badge badge-${p.status === 'pending' ? 'warning' : 'primary'}">${p.status}</span></td>
        </tr>
    `).join('');
}

function renderRecentPayments() {
    const tbody = document.getElementById('recentPayments');

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray-500);">No payments recorded</td></tr>';
        return;
    }

    const recentPayments = payments.slice(0, 10);
    tbody.innerHTML = recentPayments.map(p => `
        <tr>
            <td>${formatDate(p.payment_date)}</td>
            <td>${p.seller_name}</td>
            <td><span class="badge badge-primary">${formatPaymentType(p.payment_type)}</span></td>
            <td class="amount positive">₹${formatNumber(p.amount)}</td>
            <td>${p.reference_number || '-'}</td>
        </tr>
    `).join('');
}

function formatPaymentType(type) {
    const types = {
        'cash': 'Cash',
        'bank_transfer': 'Bank',
        'upi': 'UPI',
        'cheque': 'Cheque'
    };
    return types[type] || type;
}

function populateSellerDropdown() {
    const select = document.getElementById('paymentSeller');
    if (!select) return;

    select.innerHTML = '<option value="">Select Seller</option>' +
        sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

// Payment Modal Functions
function openPaymentModal() {
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentModal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

async function submitPayment() {
    const data = {
        seller_id: document.getElementById('paymentSeller').value,
        amount: parseFloat(document.getElementById('paymentAmount').value),
        payment_date: document.getElementById('paymentDate').value,
        payment_type: document.getElementById('paymentType').value,
        reference_number: document.getElementById('paymentRef').value,
        notes: document.getElementById('paymentNotes').value
    };

    if (!data.seller_id || !data.amount) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    try {
        await api.post('/payments', data);
        showToast('Payment added successfully', 'success');
        closePaymentModal();
        loadDashboard();
    } catch (error) {
        showToast(error.message || 'Error adding payment', 'error');
    }
}

// Sidebar toggle for mobile
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Initialize dashboard
loadDashboard();
