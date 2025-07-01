// Tournament Management for User Panel

class TournamentManager {
    constructor() {
        this.tournaments = [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Filter buttons
        const filterButtons = document.querySelectorAll('.tournaments-filter .filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter);
            });
        });

        // Load tournaments when tournaments page is shown
        document.addEventListener('pageChanged', (e) => {
            if (e.detail.page === 'tournaments') {
                this.loadTournaments();
            }
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        const filterButtons = document.querySelectorAll('.tournaments-filter .filter-btn');
        filterButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.filter === filter) {
                button.classList.add('active');
            }
        });

        // Re-render tournaments with filter
        this.renderTournaments();
    }

    async loadTournaments() {
        if (!authManager.isAuthenticated()) return;

        try {
            showLoading('tournamentsContainer');

            const tournamentsRef = db.collection('tournaments')
                .orderBy('startTime', 'desc')
                .limit(20);

            const snapshot = await tournamentsRef.get();
            this.tournaments = [];

            snapshot.forEach(doc => {
                this.tournaments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderTournaments();
        } catch (error) {
            console.error('Error loading tournaments:', error);
            this.renderTournaments(); // Render empty state
        } finally {
            hideLoading('tournamentsContainer');
        }
    }

    renderTournaments() {
        const container = document.getElementById('tournamentsContainer');
        if (!container) return;

        const filteredTournaments = this.getFilteredTournaments();

        if (filteredTournaments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trophy"></i>
                    <h3>No Tournaments Found</h3>
                    <p>No tournaments match your current filter</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="tournaments-grid">
                ${filteredTournaments.map(tournament => this.renderTournamentCard(tournament)).join('')}
            </div>
        `;

        // Setup event listeners for tournament actions
        this.setupTournamentActions();
    }

    getFilteredTournaments() {
        if (this.currentFilter === 'all') {
            return this.tournaments;
        }

        return this.tournaments.filter(tournament => {
            switch (this.currentFilter) {
                case 'upcoming':
                    return tournament.status === 'upcoming';
                case 'live':
                    return tournament.status === 'live';
                case 'completed':
                    return tournament.status === 'completed';
                default:
                    return true;
            }
        });
    }

    renderTournamentCard(tournament) {
        const currentUser = authManager.getCurrentUser();
        const userData = authManager.getUserData();
        const isParticipant = tournament.participants?.includes(currentUser?.uid);
        
        return `
            <div class="tournament-card">
                <div class="tournament-header">
                    <div>
                        <h4 class="tournament-title">${tournament.name}</h4>
                        <span class="tournament-status status-${tournament.status}">
                            ${tournament.status}
                        </span>
                    </div>
                    ${isParticipant ? '<div class="participant-badge"><i class="fas fa-check"></i> Joined</div>' : ''}
                </div>
                
                <div class="tournament-info">
                    <p><i class="fas fa-trophy"></i> Prize Pool: ${formatCurrency(tournament.prizePool)}</p>
                    <p><i class="fas fa-users"></i> Players: ${tournament.participants?.length || 0}/${tournament.maxParticipants}</p>
                    <p><i class="fas fa-clock"></i> ${this.formatTournamentTime(tournament)}</p>
                    <p><i class="fas fa-dollar-sign"></i> Entry Fee: ${formatCurrency(tournament.entryFee)}</p>
                    <p><i class="fas fa-gamepad"></i> Mode: ${tournament.gameMode || 'Battle Royale'}</p>
                    <p><i class="fas fa-star"></i> XP Reward: ${TOURNAMENT_XP_REWARD} XP</p>
                </div>

                ${tournament.description ? `
                    <div class="tournament-description">
                        <p>${tournament.description}</p>
                    </div>
                ` : ''}

                <div class="tournament-actions">
                    ${this.getTournamentActionButtons(tournament, userData, isParticipant)}
                </div>

                ${tournament.status === 'completed' && tournament.winners ? `
                    <div class="tournament-winners">
                        <h5><i class="fas fa-crown"></i> Winners</h5>
                        ${this.renderWinners(tournament.winners)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    getTournamentActionButtons(tournament, userData, isParticipant) {
        const currentUser = authManager.getCurrentUser();
        
        if (!currentUser || !userData) {
            return '<button class="btn btn-secondary" disabled>Login Required</button>';
        }

        const buttons = [];

        // View Details button (always available)
        buttons.push(`
            <button class="btn btn-secondary view-tournament-btn" data-tournament-id="${tournament.id}">
                <i class="fas fa-eye"></i> View Details
            </button>
        `);

        // Join/Status buttons
        if (tournament.status === 'upcoming') {
            if (isParticipant) {
                buttons.push(`
                    <button class="btn btn-secondary" disabled>
                        <i class="fas fa-check"></i> Already Joined
                    </button>
                `);
            } else {
                const isFull = tournament.participants?.length >= tournament.maxParticipants;
                const canAfford = userData.balance >= tournament.entryFee;

                if (isFull) {
                    buttons.push(`
                        <button class="btn btn-secondary" disabled>
                            <i class="fas fa-users"></i> Tournament Full
                        </button>
                    `);
                } else if (!canAfford) {
                    buttons.push(`
                        <button class="btn btn-secondary" disabled>
                            <i class="fas fa-wallet"></i> Insufficient Balance
                        </button>
                    `);
                } else {
                    buttons.push(`
                        <button class="btn btn-primary join-tournament-btn" data-tournament-id="${tournament.id}">
                            <i class="fas fa-plus"></i> Join (${formatCurrency(tournament.entryFee)})
                        </button>
                    `);
                }
            }
        } else if (tournament.status === 'live') {
            if (isParticipant) {
                buttons.push(`
                    <button class="btn btn-success" disabled>
                        <i class="fas fa-play"></i> Tournament Live
                    </button>
                `);
            } else {
                buttons.push(`
                    <button class="btn btn-secondary" disabled>
                        <i class="fas fa-play"></i> Tournament Started
                    </button>
                `);
            }
        } else if (tournament.status === 'completed') {
            buttons.push(`
                <button class="btn btn-secondary view-results-btn" data-tournament-id="${tournament.id}">
                    <i class="fas fa-trophy"></i> View Results
                </button>
            `);
        }

        return buttons.join('');
    }

    renderWinners(winners) {
        if (!winners || winners.length === 0) {
            return '<p>Winners will be announced soon</p>';
        }

        return winners.slice(0, 3).map((winner, index) => {
            const position = index + 1;
            const medal = ['🥇', '🥈', '🥉'][index] || '🏆';
            
            return `
                <div class="winner-item">
                    <span class="winner-position">${medal} ${position}${this.getOrdinalSuffix(position)}</span>
                    <span class="winner-name">${winner.displayName || 'Player'}</span>
                    <span class="winner-prize">${formatCurrency(winner.prize)}</span>
                </div>
            `;
        }).join('');
    }

    getOrdinalSuffix(num) {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = num % 100;
        return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    }

    setupTournamentActions() {
        // Join tournament buttons
        const joinButtons = document.querySelectorAll('.join-tournament-btn');
        joinButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tournamentId = e.target.closest('.join-tournament-btn').dataset.tournamentId;
                this.showJoinTournamentModal(tournamentId);
            });
        });

        // View tournament details buttons
        const viewButtons = document.querySelectorAll('.view-tournament-btn');
        viewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tournamentId = e.target.closest('.view-tournament-btn').dataset.tournamentId;
                this.showTournamentDetailsModal(tournamentId);
            });
        });

        // View results buttons
        const resultsButtons = document.querySelectorAll('.view-results-btn');
        resultsButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tournamentId = e.target.closest('.view-results-btn').dataset.tournamentId;
                this.showTournamentResultsModal(tournamentId);
            });
        });
    }

    async showJoinTournamentModal(tournamentId) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;

        // Use the same modal logic as dashboard
        if (window.dashboardManager) {
            await window.dashboardManager.showTournamentJoinModal(tournamentId);
        }
    }

    showTournamentDetailsModal(tournamentId) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;

        const modal = document.getElementById('tournamentModal');
        const modalBody = document.getElementById('tournamentModalBody');
        
        if (!modal || !modalBody) return;

        const currentUser = authManager.getCurrentUser();
        const isParticipant = tournament.participants?.includes(currentUser?.uid);

        modalBody.innerHTML = `
            <div class="tournament-details-modal">
                <div class="tournament-header-modal">
                    <h3>${tournament.name}</h3>
                    <span class="tournament-status status-${tournament.status}">
                        ${tournament.status}
                    </span>
                </div>

                <div class="tournament-info-grid">
                    <div class="info-item">
                        <i class="fas fa-trophy"></i>
                        <div>
                            <strong>Prize Pool</strong>
                            <span>${formatCurrency(tournament.prizePool)}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-dollar-sign"></i>
                        <div>
                            <strong>Entry Fee</strong>
                            <span>${formatCurrency(tournament.entryFee)}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users"></i>
                        <div>
                            <strong>Participants</strong>
                            <span>${tournament.participants?.length || 0}/${tournament.maxParticipants}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <div>
                            <strong>Start Time</strong>
                            <span>${formatDate(tournament.startTime)}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-gamepad"></i>
                        <div>
                            <strong>Game Mode</strong>
                            <span>${tournament.gameMode || 'Battle Royale'}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-star"></i>
                        <div>
                            <strong>XP Reward</strong>
                            <span>${TOURNAMENT_XP_REWARD} XP</span>
                        </div>
                    </div>
                </div>

                ${tournament.description ? `
                    <div class="tournament-description-modal">
                        <h4>Description</h4>
                        <p>${tournament.description}</p>
                    </div>
                ` : ''}

                <div class="tournament-rules-modal">
                    <h4>Tournament Rules</h4>
                    <ul>
                        <li>Entry fee is non-refundable once the tournament starts</li>
                        <li>All participants earn ${TOURNAMENT_XP_REWARD} XP for joining</li>
                        <li>Follow fair play guidelines and game rules</li>
                        <li>Winners are determined based on tournament format</li>
                        <li>Prizes are distributed automatically after results</li>
                    </ul>
                </div>

                ${isParticipant ? `
                    <div class="participant-status">
                        <i class="fas fa-check-circle"></i>
                        <span>You are registered for this tournament</span>
                    </div>
                ` : ''}

                <div class="modal-actions">
                    <button class="btn btn-secondary" id="closeTournamentDetailsModal">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // Setup close button
        const closeBtn = document.getElementById('closeTournamentDetailsModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }

    showTournamentResultsModal(tournamentId) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;

        const modal = document.getElementById('tournamentModal');
        const modalBody = document.getElementById('tournamentModalBody');
        
        if (!modal || !modalBody) return;

        modalBody.innerHTML = `
            <div class="tournament-results-modal">
                <div class="tournament-header-modal">
                    <h3>${tournament.name} - Results</h3>
                    <span class="tournament-status status-completed">Completed</span>
                </div>

                <div class="tournament-summary">
                    <div class="summary-item">
                        <strong>Total Participants:</strong> ${tournament.participants?.length || 0}
                    </div>
                    <div class="summary-item">
                        <strong>Prize Pool:</strong> ${formatCurrency(tournament.prizePool)}
                    </div>
                    <div class="summary-item">
                        <strong>Completed:</strong> ${formatDate(tournament.endTime || tournament.startTime)}
                    </div>
                </div>

                ${tournament.winners && tournament.winners.length > 0 ? `
                    <div class="winners-section">
                        <h4><i class="fas fa-crown"></i> Tournament Winners</h4>
                        <div class="winners-list">
                            ${tournament.winners.map((winner, index) => {
                                const position = index + 1;
                                const medal = ['🥇', '🥈', '🥉'][index] || '🏆';
                                
                                return `
                                    <div class="winner-card">
                                        <div class="winner-rank">
                                            <span class="medal">${medal}</span>
                                            <span class="position">${position}${this.getOrdinalSuffix(position)} Place</span>
                                        </div>
                                        <div class="winner-info">
                                            <strong>${winner.displayName || 'Player'}</strong>
                                            <span class="winner-prize">${formatCurrency(winner.prize)}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="no-results">
                        <i class="fas fa-hourglass-half"></i>
                        <p>Results are being processed and will be available soon.</p>
                    </div>
                `}

                <div class="modal-actions">
                    <button class="btn btn-secondary" id="closeTournamentResultsModal">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // Setup close button
        const closeBtn = document.getElementById('closeTournamentResultsModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }

    formatTournamentTime(tournament) {
        if (!tournament.startTime) return 'TBD';
        
        const startTime = tournament.startTime.toDate ? tournament.startTime.toDate() : new Date(tournament.startTime);
        const now = new Date();
        
        if (tournament.status === 'completed') {
            return `Completed ${formatDate(tournament.endTime || tournament.startTime)}`;
        }
        
        if (tournament.status === 'live') {
            return 'Live Now!';
        }
        
        const diff = startTime.getTime() - now.getTime();
        
        if (diff < 0) {
            return 'Started';
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
            return `Starts in ${days} day${days > 1 ? 's' : ''}, ${hours}h`;
        } else if (hours > 0) {
            return `Starts in ${hours}h ${minutes}m`;
        } else {
            return `Starts in ${minutes}m`;
        }
    }

    // Refresh tournaments data
    async refresh() {
        await this.loadTournaments();
    }
}

// Initialize tournament manager
const tournamentManager = new TournamentManager();

// Make it globally available
window.tournamentManager = tournamentManager;

