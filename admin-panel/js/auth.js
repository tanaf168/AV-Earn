// Admin Authentication Module

class AdminAuthManager {
    constructor() {
        this.currentAdmin = null;
        this.adminData = null;
        this.init();
    }

    init() {
        // Check authentication state
        auth.onAuthStateChanged(user => {
            if (user) {
                this.verifyAdminRole(user);
            } else {
                this.currentAdmin = null;
                this.adminData = null;
                this.showLoginModal();
                this.hideMainContent();
            }
        });

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Admin login form
        const adminLoginForm = document.getElementById('adminLoginForm');
        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminLogin();
            });
        }

        // Admin logout button
        const adminLogout = document.getElementById('adminLogout');
        if (adminLogout) {
            adminLogout.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleAdminLogout();
            });
        }
    }

    async verifyAdminRole(user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                if (userData.role === USER_ROLES.ADMIN) {
                    this.currentAdmin = user;
                    this.adminData = userData;
                    
                    // Update last login
                    await db.collection('users').doc(user.uid).update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    this.hideLoginModal();
                    this.showMainContent();
                    this.updateAdminInterface();
                    
                    // Load dashboard data
                    if (window.adminDashboard) {
                        window.adminDashboard.loadDashboardData();
                    }
                } else {
                    // User is not admin, sign them out
                    showToast('Access denied. Admin privileges required.', 'error');
                    await auth.signOut();
                }
            } else {
                // User document doesn't exist
                showToast('User account not found.', 'error');
                await auth.signOut();
            }
        } catch (error) {
            console.error('Error verifying admin role:', error);
            showToast('Error verifying admin access', 'error');
            await auth.signOut();
        }
    }

    async handleAdminLogin() {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;

        if (!email || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            showLoading('adminLoginForm');
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            // Role verification will be handled by onAuthStateChanged
            
        } catch (error) {
            console.error('Admin login error:', error);
            showToast(this.getAuthErrorMessage(error.code), 'error');
        } finally {
            hideLoading('adminLoginForm');
        }
    }

    async handleAdminLogout() {
        try {
            await auth.signOut();
            showToast('Logged out successfully', 'info');
        } catch (error) {
            console.error('Admin logout error:', error);
            showToast('Error logging out', 'error');
        }
    }

    updateAdminInterface() {
        if (!this.adminData) return;

        // Update admin name
        const adminNameElement = document.getElementById('adminName');
        if (adminNameElement) {
            adminNameElement.textContent = this.adminData.displayName || 'Admin';
        }
    }

    showLoginModal() {
        const loginModal = document.getElementById('adminLoginModal');
        if (loginModal) {
            loginModal.classList.add('active');
        }
    }

    hideLoginModal() {
        const loginModal = document.getElementById('adminLoginModal');
        if (loginModal) {
            loginModal.classList.remove('active');
        }
    }

    showMainContent() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar) {
            sidebar.style.display = 'block';
        }
        if (mainContent) {
            mainContent.style.display = 'block';
        }
    }

    hideMainContent() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar) {
            sidebar.style.display = 'none';
        }
        if (mainContent) {
            mainContent.style.display = 'none';
        }
    }

    getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'No admin account found with this email address.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-disabled': 'This admin account has been disabled.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.'
        };

        return errorMessages[errorCode] || 'An error occurred. Please try again.';
    }

    // Public methods for other modules
    getCurrentAdmin() {
        return this.currentAdmin;
    }

    getAdminData() {
        return this.adminData;
    }

    isAuthenticated() {
        return !!this.currentAdmin && this.adminData?.role === USER_ROLES.ADMIN;
    }

    async refreshAdminData() {
        if (!this.currentAdmin) return;

        try {
            const adminDoc = await db.collection('users').doc(this.currentAdmin.uid).get();
            
            if (adminDoc.exists) {
                this.adminData = adminDoc.data();
                this.updateAdminInterface();
            }
        } catch (error) {
            console.error('Error refreshing admin data:', error);
        }
    }

    // Admin-specific utility methods
    async createAdminUser(email, password, displayName) {
        if (!this.isAuthenticated()) {
            throw new Error('Admin authentication required');
        }

        try {
            // Create user account
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update profile
            await user.updateProfile({
                displayName: displayName
            });

            // Set admin role in Firestore
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: email,
                displayName: displayName,
                role: USER_ROLES.ADMIN,
                balance: 0,
                userXP: 0,
                matchesPlayed: 0,
                tournamentsWon: 0,
                totalEarnings: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: this.currentAdmin.uid
            });

            return user;
        } catch (error) {
            console.error('Error creating admin user:', error);
            throw error;
        }
    }

    async updateUserRole(userId, newRole) {
        if (!this.isAuthenticated()) {
            throw new Error('Admin authentication required');
        }

        try {
            await db.collection('users').doc(userId).update({
                role: newRole,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: this.currentAdmin.uid
            });

            return true;
        } catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    }

    async updateUserBalance(userId, newBalance, reason = 'Admin adjustment') {
        if (!this.isAuthenticated()) {
            throw new Error('Admin authentication required');
        }

        try {
            const userRef = db.collection('users').doc(userId);
            
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                
                if (!userDoc.exists) {
                    throw new Error('User not found');
                }

                const userData = userDoc.data();
                const oldBalance = userData.balance || 0;
                const difference = newBalance - oldBalance;

                transaction.update(userRef, {
                    balance: newBalance,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: this.currentAdmin.uid
                });

                // Add transaction record
                const transactionRef = db.collection('transactions').doc();
                transaction.set(transactionRef, {
                    userId: userId,
                    amount: difference,
                    type: 'admin_adjustment',
                    description: reason,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'completed',
                    adminId: this.currentAdmin.uid,
                    adminName: this.adminData.displayName || 'Admin'
                });
            });

            return true;
        } catch (error) {
            console.error('Error updating user balance:', error);
            throw error;
        }
    }

    async updateUserXP(userId, newXP, reason = 'Admin adjustment') {
        if (!this.isAuthenticated()) {
            throw new Error('Admin authentication required');
        }

        try {
            await db.collection('users').doc(userId).update({
                userXP: newXP,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: this.currentAdmin.uid
            });

            // Log XP change
            await db.collection('xp_logs').add({
                userId: userId,
                oldXP: 0, // We don't track old XP in this simple implementation
                newXP: newXP,
                reason: reason,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                adminId: this.currentAdmin.uid,
                adminName: this.adminData.displayName || 'Admin'
            });

            return true;
        } catch (error) {
            console.error('Error updating user XP:', error);
            throw error;
        }
    }

    // System statistics methods
    async getSystemStats() {
        if (!this.isAuthenticated()) {
            throw new Error('Admin authentication required');
        }

        try {
            const stats = {};

            // Get total users
            const usersSnapshot = await db.collection('users').get();
            stats.totalUsers = usersSnapshot.size;

            // Get active tournaments
            const activeTournamentsSnapshot = await db.collection('tournaments')
                .where('status', 'in', ['upcoming', 'live'])
                .get();
            stats.activeTournaments = activeTournamentsSnapshot.size;

            // Get pending withdrawals
            const pendingWithdrawalsSnapshot = await db.collection('withdrawals')
                .where('status', '==', 'pending')
                .get();
            stats.pendingWithdrawals = pendingWithdrawalsSnapshot.size;

            // Calculate total revenue (sum of all tournament entry fees)
            const transactionsSnapshot = await db.collection('transactions')
                .where('type', '==', 'tournament_entry')
                .get();
            
            let totalRevenue = 0;
            transactionsSnapshot.forEach(doc => {
                const transaction = doc.data();
                totalRevenue += Math.abs(transaction.amount || 0);
            });
            stats.totalRevenue = totalRevenue;

            return stats;
        } catch (error) {
            console.error('Error getting system stats:', error);
            throw error;
        }
    }
}

// Initialize admin auth manager
const adminAuthManager = new AdminAuthManager();

// Make it globally available
window.adminAuthManager = adminAuthManager;

