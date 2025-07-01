// User Management Module for Admin Panel

class AdminUserManager {
    constructor() {
        this.users = [];
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // User search
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderUsers();
            });
        }

        // Load users when users page is shown
        document.addEventListener('pageChanged', (e) => {
            if (e.detail.page === 'users') {
                this.loadUsers();
            }
        });
    }

    async loadUsers() {
        if (!adminAuthManager.isAuthenticated()) return;

        try {
            showLoading('usersTableBody');

            const usersRef = db.collection('users')
                .orderBy('createdAt', 'desc')
                .limit(100);

            const snapshot = await usersRef.get();
            this.users = [];

            snapshot.forEach(doc => {
                this.users.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderUsers();
        } catch (error) {
            console.error('Error loading users:', error);
            this.renderUsers(); // Render empty state
        } finally {
            hideLoading('usersTableBody');
        }
    }

    renderUsers() {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;

        const filteredUsers = this.getFilteredUsers();

        if (filteredUsers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-users"></i>
                            <h3>No Users Found</h3>
                            <p>${this.searchQuery ? 'No users match your search' : 'No users registered yet'}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filteredUsers.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${this.getUserInitials(user.displayName || user.email)}
                        </div>
                        <div class="user-details">
                            <div class="user-name">${user.displayName || 'Player'}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td class="amount-positive">${formatCurrency(user.balance || 0)}</td>
                <td>
                    <div class="xp-display">
                        <strong>${user.userXP || 0} XP</strong>
                        <div class="xp-progress-mini">
                            ${adminXPManager.renderXPProgressBar(user.userXP || 0)}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="rank-display-small">
                        <span class="rank-icon-small">${getCurrentUserRank(user.userXP || 0).icon}</span>
                        <span class="rank-name-small">${getCurrentUserRank(user.userXP || 0).name}</span>
                    </div>
                </td>
                <td>${formatDate(user.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary view-user" data-id="${user.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary edit-user" data-id="${user.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-warning manage-xp" data-id="${user.id}">
                            <i class="fas fa-star"></i>
                        </button>
                        ${user.role !== USER_ROLES.ADMIN ? `
                            <button class="btn btn-sm btn-danger suspend-user" data-id="${user.id}">
                                <i class="fas fa-ban"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        // Setup event listeners for user actions
        this.setupUserActions();
    }

    getFilteredUsers() {
        if (!this.searchQuery) {
            return this.users;
        }

        return this.users.filter(user => {
            const searchableText = `
                ${user.displayName || ''} 
                ${user.email || ''} 
                ${user.role || ''}
            `.toLowerCase();
            
            return searchableText.includes(this.searchQuery);
        });
    }

    setupUserActions() {
        // View user
        document.querySelectorAll('.view-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('.view-user').dataset.id;
                this.viewUser(userId);
            });
        });

        // Edit user
        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('.edit-user').dataset.id;
                this.editUser(userId);
            });
        });

        // Manage XP
        document.querySelectorAll('.manage-xp').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('.manage-xp').dataset.id;
                this.manageUserXP(userId);
            });
        });

        // Suspend user
        document.querySelectorAll('.suspend-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('.suspend-user').dataset.id;
                this.suspendUser(userId);
            });
        });
    }

    async viewUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        const modal = document.getElementById('userModal');
        const modalTitle = document.getElementById('userModalTitle');
        const modalBody = document.getElementById('userModalBody');
        
        if (!modal || !modalTitle || !modalBody) return;

        modalTitle.textContent = `User: ${user.displayName || 'Player'}`;
        
        try {
            // Get additional user data
            const userXPData = await adminXPManager.getUserXPData(userId);
            const userTransactions = await this.getUserTransactions(userId);
            
            modalBody.innerHTML = this.getUserDetailsHTML(user, userXPData, userTransactions);
            
            modal.classList.add('active');

            // Setup close button
            const closeBtn = document.getElementById('closeUserModal');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                });
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            showToast('Error loading user details', 'error');
        }
    }

    getUserDetailsHTML(user, xpData, transactions) {
        const currentRank = getCurrentUserRank(user.userXP || 0);
        
        return `
            <div class="user-details-modal">
                <div class="user-header">
                    <div class="user-avatar-large">
                        ${this.getUserInitials(user.displayName || user.email)}
                    </div>
                    <div class="user-info-large">
                        <h3>${user.displayName || 'Player'}</h3>
                        <p>${user.email}</p>
                        <span class="user-role ${user.role === USER_ROLES.ADMIN ? 'admin' : 'user'}">
                            ${user.role === USER_ROLES.ADMIN ? 'Admin' : 'User'}
                        </span>
                    </div>
                </div>

                <div class="user-stats-grid">
                    <div class="stat-item">
                        <strong>Balance</strong>
                        <span class="amount-positive">${formatCurrency(user.balance || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <strong>Total Earnings</strong>
                        <span class="amount-positive">${formatCurrency(user.totalEarnings || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <strong>Matches Played</strong>
                        <span>${user.matchesPlayed || 0}</span>
                    </div>
                    <div class="stat-item">
                        <strong>Tournaments Won</strong>
                        <span>${user.tournamentsWon || 0}</span>
                    </div>
                </div>

                <div class="user-rank-section">
                    <h4>Rank & XP Progress</h4>
                    <div class="rank-display-large">
                        <div class="rank-icon-large">${currentRank.icon}</div>
                        <div class="rank-info-large">
                            <h3 class="rank-name-large">${currentRank.name}</h3>
                            <p><strong>${user.userXP || 0} XP</strong></p>
                            ${adminXPManager.renderXPProgressBar(user.userXP || 0)}
                        </div>
                    </div>
                </div>

                <div class="user-activity-section">
                    <h4>Account Information</h4>
                    <div class="activity-grid">
                        <div class="activity-item">
                            <strong>Joined:</strong> ${formatDate(user.createdAt)}
                        </div>
                        <div class="activity-item">
                            <strong>Last Login:</strong> ${formatDate(user.lastLogin)}
                        </div>
                        <div class="activity-item">
                            <strong>Status:</strong> 
                            <span class="status-badge ${user.suspended ? 'status-rejected' : 'status-approved'}">
                                ${user.suspended ? 'Suspended' : 'Active'}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="user-transactions-section">
                    <h4>Recent Transactions</h4>
                    <div class="transactions-mini">
                        ${transactions.length > 0 ? transactions.slice(0, 5).map(transaction => `
                            <div class="transaction-mini">
                                <span class="transaction-type">${this.getTransactionTypeLabel(transaction.type)}</span>
                                <span class="transaction-amount ${transaction.amount > 0 ? 'amount-positive' : 'amount-negative'}">
                                    ${transaction.amount > 0 ? '+' : ''}${formatCurrency(transaction.amount)}
                                </span>
                                <span class="transaction-date">${formatDate(transaction.timestamp)}</span>
                            </div>
                        `).join('') : '<p>No transactions found</p>'}
                    </div>
                </div>

                <div class="modal-actions">
                    <button class="btn btn-secondary" id="closeUserDetails">Close</button>
                    <button class="btn btn-primary edit-user-btn" data-id="${user.id}">
                        <i class="fas fa-edit"></i> Edit User
                    </button>
                    <button class="btn btn-warning manage-xp-btn" data-id="${user.id}">
                        <i class="fas fa-star"></i> Manage XP
                    </button>
                </div>
            </div>
        `;
    }

    async editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        const modal = document.getElementById('userModal');
        const modalTitle = document.getElementById('userModalTitle');
        const modalBody = document.getElementById('userModalBody');
        
        if (!modal || !modalTitle || !modalBody) return;

        modalTitle.textContent = `Edit User: ${user.displayName || 'Player'}`;
        modalBody.innerHTML = this.getUserEditFormHTML(user);

        modal.classList.add('active');

        // Setup form submission
        const userForm = document.getElementById('userEditForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateUser(userId);
            });
        }

        // Setup close button
        const closeBtn = document.getElementById('closeUserModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }

    getUserEditFormHTML(user) {
        return `
            <form id="userEditForm">
                <div class="form-group">
                    <label for="userDisplayName">Display Name</label>
                    <input type="text" id="userDisplayName" value="${user.displayName || ''}" required>
                </div>

                <div class="form-group">
                    <label for="userEmail">Email</label>
                    <input type="email" id="userEmail" value="${user.email}" readonly>
                    <small>Email cannot be changed</small>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="userBalance">Balance ($)</label>
                        <input type="number" id="userBalance" value="${user.balance || 0}" step="0.01">
                    </div>
                    <div class="form-group">
                        <label for="userXP">Experience Points</label>
                        <input type="number" id="userXP" value="${user.userXP || 0}" min="0">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="userRole">Role</label>
                        <select id="userRole">
                            <option value="${USER_ROLES.USER}" ${user.role === USER_ROLES.USER ? 'selected' : ''}>User</option>
                            <option value="${USER_ROLES.ADMIN}" ${user.role === USER_ROLES.ADMIN ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="userStatus">Status</label>
                        <select id="userStatus">
                            <option value="active" ${!user.suspended ? 'selected' : ''}>Active</option>
                            <option value="suspended" ${user.suspended ? 'selected' : ''}>Suspended</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="adminNotes">Admin Notes</label>
                    <textarea id="adminNotes" placeholder="Add notes about this user...">${user.adminNotes || ''}</textarea>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelUserEdit">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Update User
                    </button>
                </div>
            </form>
        `;
    }

    async handleUpdateUser(userId) {
        if (!adminAuthManager.isAuthenticated()) {
            showToast('Admin authentication required', 'error');
            return;
        }

        const displayName = document.getElementById('userDisplayName').value;
        const balance = parseFloat(document.getElementById('userBalance').value);
        const userXP = parseInt(document.getElementById('userXP').value);
        const role = document.getElementById('userRole').value;
        const status = document.getElementById('userStatus').value;
        const adminNotes = document.getElementById('adminNotes').value;

        if (!displayName.trim()) {
            showToast('Display name is required', 'error');
            return;
        }

        if (balance < 0) {
            showToast('Balance cannot be negative', 'error');
            return;
        }

        if (userXP < 0) {
            showToast('XP cannot be negative', 'error');
            return;
        }

        try {
            showLoading('userEditForm');

            const updateData = {
                displayName: displayName.trim(),
                balance: balance,
                userXP: userXP,
                role: role,
                suspended: status === 'suspended',
                adminNotes: adminNotes,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: adminAuthManager.getCurrentAdmin().uid
            };

            await db.collection('users').doc(userId).update(updateData);

            // Log the changes
            await db.collection('admin_logs').add({
                action: 'user_updated',
                targetUserId: userId,
                changes: updateData,
                adminId: adminAuthManager.getCurrentAdmin().uid,
                adminName: adminAuthManager.getAdminData().displayName || 'Admin',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast('User updated successfully!', 'success');
            
            // Close modal
            const modal = document.getElementById('userModal');
            if (modal) {
                modal.classList.remove('active');
            }

            // Reload users
            await this.loadUsers();

        } catch (error) {
            console.error('Error updating user:', error);
            showToast('Error updating user', 'error');
        } finally {
            hideLoading('userEditForm');
        }
    }

    async manageUserXP(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        const currentXP = user.userXP || 0;
        const currentRank = getCurrentUserRank(currentXP);

        const action = prompt(`Current XP: ${currentXP} (${currentRank.name})\n\nChoose action:\n1. Set XP\n2. Add XP\n3. Remove XP\n\nEnter: action_number:amount (e.g., "1:500" to set XP to 500)`);
        
        if (!action) return;

        const [actionType, amount] = action.split(':');
        const xpAmount = parseInt(amount);

        if (!actionType || isNaN(xpAmount)) {
            showToast('Invalid format. Use: action_number:amount', 'error');
            return;
        }

        let newXP;
        let reason;

        switch (actionType) {
            case '1': // Set XP
                newXP = xpAmount;
                reason = `XP set to ${xpAmount} by admin`;
                break;
            case '2': // Add XP
                newXP = currentXP + xpAmount;
                reason = `${xpAmount} XP added by admin`;
                break;
            case '3': // Remove XP
                newXP = Math.max(0, currentXP - xpAmount);
                reason = `${xpAmount} XP removed by admin`;
                break;
            default:
                showToast('Invalid action. Use 1, 2, or 3', 'error');
                return;
        }

        if (newXP < 0) {
            showToast('XP cannot be negative', 'error');
            return;
        }

        try {
            await adminXPManager.updateUserXP(userId, newXP, reason);
            showToast(`User XP updated successfully! New XP: ${newXP}`, 'success');
            await this.loadUsers();
        } catch (error) {
            console.error('Error updating user XP:', error);
            showToast('Error updating user XP', 'error');
        }
    }

    async suspendUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        const action = user.suspended ? 'unsuspend' : 'suspend';
        const reason = prompt(`Enter reason to ${action} ${user.displayName || 'this user'}:`);
        
        if (!reason) return;

        try {
            await db.collection('users').doc(userId).update({
                suspended: !user.suspended,
                suspensionReason: reason,
                suspensionDate: firebase.firestore.FieldValue.serverTimestamp(),
                suspendedBy: adminAuthManager.getCurrentAdmin().uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Log the action
            await db.collection('admin_logs').add({
                action: action,
                targetUserId: userId,
                reason: reason,
                adminId: adminAuthManager.getCurrentAdmin().uid,
                adminName: adminAuthManager.getAdminData().displayName || 'Admin',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast(`User ${action}ed successfully!`, 'success');
            await this.loadUsers();
        } catch (error) {
            console.error(`Error ${action}ing user:`, error);
            showToast(`Error ${action}ing user`, 'error');
        }
    }

    async getUserTransactions(userId) {
        try {
            const transactionsSnapshot = await db.collection('transactions')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            const transactions = [];
            transactionsSnapshot.forEach(doc => {
                transactions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return transactions;
        } catch (error) {
            console.error('Error loading user transactions:', error);
            return [];
        }
    }

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

    // Bulk operations
    async bulkUpdateUsers(userIds, updateData) {
        if (!adminAuthManager.isAuthenticated()) {
            throw new Error('Admin authentication required');
        }

        const results = {
            successful: [],
            failed: []
        };

        for (const userId of userIds) {
            try {
                await db.collection('users').doc(userId).update({
                    ...updateData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: adminAuthManager.getCurrentAdmin().uid
                });
                
                results.successful.push(userId);
            } catch (error) {
                console.error(`Error updating user ${userId}:`, error);
                results.failed.push({ userId, error: error.message });
            }
        }

        return results;
    }

    // Export user data
    async exportUserData() {
        try {
            const data = {
                users: this.users,
                exportedAt: new Date().toISOString(),
                exportedBy: adminAuthManager.getAdminData().displayName || 'Admin'
            };

            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `users-data-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            showToast('User data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting user data:', error);
            showToast('Error exporting user data', 'error');
        }
    }

    // Refresh users data
    async refresh() {
        await this.loadUsers();
    }
}

// Initialize admin user manager
const adminUserManager = new AdminUserManager();

// Make it globally available
window.adminUserManager = adminUserManager;

