// Main Application Controller for User Panel

class UserPanelApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupWithdrawForm();
        this.setupTransactionsPage();
        this.setupMobileMenu();
        this.setupModalCloseHandlers();
        
        // Initialize page
        this.showPage('dashboard');
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link[data-page]');
        const viewAllBtns = document.querySelectorAll('.view-all-btn[data-page]');
        
        // Navigation links
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) {
                    this.showPage(page);
                }
            });
        });

        // View all buttons
        viewAllBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const page = btn.dataset.page;
                if (page) {
                    this.showPage(page);
                }
            });
        });
    }

    showPage(pageName) {
        // Hide all pages
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageName;
        }

        // Update navigation
        this.updateNavigation(pageName);

        // Load page-specific data
        this.loadPageData(pageName);

        // Dispatch page change event
        document.dispatchEvent(new CustomEvent('pageChanged', {
            detail: { page: pageName }
        }));
    }

    updateNavigation(activePage) {
        const navLinks = document.querySelectorAll('.nav-link[data-page]');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === activePage) {
                link.classList.add('active');
            }
        });
    }

    loadPageData(pageName) {
        switch (pageName) {
            case 'dashboard':
                if (window.dashboardManager) {
                    window.dashboardManager.loadDashboardData();
                }
                break;
            case 'tournaments':
                if (window.tournamentManager) {
                    window.tournamentManager.loadTournaments();
                }
                break;
            case 'transactions':
                this.loadTransactions();
                break;
            case 'withdraw':
                this.loadWithdrawData();
                break;
            case 'profile':
                this.loadProfileData();
                break;
        }
    }

    setupWithdrawForm() {
        const withdrawForm = document.getElementById('withdrawForm');
        if (!withdrawForm) return;

        withdrawForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleWithdrawRequest();
        });

        // Payment method change handler
        const paymentMethod = document.getElementById('paymentMethod');
        if (paymentMethod) {
            paymentMethod.addEventListener('change', (e) => {
                this.updatePaymentDetailsPlaceholder(e.target.value);
            });
        }
    }

    updatePaymentDetailsPlaceholder(method) {
        const paymentDetails = document.getElementById('paymentDetails');
        if (!paymentDetails) return;

        const placeholders = {
            'paypal': 'Enter your PayPal email address',
            'bank': 'Enter your bank account details (Account number, routing number, etc.)',
            'crypto': 'Enter your cryptocurrency wallet address'
        };

        paymentDetails.placeholder = placeholders[method] || 'Enter your payment details';
    }

    async handleWithdrawRequest() {
        const currentUser = authManager.getCurrentUser();
        const userData = authManager.getUserData();
        
        if (!currentUser || !userData) {
            showToast('Please login to request withdrawal', 'error');
            return;
        }

        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        const paymentMethod = document.getElementById('paymentMethod').value;
        const paymentDetails = document.getElementById('paymentDetails').value;

        // Validation
        if (!amount || amount < 10) {
            showToast('Minimum withdrawal amount is $10', 'error');
            return;
        }

        if (amount > userData.balance) {
            showToast('Insufficient balance for withdrawal', 'error');
            return;
        }

        if (!paymentMethod) {
            showToast('Please select a payment method', 'error');
            return;
        }

        if (!paymentDetails.trim()) {
            showToast('Please enter payment details', 'error');
            return;
        }

        try {
            showLoading('withdrawForm');

            // Create withdrawal request
            const withdrawalRef = db.collection('withdrawals').doc();
            await withdrawalRef.set({
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userName: userData.displayName || 'Player',
                amount: amount,
                paymentMethod: paymentMethod,
                paymentDetails: paymentDetails,
                status: 'pending',
                requestDate: firebase.firestore.FieldValue.serverTimestamp(),
                processedDate: null,
                adminNotes: ''
            });

            // Update user balance (deduct the withdrawal amount)
            await db.collection('users').doc(currentUser.uid).update({
                balance: userData.balance - amount
            });

            // Add transaction record
            await db.collection('transactions').add({
                userId: currentUser.uid,
                amount: -amount,
                type: 'withdrawal',
                description: `Withdrawal request via ${paymentMethod}`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending',
                withdrawalId: withdrawalRef.id
            });

            // Reset form
            document.getElementById('withdrawForm').reset();

            showToast('Withdrawal request submitted successfully!', 'success');

            // Refresh data
            await authManager.refreshUserData();
            this.loadWithdrawData();

        } catch (error) {
            console.error('Error submitting withdrawal request:', error);
            showToast('Error submitting withdrawal request', 'error');
        } finally {
            hideLoading('withdrawForm');
        }
    }

    async loadWithdrawData() {
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return;

        try {
            // Load withdrawal history
            const withdrawalsRef = db.collection('withdrawals')
                .where('userId', '==', currentUser.uid)
                .orderBy('requestDate', 'desc')
                .limit(10);

            const snapshot = await withdrawalsRef.get();
            const withdrawals = [];

            snapshot.forEach(doc => {
                withdrawals.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderWithdrawalHistory(withdrawals);
        } catch (error) {
            console.error('Error loading withdrawal data:', error);
            this.renderWithdrawalHistory([]);
        }
    }

    renderWithdrawalHistory(withdrawals) {
        const container = document.getElementById('withdrawalsList');
        if (!container) return;

        if (withdrawals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-money-bill-wave"></i>
                    <h3>No Withdrawal Requests</h3>
                    <p>Your withdrawal history will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = withdrawals.map(withdrawal => `
            <div class="withdrawal-item">
                <div class="withdrawal-info">
                    <h4>${formatCurrency(withdrawal.amount)}</h4>
                    <p>via ${withdrawal.paymentMethod}</p>
                    <p>Requested: ${formatDate(withdrawal.requestDate)}</p>
                    ${withdrawal.processedDate ? `<p>Processed: ${formatDate(withdrawal.processedDate)}</p>` : ''}
                </div>
                <div class="withdrawal-status status-${withdrawal.status}">
                    ${withdrawal.status}
                </div>
            </div>
        `).join('');
    }

    setupTransactionsPage() {
        // Filter buttons for transactions
        const transactionFilters = document.querySelectorAll('.transactions-filter .filter-btn');
        transactionFilters.forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setTransactionFilter(filter);
            });
        });
    }

    setTransactionFilter(filter) {
        this.currentTransactionFilter = filter;
        
        // Update active filter button
        const filterButtons = document.querySelectorAll('.transactions-filter .filter-btn');
        filterButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.filter === filter) {
                button.classList.add('active');
            }
        });

        // Re-render transactions with filter
        this.loadTransactions();
    }

    async loadTransactions() {
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return;

        try {
            showLoading('transactionsContainer');

            let query = db.collection('transactions')
                .where('userId', '==', currentUser.uid)
                .orderBy('timestamp', 'desc')
                .limit(50);

            // Apply filter if not 'all'
            if (this.currentTransactionFilter && this.currentTransactionFilter !== 'all') {
                query = query.where('type', '==', this.currentTransactionFilter);
            }

            const snapshot = await query.get();
            const transactions = [];

            snapshot.forEach(doc => {
                transactions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderTransactions(transactions);
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.renderTransactions([]);
        } finally {
            hideLoading('transactionsContainer');
        }
    }

    renderTransactions(transactions) {
        const container = document.getElementById('transactionsContainer');
        if (!container) return;

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No Transactions Found</h3>
                    <p>No transactions match your current filter</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="transactions-list">
                ${transactions.map(transaction => `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <div class="transaction-icon ${this.getTransactionIconClass(transaction)}">
                                <i class="${this.getTransactionIcon(transaction)}"></i>
                            </div>
                            <div class="transaction-details">
                                <h4>${this.getTransactionTitle(transaction)}</h4>
                                <p>${transaction.description || 'No description'}</p>
                                <p>${formatDate(transaction.timestamp)}</p>
                            </div>
                        </div>
                        <div class="transaction-amount ${this.getAmountClass(transaction.amount)}">
                            ${transaction.amount > 0 ? '+' : ''}${formatCurrency(transaction.amount)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getTransactionIconClass(transaction) {
        if (transaction.amount > 0) return 'income';
        if (transaction.status === 'pending') return 'pending';
        return 'expense';
    }

    getTransactionIcon(transaction) {
        const iconMap = {
            'tournament_entry': 'fas fa-gamepad',
            'tournament_win': 'fas fa-trophy',
            'withdrawal': 'fas fa-money-bill-wave',
            'bonus': 'fas fa-gift',
            'refund': 'fas fa-undo'
        };
        
        return iconMap[transaction.type] || 'fas fa-exchange-alt';
    }

    getTransactionTitle(transaction) {
        const titleMap = {
            'tournament_entry': 'Tournament Entry Fee',
            'tournament_win': 'Tournament Prize',
            'withdrawal': 'Withdrawal Request',
            'bonus': 'Bonus Reward',
            'refund': 'Refund'
        };
        
        return titleMap[transaction.type] || 'Transaction';
    }

    getAmountClass(amount) {
        if (amount > 0) return 'amount-positive';
        if (amount < 0) return 'amount-negative';
        return 'amount-pending';
    }

    loadProfileData() {
        // Profile data is loaded by auth manager
        // Just ensure XP display is updated
        const userData = authManager.getUserData();
        if (userData && window.xpManager) {
            window.xpManager.updateRankDisplay(userData.userXP || 0);
        }
    }

    setupMobileMenu() {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
            });

            // Close menu when clicking on a link
            const navLinks = navMenu.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    navToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            });
        }
    }

    setupModalCloseHandlers() {
        // Close modals when clicking outside
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Close tournament modal
        const closeTournamentModal = document.getElementById('closeTournamentModal');
        if (closeTournamentModal) {
            closeTournamentModal.addEventListener('click', () => {
                const modal = document.getElementById('tournamentModal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        }
    }

    // Utility methods
    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }

    // Public methods
    getCurrentPage() {
        return this.currentPage;
    }

    refreshCurrentPage() {
        this.loadPageData(this.currentPage);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the main app
    const app = new UserPanelApp();
    
    // Make it globally available
    window.userPanelApp = app;
    
    console.log('Free Fire Tournament User Panel initialized successfully!');
});

// Handle page visibility changes to refresh data
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.userPanelApp && authManager.isAuthenticated()) {
        // Refresh current page data when user returns to the tab
        setTimeout(() => {
            window.userPanelApp.refreshCurrentPage();
        }, 1000);
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    showToast('Connection restored', 'success');
    if (window.userPanelApp && authManager.isAuthenticated()) {
        window.userPanelApp.refreshCurrentPage();
    }
});

window.addEventListener('offline', () => {
    showToast('Connection lost. Some features may not work.', 'warning');
});

