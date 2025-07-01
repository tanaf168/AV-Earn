// Firebase Configuration
// Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database();

// User roles
const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin'
};

// XP and Rank System Configuration
const RANK_SYSTEM = {
    BRONZE: { name: 'Bronze', minXP: 0, color: '#CD7F32', icon: '🥉' },
    SILVER: { name: 'Silver', minXP: 100, color: '#C0C0C0', icon: '🥈' },
    GOLD: { name: 'Gold', minXP: 250, color: '#FFD700', icon: '🥇' },
    PLATINUM: { name: 'Platinum', minXP: 450, color: '#E5E4E2', icon: '💎' },
    DIAMOND: { name: 'Diamond', minXP: 700, color: '#B9F2FF', icon: '💠' },
    HEROIC: { name: 'Heroic', minXP: 1000, color: '#FF6B6B', icon: '⚔️' },
    ELITE_HEROIC: { name: 'Elite Heroic', minXP: 1500, color: '#FF1744', icon: '🔥' },
    MASTER: { name: 'Master', minXP: 2500, color: '#9C27B0', icon: '👑' },
    GRANDMASTER: { name: 'Grandmaster', minXP: 4000, color: 'linear-gradient(45deg, #FFD700, #FF6B6B, #4CAF50)', icon: '👑✨' }
};

// Tournament XP reward
const TOURNAMENT_XP_REWARD = 10;

// Utility Functions
function getCurrentUserRank(userXP) {
    const ranks = Object.values(RANK_SYSTEM).reverse();
    for (let rank of ranks) {
        if (userXP >= rank.minXP) {
            return rank;
        }
    }
    return RANK_SYSTEM.BRONZE;
}

function getNextRank(userXP) {
    const ranks = Object.values(RANK_SYSTEM);
    for (let rank of ranks) {
        if (userXP < rank.minXP) {
            return rank;
        }
    }
    return null; // Already at max rank
}

function calculateXPProgress(userXP) {
    const currentRank = getCurrentUserRank(userXP);
    const nextRank = getNextRank(userXP);
    
    if (!nextRank) {
        return { progress: 100, current: userXP, needed: 0 };
    }
    
    const currentRankXP = currentRank.minXP;
    const nextRankXP = nextRank.minXP;
    const progressXP = userXP - currentRankXP;
    const totalNeeded = nextRankXP - currentRankXP;
    const progress = (progressXP / totalNeeded) * 100;
    
    return {
        progress: Math.min(progress, 100),
        current: progressXP,
        needed: totalNeeded - progressXP
    };
}

// Authentication helper functions
function checkUserRole(callback) {
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    callback(userData.role || USER_ROLES.USER, userData);
                } else {
                    callback(USER_ROLES.USER, null);
                }
            });
        } else {
            callback(null, null);
        }
    });
}

// Initialize user data on first login
function initializeUserData(user) {
    const userRef = db.collection('users').doc(user.uid);
    
    return userRef.get().then(doc => {
        if (!doc.exists) {
            return userRef.set({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Player',
                role: USER_ROLES.USER,
                balance: 0,
                userXP: 0,
                matchesPlayed: 0,
                tournamentsWon: 0,
                totalEarnings: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            return userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });
}

// Award XP for tournament participation
function awardTournamentXP(userId) {
    const userRef = db.collection('users').doc(userId);
    
    return db.runTransaction(transaction => {
        return transaction.get(userRef).then(doc => {
            if (!doc.exists) {
                throw new Error('User does not exist');
            }
            
            const userData = doc.data();
            const newXP = (userData.userXP || 0) + TOURNAMENT_XP_REWARD;
            const newMatchesPlayed = (userData.matchesPlayed || 0) + 1;
            
            transaction.update(userRef, {
                userXP: newXP,
                matchesPlayed: newMatchesPlayed
            });
            
            return { newXP, newMatchesPlayed };
        });
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show loading state
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading-spinner">Loading...</div>';
    }
}

// Hide loading state
function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

