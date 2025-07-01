// Main Application Controller for Admin Panel

class AdminPanelApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupModalCloseHandlers();
        this.setupWithdrawalManagement();
        this.setupTransactionManagement();
        this.setupGamesManagement();
        this.setupPromotionsManagement();
        this.setupSettings();
        
        // Initialize page
        this.showPage('dashboard');
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        const viewAllBtns = document.querySelectorAll('.view-all[data-page]');
        
        // Navigation items
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
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

        // Update page title
        this.updatePageTitle(pageName);

        // Load page-specific data
        this.loadPageData(pageName);

        // Dispatch page change event
        document.dispatchEvent(new CustomEvent('pageChanged', {
            detail: { page: pageName }
        }));
    }

    updateNavigation(activePage) {
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === activePage) {
                item.classList.add('active');
            }
        });
    }

    updatePageTitle(pageName) {
        const pageTitle = document.getElementById('pageTitle');
        if (!pageTitle) return;

        const titles = {
            'dashboard': 'Dashboard',
            'tournaments': 'Tournament Management',
            'users': 'User Management',
            'withdrawals': 'Withdrawal Management',
            'transactions': 'Transaction History',
            'games': 'Games Management',
            'promotions': 'Promotions Management',
            'settings': 'System Settings'
        };

        pageTitle.textContent = titles[pageName] || 'Admin Panel';
    }

    loadPageData(pageName) {
        switch (pageName) {
            case 'dashboard':
                if (window.adminDashboard) {
                    window.adminDashboard.loadDashboardData();
                }
                break;
            case 'tournaments':
                if (window.adminTournamentManager) {
                    window.adminTournamentManager.loadTournaments();
                }
                break;
            case 'users':
                if (window.adminUserManager) {
                    window.adminUserManager.loadUsers();
                }
                break;
            case 'withdrawals':
                this.loadWithdrawals();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
            case 'games':
                this.loadGames();
                break;
            case 'promotions':
                this.loadPromotions();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');

        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
                
                // Add overlay for mobile
                if (sidebar.classList.contains('mobile-open')) {
                    this.showSidebarOverlay();
                } else {
                    this.hideSidebarOverlay();
                }
            });

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                        sidebar.classList.remove('mobile-open');
                        this.hideSidebarOverlay();
                    }
                }
            });
        }
    }

    showSidebarOverlay() {
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }
        overlay.classList.add('active');
        
        overlay.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('mobile-open');
            }
            this.hideSidebarOverlay();
        });
    }

    hideSidebarOverlay() {
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.classList.remove('active');
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
    }

    // Withdrawal Management
    setupWithdrawalManagement() {
        // Filter buttons for withdrawals
        const withdrawalFilters = document.querySelectorAll('.withdrawals-filter .filter-btn');
        withdrawalFilters.forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setWithdrawalFilter(filter);
            });
        });
    }

    setWithdrawalFilter(filter) {
        this.currentWithdrawalFilter = filter;
        
        // Update active filter button
        const filterButtons = document.querySelectorAll('.withdrawals-filter .filter-btn');
        filterButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.filter === filter) {
                button.classList.add('active');
            }
        });

        // Re-render withdrawals with filter
        this.loadWithdrawals();
    }

    async loadWithdrawals() {
        if (!adminAuthManager.isAuthenticated()) return;

        try {
            showLoading('withdrawalsTableBody');

            let query = db.collection('withdrawals')
                .orderBy('requestDate', 'desc')
                .limit(50);

            // Apply filter if not 'all'
            if (this.currentWithdrawalFilter && this.currentWithdrawalFilter !== 'all') {
                query = query.where('status', '==', this.currentWithdrawalFilter);
            }

            const snapshot = await query.get();
            const withdrawals = [];

            snapshot.forEach(doc => {
                withdrawals.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderWithdrawals(withdrawals);
        } catch (error) {
            console.error('Error loading withdrawals:', error);
            this.renderWithdrawals([]);
        } finally {
            hideLoading('withdrawalsTableBody');
        }
    }

    renderWithdrawals(withdrawals) {
        const tableBody = document.getElementById('withdrawalsTableBody');
        if (!tableBody) return;

        if (withdrawals.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-money-bill-wave"></i>
                            <h3>No Withdrawals Found</h3>
                            <p>No withdrawals match your current filter</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = withdrawals.map(withdrawal => `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${this.getUserInitials(withdrawal.userName || withdrawal.userEmail)}
                        </div>
                        <div class="user-details">
                            <div class="user-name">${withdrawal.userName || 'Player'}</div>
                            <div class="user-email">${withdrawal.userEmail}</div>
                        </div>
                    </div>
                </td>
                <td class="amount-negative">${formatCurrency(withdrawal.amount)}</td>
                <td>${withdrawal.paymentMethod}</td>
                <td>
                    <span class="status-badge status-${withdrawal.status}">
                        ${withdrawal.status}
                    </span>
                </td>
                <td>${formatDate(withdrawal.requestDate)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary view-withdrawal" data-id="${withdrawal.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${withdrawal.status === 'pending' ? `
                            <button class="btn btn-sm btn-success approve-withdrawal" data-id="${withdrawal.id}">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-danger reject-withdrawal" data-id="${withdrawal.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        // Setup withdrawal action listeners
        this.setupWithdrawalActions();
    }

    setupWithdrawalActions() {
        // View withdrawal
        document.querySelectorAll('.view-withdrawal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const withdrawalId = e.target.closest('.view-withdrawal').dataset.id;
                this.viewWithdrawal(withdrawalId);
            });
        });

        // Approve withdrawal
        document.querySelectorAll('.approve-withdrawal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const withdrawalId = e.target.closest('.approve-withdrawal').dataset.id;
                this.approveWithdrawal(withdrawalId);
            });
        });

        // Reject withdrawal
        document.querySelectorAll('.reject-withdrawal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const withdrawalId = e.target.closest('.reject-withdrawal').dataset.id;
                this.rejectWithdrawal(withdrawalId);
            });
        });
    }

    async viewWithdrawal(withdrawalId) {
        // Implementation for viewing withdrawal details
        showToast('Withdrawal details view - to be implemented', 'info');
    }

    async approveWithdrawal(withdrawalId) {
        if (!confirm('Are you sure you want to approve this withdrawal?')) {
            return;
        }

        try {
            await db.collection('withdrawals').doc(withdrawalId).update({
                status: 'approved',
                processedDate: firebase.firestore.FieldValue.serverTimestamp(),
                processedBy: adminAuthManager.getCurrentAdmin().uid,
                adminNotes: 'Approved by admin'
            });

            showToast('Withdrawal approved successfully', 'success');
            await this.loadWithdrawals();
        } catch (error) {
            console.error('Error approving withdrawal:', error);
            showToast('Error approving withdrawal', 'error');
        }
    }

    async rejectWithdrawal(withdrawalId) {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            // Get withdrawal data to refund user
            const withdrawalDoc = await db.collection('withdrawals').doc(withdrawalId).get();
            if (!withdrawalDoc.exists) {
                showToast('Withdrawal not found', 'error');
                return;
            }

            const withdrawal = withdrawalDoc.data();

            await db.runTransaction(async (transaction) => {
                const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
                const userRef = db.collection('users').doc(withdrawal.userId);

                // Update withdrawal status
                transaction.update(withdrawalRef, {
                    status: 'rejected',
                    processedDate: firebase.firestore.FieldValue.serverTimestamp(),
                    processedBy: adminAuthManager.getCurrentAdmin().uid,
                    adminNotes: reason
                });

                // Refund the amount to user's balance
                const userDoc = await transaction.get(userRef);
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const newBalance = (userData.balance || 0) + withdrawal.amount;
                    
                    transaction.update(userRef, {
                        balance: newBalance
                    });

                    // Add refund transaction
                    const transactionRef = db.collection('transactions').doc();
                    transaction.set(transactionRef, {
                        userId: withdrawal.userId,
                        amount: withdrawal.amount,
                        type: 'refund',
                        description: `Withdrawal refund: ${reason}`,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'completed',
                        adminId: adminAuthManager.getCurrentAdmin().uid
                    });
                }
            });

            showToast('Withdrawal rejected and amount refunded', 'success');
            await this.loadWithdrawals();
        } catch (error) {
            console.error('Error rejecting withdrawal:', error);
            showToast('Error rejecting withdrawal', 'error');
        }
    }

    // Transaction Management
    setupTransactionManagement() {
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
        if (!adminAuthManager.isAuthenticated()) return;

        try {
            showLoading('transactionsTableBody');

            let query = db.collection('transactions')
                .orderBy('timestamp', 'desc')
                .limit(100);

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
            hideLoading('transactionsTableBody');
        }
    }

    renderTransactions(transactions) {
        const tableBody = document.getElementById('transactionsTableBody');
        if (!tableBody) return;

        if (transactions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-exchange-alt"></i>
                            <h3>No Transactions Found</h3>
                            <p>No transactions match your current filter</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = transactions.map(transaction => `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">U</div>
                        <div class="user-details">
                            <div class="user-name">User</div>
                            <div class="user-email">${transaction.userId}</div>
                        </div>
                    </div>
                </td>
                <td>${this.getTransactionTypeLabel(transaction.type)}</td>
                <td class="${transaction.amount > 0 ? 'amount-positive' : 'amount-negative'}">
                    ${transaction.amount > 0 ? '+' : ''}${formatCurrency(transaction.amount)}
                </td>
                <td>${transaction.description || 'No description'}</td>
                <td>${formatDate(transaction.timestamp)}</td>
                <td>
                    <span class="status-badge status-${transaction.status || 'completed'}">
                        ${transaction.status || 'completed'}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // Games Management
    setupGamesManagement() {
        const addGameBtn = document.getElementById('addGameBtn');
        if (addGameBtn) {
            addGameBtn.addEventListener('click', () => {
                this.showAddGameModal();
            });
        }
    }

    async loadGames() {
        // Implementation for loading games
        const gamesGrid = document.getElementById('gamesGrid');
        if (gamesGrid) {
            gamesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-gamepad"></i>
                    <h3>Games Management</h3>
                    <p>Game management features coming soon</p>
                </div>
            `;
        }
    }

    showAddGameModal() {
        showToast('Add game feature - to be implemented', 'info');
    }

    // Promotions Management
    setupPromotionsManagement() {
        const createPromotionBtn = document.getElementById('createPromotionBtn');
        if (createPromotionBtn) {
            createPromotionBtn.addEventListener('click', () => {
                this.showCreatePromotionModal();
            });
        }
    }

    async loadPromotions() {
        // Implementation for loading promotions
        const promotionsContainer = document.getElementById('promotionsContainer');
        if (promotionsContainer) {
            promotionsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullhorn"></i>
                    <h3>Promotions Management</h3>
                    <p>Promotions management features coming soon</p>
                </div>
            `;
        }
    }

    showCreatePromotionModal() {
        showToast('Create promotion feature - to be implemented', 'info');
    }

    // Settings Management
    setupSettings() {
        // XP Settings
        const saveXPSettings = document.getElementById('saveXPSettings');
        if (saveXPSettings) {
            saveXPSettings.addEventListener('click', () => {
                if (window.adminXPManager) {
                    window.adminXPManager.saveXPSettings();
                }
            });
        }

        // Tournament Settings
        const saveTournamentSettings = document.getElementById('saveTournamentSettings');
        if (saveTournamentSettings) {
            saveTournamentSettings.addEventListener('click', () => {
                this.saveTournamentSettings();
            });
        }

        // Withdrawal Settings
        const saveWithdrawalSettings = document.getElementById('saveWithdrawalSettings');
        if (saveWithdrawalSettings) {
            saveWithdrawalSettings.addEventListener('click', () => {
                this.saveWithdrawalSettings();
            });
        }
    }

    async loadSettings() {
        // Load XP settings
        if (window.adminXPManager) {
            await window.adminXPManager.loadXPSettings();
        }

        // Load other settings
        await this.loadTournamentSettings();
        await this.loadWithdrawalSettings();
    }

    async saveTournamentSettings() {
        const minEntryFee = parseFloat(document.getElementById('minEntryFee').value);
        const maxParticipants = parseInt(document.getElementById('maxParticipants').value);

        try {
            await db.collection('settings').doc('tournaments').set({
                minEntryFee: minEntryFee,
                maxParticipants: maxParticipants,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: adminAuthManager.getCurrentAdmin().uid
            });

            showToast('Tournament settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving tournament settings:', error);
            showToast('Error saving tournament settings', 'error');
        }
    }

    async loadTournamentSettings() {
        try {
            const settingsDoc = await db.collection('settings').doc('tournaments').get();
            
            if (settingsDoc.exists) {
                const settings = settingsDoc.data();
                
                const minEntryFeeInput = document.getElementById('minEntryFee');
                const maxParticipantsInput = document.getElementById('maxParticipants');
                
                if (minEntryFeeInput) {
                    minEntryFeeInput.value = settings.minEntryFee || 1;
                }
                
                if (maxParticipantsInput) {
                    maxParticipantsInput.value = settings.maxParticipants || 100;
                }
            }
        } catch (error) {
            console.error('Error loading tournament settings:', error);
        }
    }

    async saveWithdrawalSettings() {
        const minWithdrawal = parseFloat(document.getElementById('minWithdrawal').value);
        const withdrawalFee = parseFloat(document.getElementById('withdrawalFee').value);

        try {
            await db.collection('settings').doc('withdrawals').set({
                minWithdrawal: minWithdrawal,
                withdrawalFee: withdrawalFee,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: adminAuthManager.getCurrentAdmin().uid
            });

            showToast('Withdrawal settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving withdrawal settings:', error);
            showToast('Error saving withdrawal settings', 'error');
        }
    }

    async loadWithdrawalSettings() {
        try {
            const settingsDoc = await db.collection('settings').doc('withdrawals').get();
            
            if (settingsDoc.exists) {
                const settings = settingsDoc.data();
                
                const minWithdrawalInput = document.getElementById('minWithdrawal');
                const withdrawalFeeInput = document.getElementById('withdrawalFee');
                
                if (minWithdrawalInput) {
                    minWithdrawalInput.value = settings.minWithdrawal || 10;
                }
                
                if (withdrawalFeeInput) {
                    withdrawalFeeInput.value = settings.withdrawalFee || 0;
                }
            }
        } catch (error) {
            console.error('Error loading withdrawal settings:', error);
        }
    }

    // Utility methods
    getUserInitials(name) {
        if (!name) return 'U';
        
        const words = name.split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        } else {
            return name.substring(0, 2).toUpperCase();
        }
    }

    getTransactionTypeLabel(type) {
        const labels = {
            'tournament_entry': 'Tournament Entry',
            'tournament_win': 'Tournament Win',
            'withdrawal': 'Withdrawal',
            'bonus': 'Bonus',
            'refund': 'Refund',
            'admin_adjustment': 'Admin Adjustment'
        };
        
        return labels[type] || type;
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
    const app = new AdminPanelApp();
    
    // Make it globally available
    window.adminApp = app;
    
    console.log('Free Fire Tournament Admin Panel initialized successfully!');
});

// Handle page visibility changes to refresh data
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.adminApp && adminAuthManager.isAuthenticated()) {
        // Refresh current page data when admin returns to the tab
        setTimeout(() => {
            window.adminApp.refreshCurrentPage();
        }, 1000);
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    showToast('Connection restored', 'success');
    if (window.adminApp && adminAuthManager.isAuthenticated()) {
        window.adminApp.refreshCurrentPage();
    }
});

window.addEventListener('offline', () => {
    showToast('Connection lost. Some features may not work.', 'warning');
});

