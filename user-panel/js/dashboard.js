// Dashboard Manager for User Panel

class DashboardManager {
    constructor() {
        this.activeTournaments = [];
        this.recentTransactions = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Dashboard will be loaded when user is authenticated
        // This is called from auth.js
    }

    async loadDashboardData() {
        if (!authManager.isAuthenticated()) return;

        try {
            // Load active tournaments
            await this.loadActiveTournaments();
            
            // Load recent transactions
            await this.loadRecentTransactions();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showToast('Error loading dashboard data', 'error');
        }
    }

    async loadActiveTournaments() {
        try {
            const tournamentsRef = db.collection('tournaments')
                .where('status', 'in', ['upcoming', 'live'])
                .orderBy('startTime', 'asc')
                .limit(3);

            const snapshot = await tournamentsRef.get();
            this.activeTournaments = [];

            snapshot.forEach(doc => {
                this.activeTournaments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderActiveTournaments();
        } catch (error) {
            console.error('Error loading active tournaments:', error);
            this.renderActiveTournaments(); // Render empty state
        }
    }

    renderActiveTournaments() {
        const container = document.getElementById('activeTournaments');
        if (!container) return;

        if (this.activeTournaments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trophy"></i>
                    <h3>No Active Tournaments</h3>
                    <p>Check back later for new tournaments!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.activeTournaments.map(tournament => `
            <div class="tournament-card">
                <div class="tournament-header">
                    <div>
                        <h4 class="tournament-title">${tournament.name}</h4>
                        <span class="tournament-status status-${tournament.status}">
                            ${tournament.status}
                        </span>
                    </div>
                </div>
                <div class="tournament-info">
                    <p><i class="fas fa-trophy"></i> Prize: ${formatCurrency(tournament.prizePool)}</p>
                    <p><i class="fas fa-users"></i> ${tournament.participants?.length || 0}/${tournament.maxParticipants} Players</p>
                    <p><i class="fas fa-clock"></i> ${this.formatTournamentTime(tournament)}</p>
                    <p><i class="fas fa-dollar-sign"></i> Entry: ${formatCurrency(tournament.entryFee)}</p>
                </div>
                <div class="tournament-actions">
                    ${this.getTournamentActionButton(tournament)}
                </div>
            </div>
        `).join('');

        // Add event listeners for tournament actions
        this.setupTournamentActions();
    }

    getTournamentActionButton(tournament) {
        const currentUser = authManager.getCurrentUser();
        const userData = authManager.getUserData();
        
        if (!currentUser || !userData) {
            return '<button class="btn btn-secondary" disabled>Login Required</button>';
        }

        const isParticipant = tournament.participants?.includes(currentUser.uid);
        const isFull = tournament.participants?.length >= tournament.maxParticipants;
        const canAfford = userData.balance >= tournament.entryFee;

        if (isParticipant) {
            return '<button class="btn btn-secondary" disabled>Already Joined</button>';
        }

        if (tournament.status === 'live') {
            return '<button class="btn btn-secondary" disabled>Tournament Started</button>';
        }

        if (isFull) {
            return '<button class="btn btn-secondary" disabled>Tournament Full</button>';
        }

        if (!canAfford) {
            return '<button class="btn btn-secondary" disabled>Insufficient Balance</button>';
        }

        return `<button class="btn btn-primary join-tournament-btn" data-tournament-id="${tournament.id}">
            <i class="fas fa-plus"></i> Join Tournament
        </button>`;
    }

    setupTournamentActions() {
        const joinButtons = document.querySelectorAll('.join-tournament-btn');
        joinButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tournamentId = e.target.closest('.join-tournament-btn').dataset.tournamentId;
                this.showTournamentJoinModal(tournamentId);
            });
        });
    }

    async showTournamentJoinModal(tournamentId) {
        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament) return;

        const modal = document.getElementById('tournamentModal');
        const modalBody = document.getElementById('tournamentModalBody');
        
        if (!modal || !modalBody) return;

        modalBody.innerHTML = `
            <div class="tournament-join-details">
                <h3>${tournament.name}</h3>
                <div class="tournament-details">
                    <p><strong>Prize Pool:</strong> ${formatCurrency(tournament.prizePool)}</p>
                    <p><strong>Entry Fee:</strong> ${formatCurrency(tournament.entryFee)}</p>
                    <p><strong>Max Players:</strong> ${tournament.maxParticipants}</p>
                    <p><strong>Current Players:</strong> ${tournament.participants?.length || 0}</p>
                    <p><strong>Start Time:</strong> ${formatDate(tournament.startTime)}</p>
                    <p><strong>Game Mode:</strong> ${tournament.gameMode || 'Battle Royale'}</p>
                </div>
                <div class="tournament-description">
                    <p>${tournament.description || 'Join this exciting Free Fire tournament and compete for amazing prizes!'}</p>
                </div>
                <div class="tournament-rules">
                    <h4>Tournament Rules:</h4>
                    <ul>
                        <li>Entry fee will be deducted from your balance</li>
                        <li>You will earn ${TOURNAMENT_XP_REWARD} XP for participating</li>
                        <li>Tournament starts at the scheduled time</li>
                        <li>Follow fair play guidelines</li>
                        <li>Winners will be announced after the tournament</li>
                    </ul>
                </div>
                <div class="tournament-join-actions">
                    <button class="btn btn-primary" id="confirmJoinTournament" data-tournament-id="${tournamentId}">
                        <i class="fas fa-check"></i> Confirm Join (${formatCurrency(tournament.entryFee)})
                    </button>
                    <button class="btn btn-secondary" id="cancelJoinTournament">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // Setup modal event listeners
        const confirmBtn = document.getElementById('confirmJoinTournament');
        const cancelBtn = document.getElementById('cancelJoinTournament');
        const closeBtn = document.getElementById('closeTournamentModal');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.joinTournament(tournamentId);
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }

    async joinTournament(tournamentId) {
        const currentUser = authManager.getCurrentUser();
        const userData = authManager.getUserData();
        
        if (!currentUser || !userData) {
            showToast('Please login to join tournaments', 'error');
            return;
        }

        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament) {
            showToast('Tournament not found', 'error');
            return;
        }

        if (userData.balance < tournament.entryFee) {
            showToast('Insufficient balance to join tournament', 'error');
            return;
        }

        try {
            showLoading('confirmJoinTournament');

            // Join tournament in a transaction
            await db.runTransaction(async (transaction) => {
                const tournamentRef = db.collection('tournaments').doc(tournamentId);
                const userRef = db.collection('users').doc(currentUser.uid);
                
                const tournamentDoc = await transaction.get(tournamentRef);
                const userDoc = await transaction.get(userRef);
                
                if (!tournamentDoc.exists || !userDoc.exists) {
                    throw new Error('Tournament or user not found');
                }
                
                const tournamentData = tournamentDoc.data();
                const currentUserData = userDoc.data();
                
                // Check if tournament is still available
                if (tournamentData.participants?.length >= tournamentData.maxParticipants) {
                    throw new Error('Tournament is full');
                }
                
                if (tournamentData.participants?.includes(currentUser.uid)) {
                    throw new Error('Already joined this tournament');
                }
                
                if (currentUserData.balance < tournament.entryFee) {
                    throw new Error('Insufficient balance');
                }
                
                // Update tournament participants
                const newParticipants = [...(tournamentData.participants || []), currentUser.uid];
                transaction.update(tournamentRef, {
                    participants: newParticipants
                });
                
                // Update user balance and XP
                const newBalance = currentUserData.balance - tournament.entryFee;
                const newXP = (currentUserData.userXP || 0) + TOURNAMENT_XP_REWARD;
                const newMatchesPlayed = (currentUserData.matchesPlayed || 0) + 1;
                
                transaction.update(userRef, {
                    balance: newBalance,
                    userXP: newXP,
                    matchesPlayed: newMatchesPlayed
                });
                
                // Add transaction record
                const transactionRef = db.collection('transactions').doc();
                transaction.set(transactionRef, {
                    userId: currentUser.uid,
                    amount: -tournament.entryFee,
                    type: 'tournament_entry',
                    description: `Joined tournament: ${tournament.name}`,
                    tournamentId: tournamentId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'completed'
                });
            });

            // Close modal
            const modal = document.getElementById('tournamentModal');
            if (modal) {
                modal.classList.remove('active');
            }

            // Show success message
            showToast(`Successfully joined ${tournament.name}!`, 'success');
            
            // Award XP with animation
            await xpManager.awardXP(TOURNAMENT_XP_REWARD, 'Tournament participation');
            
            // Refresh data
            await authManager.refreshUserData();
            await this.loadDashboardData();
            
        } catch (error) {
            console.error('Error joining tournament:', error);
            showToast(error.message || 'Error joining tournament', 'error');
        } finally {
            hideLoading('confirmJoinTournament');
        }
    }

    async loadRecentTransactions() {
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return;

        try {
            const transactionsRef = db.collection('transactions')
                .where('userId', '==', currentUser.uid)
                .orderBy('timestamp', 'desc')
                .limit(5);

            const snapshot = await transactionsRef.get();
            this.recentTransactions = [];

            snapshot.forEach(doc => {
                this.recentTransactions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderRecentTransactions();
        } catch (error) {
            console.error('Error loading recent transactions:', error);
            this.renderRecentTransactions(); // Render empty state
        }
    }

    renderRecentTransactions() {
        const container = document.getElementById('recentTransactions');
        if (!container) return;

        if (this.recentTransactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No Transactions Yet</h3>
                    <p>Your transaction history will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.recentTransactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${this.getTransactionIconClass(transaction)}">
                        <i class="${this.getTransactionIcon(transaction)}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${this.getTransactionTitle(transaction)}</h4>
                        <p>${formatDate(transaction.timestamp)}</p>
                    </div>
                </div>
                <div class="transaction-amount ${this.getAmountClass(transaction.amount)}">
                    ${transaction.amount > 0 ? '+' : ''}${formatCurrency(transaction.amount)}
                </div>
            </div>
        `).join('');
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
            'tournament_entry': 'Tournament Entry',
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

    formatTournamentTime(tournament) {
        if (!tournament.startTime) return 'TBD';
        
        const startTime = tournament.startTime.toDate ? tournament.startTime.toDate() : new Date(tournament.startTime);
        const now = new Date();
        const diff = startTime.getTime() - now.getTime();
        
        if (diff < 0) {
            return 'Started';
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `Starts in ${days} day${days > 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `Starts in ${hours}h ${minutes}m`;
        } else {
            return `Starts in ${minutes}m`;
        }
    }

    // Refresh dashboard data
    async refresh() {
        await this.loadDashboardData();
    }
}

// Initialize dashboard manager
const dashboardManager = new DashboardManager();

// Make it globally available
window.dashboardManager = dashboardManager;

