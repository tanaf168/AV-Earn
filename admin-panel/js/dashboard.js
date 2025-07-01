// Admin Dashboard Manager

class AdminDashboard {
    constructor() {
        this.stats = {};
        this.recentTournaments = [];
        this.pendingWithdrawals = [];
        this.userActivity = [];
        this.init();
    }

    init() {
        // Dashboard will be loaded when admin is authenticated
    }

    async loadDashboardData() {
        if (!adminAuthManager.isAuthenticated()) return;

        try {
            // Load all dashboard data in parallel
            await Promise.all([
                this.loadStats(),
                this.loadRecentTournaments(),
                this.loadPendingWithdrawals(),
                this.loadUserActivity()
            ]);

            this.renderDashboard();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showToast('Error loading dashboard data', 'error');
        }
    }

    async loadStats() {
        try {
            this.stats = await adminAuthManager.getSystemStats();
        } catch (error) {
            console.error('Error loading stats:', error);
            this.stats = {
                totalUsers: 0,
                activeTournaments: 0,
                pendingWithdrawals: 0,
                totalRevenue: 0
            };
        }
    }

    async loadRecentTournaments() {
        try {
            const tournamentsSnapshot = await db.collection('tournaments')
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();

            this.recentTournaments = [];
            tournamentsSnapshot.forEach(doc => {
                this.recentTournaments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        } catch (error) {
            console.error('Error loading recent tournaments:', error);
            this.recentTournaments = [];
        }
    }

    async loadPendingWithdrawals() {
        try {
            const withdrawalsSnapshot = await db.collection('withdrawals')
                .where('status', '==', 'pending')
                .orderBy('requestDate', 'desc')
                .limit(5)
                .get();

            this.pendingWithdrawals = [];
            withdrawalsSnapshot.forEach(doc => {
                this.pendingWithdrawals.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        } catch (error) {
            console.error('Error loading pending withdrawals:', error);
            this.pendingWithdrawals = [];
        }
    }

    async loadUserActivity() {
        try {
            // Get recent user registrations
            const usersSnapshot = await db.collection('users')
                .where('role', '==', USER_ROLES.USER)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();

            this.userActivity = [];
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                this.userActivity.push({
                    id: doc.id,
                    type: 'registration',
                    displayName: userData.displayName || 'Player',
                    email: userData.email,
                    timestamp: userData.createdAt,
                    ...userData
                });
            });
        } catch (error) {
            console.error('Error loading user activity:', error);
            this.userActivity = [];
        }
    }

    renderDashboard() {
        this.renderStats();
        this.renderRecentTournaments();
        this.renderPendingWithdrawals();
        this.renderUserActivity();
    }

    renderStats() {
        // Update stat cards
        const totalUsersElement = document.getElementById('totalUsers');
        const activeTournamentsElement = document.getElementById('activeTournaments');
        const pendingWithdrawalsElement = document.getElementById('pendingWithdrawals');
        const totalRevenueElement = document.getElementById('totalRevenue');

        if (totalUsersElement) {
            totalUsersElement.textContent = this.stats.totalUsers.toLocaleString();
        }

        if (activeTournamentsElement) {
            activeTournamentsElement.textContent = this.stats.activeTournaments.toLocaleString();
        }

        if (pendingWithdrawalsElement) {
            pendingWithdrawalsElement.textContent = this.stats.pendingWithdrawals.toLocaleString();
        }

        if (totalRevenueElement) {
            totalRevenueElement.textContent = formatCurrency(this.stats.totalRevenue);
        }
    }

    renderRecentTournaments() {
        const container = document.getElementById('recentTournaments');
        if (!container) return;

        if (this.recentTournaments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trophy"></i>
                    <h3>No Recent Tournaments</h3>
                    <p>Create your first tournament to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.recentTournaments.map(tournament => `
            <div class="tournament-item">
                <div class="tournament-info">
                    <h4>${tournament.name}</h4>
                    <p>
                        <span class="status-badge status-${tournament.status}">
                            ${tournament.status}
                        </span>
                        ${tournament.participants?.length || 0}/${tournament.maxParticipants} players
                    </p>
                    <p class="tournament-meta">
                        Prize: ${formatCurrency(tournament.prizePool)} • 
                        Entry: ${formatCurrency(tournament.entryFee)}
                    </p>
                </div>
                <div class="tournament-actions">
                    <button class="btn btn-sm btn-secondary view-tournament" data-id="${tournament.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.view-tournament').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tournamentId = e.target.closest('.view-tournament').dataset.id;
                this.viewTournament(tournamentId);
            });
        });
    }

    renderPendingWithdrawals() {
        const container = document.getElementById('pendingWithdrawalsList');
        if (!container) return;

        if (this.pendingWithdrawals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-money-bill-wave"></i>
                    <h3>No Pending Withdrawals</h3>
                    <p>All withdrawal requests have been processed</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.pendingWithdrawals.map(withdrawal => `
            <div class="withdrawal-item">
                <div class="withdrawal-info">
                    <h4>${withdrawal.userName || 'Player'}</h4>
                    <p>${formatCurrency(withdrawal.amount)} via ${withdrawal.paymentMethod}</p>
                    <p class="withdrawal-meta">
                        Requested: ${formatDate(withdrawal.requestDate)}
                    </p>
                </div>
                <div class="withdrawal-actions">
                    <button class="btn btn-sm btn-success approve-withdrawal" data-id="${withdrawal.id}">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-danger reject-withdrawal" data-id="${withdrawal.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.approve-withdrawal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const withdrawalId = e.target.closest('.approve-withdrawal').dataset.id;
                this.approveWithdrawal(withdrawalId);
            });
        });

        container.querySelectorAll('.reject-withdrawal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const withdrawalId = e.target.closest('.reject-withdrawal').dataset.id;
                this.rejectWithdrawal(withdrawalId);
            });
        });
    }

    renderUserActivity() {
        const container = document.getElementById('userActivity');
        if (!container) return;

        if (this.userActivity.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Recent Activity</h3>
                    <p>User activity will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.userActivity.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-user-plus"></i>
                </div>
                <div class="activity-info">
                    <h4>New User Registration</h4>
                    <p>${activity.displayName} (${activity.email})</p>
                    <p class="activity-meta">
                        ${formatDate(activity.timestamp)}
                    </p>
                </div>
            </div>
        `).join('');
    }

    async viewTournament(tournamentId) {
        // Navigate to tournaments page and show specific tournament
        if (window.adminApp) {
            window.adminApp.showPage('tournaments');
            // Additional logic to highlight specific tournament can be added
        }
    }

    async approveWithdrawal(withdrawalId) {
        if (!adminAuthManager.isAuthenticated()) {
            showToast('Admin authentication required', 'error');
            return;
        }

        try {
            await db.collection('withdrawals').doc(withdrawalId).update({
                status: 'approved',
                processedDate: firebase.firestore.FieldValue.serverTimestamp(),
                processedBy: adminAuthManager.getCurrentAdmin().uid,
                adminNotes: 'Approved from dashboard'
            });

            showToast('Withdrawal approved successfully', 'success');
            
            // Reload dashboard data
            await this.loadDashboardData();
        } catch (error) {
            console.error('Error approving withdrawal:', error);
            showToast('Error approving withdrawal', 'error');
        }
    }

    async rejectWithdrawal(withdrawalId) {
        if (!adminAuthManager.isAuthenticated()) {
            showToast('Admin authentication required', 'error');
            return;
        }

        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            const withdrawal = this.pendingWithdrawals.find(w => w.id === withdrawalId);
            if (!withdrawal) {
                showToast('Withdrawal not found', 'error');
                return;
            }

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
            
            // Reload dashboard data
            await this.loadDashboardData();
        } catch (error) {
            console.error('Error rejecting withdrawal:', error);
            showToast('Error rejecting withdrawal', 'error');
        }
    }

    // Real-time updates
    setupRealtimeUpdates() {
        // Listen for new tournaments
        db.collection('tournaments')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        // Reload recent tournaments
                        this.loadRecentTournaments().then(() => {
                            this.renderRecentTournaments();
                        });
                    }
                });
            });

        // Listen for new withdrawals
        db.collection('withdrawals')
            .where('status', '==', 'pending')
            .onSnapshot(snapshot => {
                this.loadPendingWithdrawals().then(() => {
                    this.renderPendingWithdrawals();
                });
            });

        // Listen for new users
        db.collection('users')
            .where('role', '==', USER_ROLES.USER)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        this.loadUserActivity().then(() => {
                            this.renderUserActivity();
                        });
                    }
                });
            });
    }

    // Refresh dashboard
    async refresh() {
        await this.loadDashboardData();
    }

    // Export dashboard data
    async exportDashboardData() {
        try {
            const data = {
                stats: this.stats,
                recentTournaments: this.recentTournaments,
                pendingWithdrawals: this.pendingWithdrawals,
                userActivity: this.userActivity,
                exportedAt: new Date().toISOString(),
                exportedBy: adminAuthManager.getAdminData().displayName || 'Admin'
            };

            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `dashboard-data-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            showToast('Dashboard data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting dashboard data:', error);
            showToast('Error exporting dashboard data', 'error');
        }
    }
}

// Initialize admin dashboard
const adminDashboard = new AdminDashboard();

// Make it globally available
window.adminDashboard = adminDashboard;

