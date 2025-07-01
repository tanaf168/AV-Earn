// Tournament Management Module for Admin Panel

class AdminTournamentManager {
    constructor() {
        this.tournaments = [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Create tournament button
        const createTournamentBtn = document.getElementById('createTournamentBtn');
        if (createTournamentBtn) {
            createTournamentBtn.addEventListener('click', () => {
                this.showCreateTournamentModal();
            });
        }

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
        if (!adminAuthManager.isAuthenticated()) return;

        try {
            showLoading('tournamentsTableBody');

            const tournamentsRef = db.collection('tournaments')
                .orderBy('createdAt', 'desc')
                .limit(50);

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
            hideLoading('tournamentsTableBody');
        }
    }

    renderTournaments() {
        const tableBody = document.getElementById('tournamentsTableBody');
        if (!tableBody) return;

        const filteredTournaments = this.getFilteredTournaments();

        if (filteredTournaments.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-trophy"></i>
                            <h3>No Tournaments Found</h3>
                            <p>No tournaments match your current filter</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filteredTournaments.map(tournament => `
            <tr>
                <td>
                    <div class="tournament-info">
                        <strong>${tournament.name}</strong>
                        <br>
                        <small>${tournament.description || 'No description'}</small>
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${tournament.status}">
                        ${tournament.status}
                    </span>
                </td>
                <td>
                    ${tournament.participants?.length || 0}/${tournament.maxParticipants}
                </td>
                <td class="amount-positive">
                    ${formatCurrency(tournament.prizePool)}
                </td>
                <td>
                    ${formatDate(tournament.startTime)}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary view-tournament" data-id="${tournament.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary edit-tournament" data-id="${tournament.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${tournament.status === 'upcoming' ? `
                            <button class="btn btn-sm btn-success start-tournament" data-id="${tournament.id}">
                                <i class="fas fa-play"></i>
                            </button>
                        ` : ''}
                        ${tournament.status === 'live' ? `
                            <button class="btn btn-sm btn-warning end-tournament" data-id="${tournament.id}">
                                <i class="fas fa-stop"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger delete-tournament" data-id="${tournament.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

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

    setupTournamentActions() {
        // View tournament
        document.querySelectorAll('.view-tournament').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tournamentId = e.target.closest('.view-tournament').dataset.id;
                this.viewTournament(tournamentId);
            });
        });

        // Edit tournament
        document.querySelectorAll('.edit-tournament').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tournamentId = e.target.closest('.edit-tournament').dataset.id;
                this.editTournament(tournamentId);
            });
        });

        // Start tournament
        document.querySelectorAll('.start-tournament').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tournamentId = e.target.closest('.start-tournament').dataset.id;
                this.startTournament(tournamentId);
            });
        });

        // End tournament
        document.querySelectorAll('.end-tournament').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tournamentId = e.target.closest('.end-tournament').dataset.id;
                this.endTournament(tournamentId);
            });
        });

        // Delete tournament
        document.querySelectorAll('.delete-tournament').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tournamentId = e.target.closest('.delete-tournament').dataset.id;
                this.deleteTournament(tournamentId);
            });
        });
    }

    showCreateTournamentModal() {
        const modal = document.getElementById('tournamentModal');
        const modalTitle = document.getElementById('tournamentModalTitle');
        const modalBody = document.getElementById('tournamentModalBody');
        
        if (!modal || !modalTitle || !modalBody) return;

        modalTitle.textContent = 'Create Tournament';
        modalBody.innerHTML = this.getTournamentFormHTML();

        modal.classList.add('active');

        // Setup form submission
        const tournamentForm = document.getElementById('tournamentForm');
        if (tournamentForm) {
            tournamentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateTournament();
            });
        }

        // Setup close button
        const closeBtn = document.getElementById('closeTournamentModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }

    getTournamentFormHTML(tournament = null) {
        const isEdit = !!tournament;
        
        return `
            <form id="tournamentForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="tournamentName">Tournament Name</label>
                        <input type="text" id="tournamentName" value="${tournament?.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="gameMode">Game Mode</label>
                        <select id="gameMode" required>
                            <option value="">Select Game Mode</option>
                            <option value="Battle Royale" ${tournament?.gameMode === 'Battle Royale' ? 'selected' : ''}>Battle Royale</option>
                            <option value="Clash Squad" ${tournament?.gameMode === 'Clash Squad' ? 'selected' : ''}>Clash Squad</option>
                            <option value="Ranked" ${tournament?.gameMode === 'Ranked' ? 'selected' : ''}>Ranked</option>
                            <option value="Custom" ${tournament?.gameMode === 'Custom' ? 'selected' : ''}>Custom</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="tournamentDescription">Description</label>
                    <textarea id="tournamentDescription" placeholder="Enter tournament description...">${tournament?.description || ''}</textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="maxParticipants">Max Participants</label>
                        <input type="number" id="maxParticipants" value="${tournament?.maxParticipants || 100}" min="2" max="1000" required>
                    </div>
                    <div class="form-group">
                        <label for="entryFee">Entry Fee ($)</label>
                        <input type="number" id="entryFee" value="${tournament?.entryFee || 0}" min="0" step="0.01" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="prizePool">Prize Pool ($)</label>
                        <input type="number" id="prizePool" value="${tournament?.prizePool || 0}" min="0" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="startTime">Start Time</label>
                        <input type="datetime-local" id="startTime" value="${tournament ? this.formatDateTimeLocal(tournament.startTime) : ''}" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="registrationDeadline">Registration Deadline</label>
                        <input type="datetime-local" id="registrationDeadline" value="${tournament ? this.formatDateTimeLocal(tournament.registrationDeadline) : ''}">
                    </div>
                    <div class="form-group">
                        <label for="tournamentStatus">Status</label>
                        <select id="tournamentStatus" ${!isEdit ? 'disabled' : ''}>
                            <option value="upcoming" ${tournament?.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
                            <option value="live" ${tournament?.status === 'live' ? 'selected' : ''}>Live</option>
                            <option value="completed" ${tournament?.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="tournamentRules">Tournament Rules</label>
                    <textarea id="tournamentRules" placeholder="Enter tournament rules and guidelines...">${tournament?.rules || ''}</textarea>
                </div>

                <div class="form-group">
                    <label for="prizeDistribution">Prize Distribution</label>
                    <textarea id="prizeDistribution" placeholder="1st Place: 50%, 2nd Place: 30%, 3rd Place: 20%">${tournament?.prizeDistribution || ''}</textarea>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelTournamentForm">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i>
                        ${isEdit ? 'Update Tournament' : 'Create Tournament'}
                    </button>
                </div>
            </form>
        `;
    }

    async handleCreateTournament() {
        if (!adminAuthManager.isAuthenticated()) {
            showToast('Admin authentication required', 'error');
            return;
        }

        const formData = this.getTournamentFormData();
        
        if (!this.validateTournamentForm(formData)) {
            return;
        }

        try {
            showLoading('tournamentForm');

            const tournamentData = {
                ...formData,
                status: 'upcoming',
                participants: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: adminAuthManager.getCurrentAdmin().uid,
                createdByName: adminAuthManager.getAdminData().displayName || 'Admin'
            };

            await db.collection('tournaments').add(tournamentData);

            showToast('Tournament created successfully!', 'success');
            
            // Close modal
            const modal = document.getElementById('tournamentModal');
            if (modal) {
                modal.classList.remove('active');
            }

            // Reload tournaments
            await this.loadTournaments();

        } catch (error) {
            console.error('Error creating tournament:', error);
            showToast('Error creating tournament', 'error');
        } finally {
            hideLoading('tournamentForm');
        }
    }

    getTournamentFormData() {
        return {
            name: document.getElementById('tournamentName').value,
            gameMode: document.getElementById('gameMode').value,
            description: document.getElementById('tournamentDescription').value,
            maxParticipants: parseInt(document.getElementById('maxParticipants').value),
            entryFee: parseFloat(document.getElementById('entryFee').value),
            prizePool: parseFloat(document.getElementById('prizePool').value),
            startTime: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('startTime').value)),
            registrationDeadline: document.getElementById('registrationDeadline').value ? 
                firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('registrationDeadline').value)) : null,
            rules: document.getElementById('tournamentRules').value,
            prizeDistribution: document.getElementById('prizeDistribution').value
        };
    }

    validateTournamentForm(formData) {
        if (!formData.name.trim()) {
            showToast('Tournament name is required', 'error');
            return false;
        }

        if (!formData.gameMode) {
            showToast('Game mode is required', 'error');
            return false;
        }

        if (formData.maxParticipants < 2) {
            showToast('Minimum 2 participants required', 'error');
            return false;
        }

        if (formData.entryFee < 0) {
            showToast('Entry fee cannot be negative', 'error');
            return false;
        }

        if (formData.prizePool < 0) {
            showToast('Prize pool cannot be negative', 'error');
            return false;
        }

        const startTime = formData.startTime.toDate();
        const now = new Date();
        
        if (startTime <= now) {
            showToast('Start time must be in the future', 'error');
            return false;
        }

        return true;
    }

    async editTournament(tournamentId) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) {
            showToast('Tournament not found', 'error');
            return;
        }

        const modal = document.getElementById('tournamentModal');
        const modalTitle = document.getElementById('tournamentModalTitle');
        const modalBody = document.getElementById('tournamentModalBody');
        
        if (!modal || !modalTitle || !modalBody) return;

        modalTitle.textContent = 'Edit Tournament';
        modalBody.innerHTML = this.getTournamentFormHTML(tournament);

        modal.classList.add('active');

        // Setup form submission
        const tournamentForm = document.getElementById('tournamentForm');
        if (tournamentForm) {
            tournamentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateTournament(tournamentId);
            });
        }

        // Setup close button
        const closeBtn = document.getElementById('closeTournamentModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }

    async handleUpdateTournament(tournamentId) {
        if (!adminAuthManager.isAuthenticated()) {
            showToast('Admin authentication required', 'error');
            return;
        }

        const formData = this.getTournamentFormData();
        
        if (!this.validateTournamentForm(formData)) {
            return;
        }

        try {
            showLoading('tournamentForm');

            const updateData = {
                ...formData,
                status: document.getElementById('tournamentStatus').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: adminAuthManager.getCurrentAdmin().uid
            };

            await db.collection('tournaments').doc(tournamentId).update(updateData);

            showToast('Tournament updated successfully!', 'success');
            
            // Close modal
            const modal = document.getElementById('tournamentModal');
            if (modal) {
                modal.classList.remove('active');
            }

            // Reload tournaments
            await this.loadTournaments();

        } catch (error) {
            console.error('Error updating tournament:', error);
            showToast('Error updating tournament', 'error');
        } finally {
            hideLoading('tournamentForm');
        }
    }

    async startTournament(tournamentId) {
        if (!confirm('Are you sure you want to start this tournament?')) {
            return;
        }

        try {
            await db.collection('tournaments').doc(tournamentId).update({
                status: 'live',
                actualStartTime: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: adminAuthManager.getCurrentAdmin().uid
            });

            showToast('Tournament started successfully!', 'success');
            await this.loadTournaments();
        } catch (error) {
            console.error('Error starting tournament:', error);
            showToast('Error starting tournament', 'error');
        }
    }

    async endTournament(tournamentId) {
        if (!confirm('Are you sure you want to end this tournament?')) {
            return;
        }

        try {
            await db.collection('tournaments').doc(tournamentId).update({
                status: 'completed',
                endTime: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: adminAuthManager.getCurrentAdmin().uid
            });

            showToast('Tournament ended successfully!', 'success');
            await this.loadTournaments();
        } catch (error) {
            console.error('Error ending tournament:', error);
            showToast('Error ending tournament', 'error');
        }
    }

    async deleteTournament(tournamentId) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) {
            showToast('Tournament not found', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete "${tournament.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await db.collection('tournaments').doc(tournamentId).delete();
            showToast('Tournament deleted successfully!', 'success');
            await this.loadTournaments();
        } catch (error) {
            console.error('Error deleting tournament:', error);
            showToast('Error deleting tournament', 'error');
        }
    }

    viewTournament(tournamentId) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) {
            showToast('Tournament not found', 'error');
            return;
        }

        // Show tournament details in modal
        const modal = document.getElementById('tournamentModal');
        const modalTitle = document.getElementById('tournamentModalTitle');
        const modalBody = document.getElementById('tournamentModalBody');
        
        if (!modal || !modalTitle || !modalBody) return;

        modalTitle.textContent = `Tournament: ${tournament.name}`;
        modalBody.innerHTML = this.getTournamentDetailsHTML(tournament);

        modal.classList.add('active');

        // Setup close button
        const closeBtn = document.getElementById('closeTournamentModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }

    getTournamentDetailsHTML(tournament) {
        return `
            <div class="tournament-details">
                <div class="detail-section">
                    <h4>Basic Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>Name:</strong> ${tournament.name}
                        </div>
                        <div class="detail-item">
                            <strong>Game Mode:</strong> ${tournament.gameMode}
                        </div>
                        <div class="detail-item">
                            <strong>Status:</strong> 
                            <span class="status-badge status-${tournament.status}">${tournament.status}</span>
                        </div>
                        <div class="detail-item">
                            <strong>Participants:</strong> ${tournament.participants?.length || 0}/${tournament.maxParticipants}
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Financial Details</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>Entry Fee:</strong> ${formatCurrency(tournament.entryFee)}
                        </div>
                        <div class="detail-item">
                            <strong>Prize Pool:</strong> ${formatCurrency(tournament.prizePool)}
                        </div>
                        <div class="detail-item">
                            <strong>Total Revenue:</strong> ${formatCurrency((tournament.participants?.length || 0) * tournament.entryFee)}
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Schedule</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>Start Time:</strong> ${formatDate(tournament.startTime)}
                        </div>
                        <div class="detail-item">
                            <strong>Registration Deadline:</strong> ${tournament.registrationDeadline ? formatDate(tournament.registrationDeadline) : 'Not set'}
                        </div>
                        <div class="detail-item">
                            <strong>Created:</strong> ${formatDate(tournament.createdAt)}
                        </div>
                        <div class="detail-item">
                            <strong>Created By:</strong> ${tournament.createdByName || 'Admin'}
                        </div>
                    </div>
                </div>

                ${tournament.description ? `
                    <div class="detail-section">
                        <h4>Description</h4>
                        <p>${tournament.description}</p>
                    </div>
                ` : ''}

                ${tournament.rules ? `
                    <div class="detail-section">
                        <h4>Rules</h4>
                        <p>${tournament.rules}</p>
                    </div>
                ` : ''}

                ${tournament.prizeDistribution ? `
                    <div class="detail-section">
                        <h4>Prize Distribution</h4>
                        <p>${tournament.prizeDistribution}</p>
                    </div>
                ` : ''}

                <div class="modal-actions">
                    <button class="btn btn-secondary" id="closeTournamentDetails">Close</button>
                    <button class="btn btn-primary edit-tournament-btn" data-id="${tournament.id}">
                        <i class="fas fa-edit"></i> Edit Tournament
                    </button>
                </div>
            </div>
        `;
    }

    formatDateTimeLocal(timestamp) {
        if (!timestamp) return '';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toISOString().slice(0, 16);
    }

    // Refresh tournaments data
    async refresh() {
        await this.loadTournaments();
    }
}

// Initialize admin tournament manager
const adminTournamentManager = new AdminTournamentManager();

// Make it globally available
window.adminTournamentManager = adminTournamentManager;

