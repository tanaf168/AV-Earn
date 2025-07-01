// Authentication Module for User Panel

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.init();
    }

    init() {
        // Check authentication state
        auth.onAuthStateChanged(user => {
            if (user) {
                this.currentUser = user;
                this.loadUserData();
                this.hideAuthModals();
                this.showMainContent();
            } else {
                this.currentUser = null;
                this.userData = null;
                this.showAuthModal();
                this.hideMainContent();
            }
        });

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Signup form
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }

        // Modal toggles
        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');
        
        if (showSignup) {
            showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSignupModal();
            });
        }

        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginModal();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            showLoading('loginForm');
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Check if user is admin (redirect to admin panel)
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().role === USER_ROLES.ADMIN) {
                showToast('Admin users should use the admin panel', 'warning');
                await auth.signOut();
                return;
            }

            showToast('Login successful!', 'success');
            
        } catch (error) {
            console.error('Login error:', error);
            showToast(this.getAuthErrorMessage(error.code), 'error');
        } finally {
            hideLoading('loginForm');
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        if (!name || !email || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            showLoading('signupForm');
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update profile
            await user.updateProfile({
                displayName: name
            });

            // Initialize user data in Firestore
            await initializeUserData(user);

            showToast('Account created successfully!', 'success');
            
        } catch (error) {
            console.error('Signup error:', error);
            showToast(this.getAuthErrorMessage(error.code), 'error');
        } finally {
            hideLoading('signupForm');
        }
    }

    async handleLogout() {
        try {
            await auth.signOut();
            showToast('Logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Error logging out', 'error');
        }
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
            
            if (userDoc.exists) {
                this.userData = userDoc.data();
                
                // Update last login
                await db.collection('users').doc(this.currentUser.uid).update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Update UI with user data
                this.updateUserInterface();
                
                // Load dashboard data
                if (window.dashboardManager) {
                    window.dashboardManager.loadDashboardData();
                }
                
            } else {
                // Initialize user data if it doesn't exist
                await initializeUserData(this.currentUser);
                this.loadUserData(); // Reload after initialization
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Error loading user data', 'error');
        }
    }

    updateUserInterface() {
        if (!this.userData) return;

        // Update user name in various places
        const userNameElements = document.querySelectorAll('#userName, #profileName');
        userNameElements.forEach(element => {
            if (element) {
                element.textContent = this.userData.displayName || 'Player';
            }
        });

        // Update email
        const profileEmail = document.getElementById('profileEmail');
        if (profileEmail) {
            profileEmail.textContent = this.currentUser.email;
        }

        // Update balance
        const balanceElements = document.querySelectorAll('#userBalance, #profileBalance, #withdrawBalance');
        balanceElements.forEach(element => {
            if (element) {
                element.textContent = formatCurrency(this.userData.balance || 0);
            }
        });

        // Update XP
        const xpElements = document.querySelectorAll('#userXP, #profileXP');
        xpElements.forEach(element => {
            if (element) {
                element.textContent = `${this.userData.userXP || 0} XP`;
            }
        });

        // Update matches played
        const matchesElements = document.querySelectorAll('#matchesPlayed, #profileMatches');
        matchesElements.forEach(element => {
            if (element) {
                element.textContent = this.userData.matchesPlayed || 0;
            }
        });

        // Update total earnings
        const earningsElements = document.querySelectorAll('#totalEarnings, #profileEarnings');
        earningsElements.forEach(element => {
            if (element) {
                element.textContent = formatCurrency(this.userData.totalEarnings || 0);
            }
        });

        // Update tournaments won
        const winsElement = document.getElementById('profileWins');
        if (winsElement) {
            winsElement.textContent = this.userData.tournamentsWon || 0;
        }

        // Update member since
        const joinedElement = document.getElementById('profileJoined');
        if (joinedElement && this.userData.createdAt) {
            joinedElement.textContent = formatDate(this.userData.createdAt);
        }

        // Update rank display
        if (window.xpManager) {
            window.xpManager.updateRankDisplay(this.userData.userXP || 0);
        }
    }

    showAuthModal() {
        this.showLoginModal();
    }

    showLoginModal() {
        const loginModal = document.getElementById('loginModal');
        const signupModal = document.getElementById('signupModal');
        
        if (loginModal) {
            loginModal.classList.add('active');
        }
        if (signupModal) {
            signupModal.classList.remove('active');
        }
    }

    showSignupModal() {
        const loginModal = document.getElementById('loginModal');
        const signupModal = document.getElementById('signupModal');
        
        if (signupModal) {
            signupModal.classList.add('active');
        }
        if (loginModal) {
            loginModal.classList.remove('active');
        }
    }

    hideAuthModals() {
        const loginModal = document.getElementById('loginModal');
        const signupModal = document.getElementById('signupModal');
        
        if (loginModal) {
            loginModal.classList.remove('active');
        }
        if (signupModal) {
            signupModal.classList.remove('active');
        }
    }

    showMainContent() {
        const mainContent = document.querySelector('.main-content');
        const navbar = document.querySelector('.navbar');
        
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        if (navbar) {
            navbar.style.display = 'block';
        }
    }

    hideMainContent() {
        const mainContent = document.querySelector('.main-content');
        const navbar = document.querySelector('.navbar');
        
        if (mainContent) {
            mainContent.style.display = 'none';
        }
        if (navbar) {
            navbar.style.display = 'none';
        }
    }

    getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters long.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/requires-recent-login': 'Please log out and log back in to perform this action.'
        };

        return errorMessages[errorCode] || 'An error occurred. Please try again.';
    }

    // Public methods for other modules
    getCurrentUser() {
        return this.currentUser;
    }

    getUserData() {
        return this.userData;
    }

    async refreshUserData() {
        await this.loadUserData();
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    // Update user balance (for tournament winnings, etc.)
    async updateUserBalance(amount, type = 'tournament_win', description = '') {
        if (!this.currentUser) return false;

        try {
            const userRef = db.collection('users').doc(this.currentUser.uid);
            
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                
                if (!userDoc.exists) {
                    throw new Error('User document does not exist');
                }

                const userData = userDoc.data();
                const newBalance = (userData.balance || 0) + amount;
                const newTotalEarnings = (userData.totalEarnings || 0) + (amount > 0 ? amount : 0);

                transaction.update(userRef, {
                    balance: newBalance,
                    totalEarnings: newTotalEarnings
                });

                // Add transaction record
                const transactionRef = db.collection('transactions').doc();
                transaction.set(transactionRef, {
                    userId: this.currentUser.uid,
                    amount: amount,
                    type: type,
                    description: description,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'completed'
                });
            });

            // Refresh user data
            await this.refreshUserData();
            
            showToast(`Balance updated: ${formatCurrency(amount)}`, amount > 0 ? 'success' : 'info');
            
            return true;
        } catch (error) {
            console.error('Error updating balance:', error);
            showToast('Error updating balance', 'error');
            return false;
        }
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Make it globally available
window.authManager = authManager;

