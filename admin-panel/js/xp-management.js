// XP Management Module for Admin Panel

class AdminXPManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // XP settings save button
        const saveXPSettings = document.getElementById('saveXPSettings');
        if (saveXPSettings) {
            saveXPSettings.addEventListener('click', () => {
                this.saveXPSettings();
            });
        }
    }

    async saveXPSettings() {
        if (!adminAuthManager.isAuthenticated()) {
            showToast('Admin authentication required', 'error');
            return;
        }

        const tournamentXP = parseInt(document.getElementById('tournamentXP').value);
        const bonusXPMultiplier = parseFloat(document.getElementById('bonusXPMultiplier').value);

        if (!tournamentXP || tournamentXP < 1 || tournamentXP > 100) {
            showToast('Tournament XP must be between 1 and 100', 'error');
            return;
        }

        if (!bonusXPMultiplier || bonusXPMultiplier < 1 || bonusXPMultiplier > 5) {
            showToast('Bonus XP multiplier must be between 1 and 5', 'error');
            return;
        }

        try {
            // Save settings to Firestore
            await db.collection('settings').doc('xp_system').set({
                tournamentXP: tournamentXP,
                bonusXPMultiplier: bonusXPMultiplier,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: adminAuthManager.getCurrentAdmin().uid
            });

            showToast('XP settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving XP settings:', error);
            showToast('Error saving XP settings', 'error');
        }
    }

    async loadXPSettings() {
        try {
            const settingsDoc = await db.collection('settings').doc('xp_system').get();
            
            if (settingsDoc.exists) {
                const settings = settingsDoc.data();
                
                const tournamentXPInput = document.getElementById('tournamentXP');
                const bonusXPMultiplierInput = document.getElementById('bonusXPMultiplier');
                
                if (tournamentXPInput) {
                    tournamentXPInput.value = settings.tournamentXP || 10;
                }
                
                if (bonusXPMultiplierInput) {
                    bonusXPMultiplierInput.value = settings.bonusXPMultiplier || 1;
                }
            }
        } catch (error) {
            console.error('Error loading XP settings:', error);
        }
    }

    // User XP management methods
    async getUserXPData(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();
            const userXP = userData.userXP || 0;
            const currentRank = getCurrentUserRank(userXP);
            const progress = calculateXPProgress(userXP);

            return {
                userXP,
                currentRank,
                progress,
                matchesPlayed: userData.matchesPlayed || 0,
                tournamentsWon: userData.tournamentsWon || 0
            };
        } catch (error) {
            console.error('Error getting user XP data:', error);
            throw error;
        }
    }

    async updateUserXP(userId, newXP, reason = 'Admin adjustment') {
        if (!adminAuthManager.isAuthenticated()) {
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
                const oldXP = userData.userXP || 0;
                const oldRank = getCurrentUserRank(oldXP);
                const newRank = getCurrentUserRank(newXP);

                transaction.update(userRef, {
                    userXP: newXP,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: adminAuthManager.getCurrentAdmin().uid
                });

                // Log XP change
                const xpLogRef = db.collection('xp_logs').doc();
                transaction.set(xpLogRef, {
                    userId: userId,
                    oldXP: oldXP,
                    newXP: newXP,
                    difference: newXP - oldXP,
                    oldRank: oldRank.name,
                    newRank: newRank.name,
                    reason: reason,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    adminId: adminAuthManager.getCurrentAdmin().uid,
                    adminName: adminAuthManager.getAdminData().displayName || 'Admin'
                });
            });

            return true;
        } catch (error) {
            console.error('Error updating user XP:', error);
            throw error;
        }
    }

    async awardBonusXP(userId, bonusXP, reason = 'Bonus XP award') {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();
            const currentXP = userData.userXP || 0;
            const newXP = currentXP + bonusXP;

            await this.updateUserXP(userId, newXP, reason);
            
            return {
                oldXP: currentXP,
                newXP: newXP,
                bonusAwarded: bonusXP
            };
        } catch (error) {
            console.error('Error awarding bonus XP:', error);
            throw error;
        }
    }

    async getXPLeaderboard(limit = 50) {
        try {
            const usersSnapshot = await db.collection('users')
                .where('role', '==', USER_ROLES.USER)
                .orderBy('userXP', 'desc')
                .limit(limit)
                .get();

            const leaderboard = [];
            let rank = 1;

            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                const userXP = userData.userXP || 0;
                const currentRank = getCurrentUserRank(userXP);

                leaderboard.push({
                    userId: doc.id,
                    displayName: userData.displayName || 'Player',
                    email: userData.email,
                    userXP: userXP,
                    rank: currentRank,
                    position: rank++,
                    matchesPlayed: userData.matchesPlayed || 0,
                    tournamentsWon: userData.tournamentsWon || 0
                });
            });

            return leaderboard;
        } catch (error) {
            console.error('Error getting XP leaderboard:', error);
            throw error;
        }
    }

    async getXPStatistics() {
        try {
            const usersSnapshot = await db.collection('users')
                .where('role', '==', USER_ROLES.USER)
                .get();

            const stats = {
                totalUsers: 0,
                rankDistribution: {},
                averageXP: 0,
                totalXP: 0,
                highestXP: 0,
                lowestXP: Infinity
            };

            // Initialize rank distribution
            Object.values(RANK_SYSTEM).forEach(rank => {
                stats.rankDistribution[rank.name] = 0;
            });

            let totalXP = 0;

            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                const userXP = userData.userXP || 0;
                const userRank = getCurrentUserRank(userXP);

                stats.totalUsers++;
                stats.rankDistribution[userRank.name]++;
                totalXP += userXP;

                if (userXP > stats.highestXP) {
                    stats.highestXP = userXP;
                }

                if (userXP < stats.lowestXP) {
                    stats.lowestXP = userXP;
                }
            });

            stats.totalXP = totalXP;
            stats.averageXP = stats.totalUsers > 0 ? Math.round(totalXP / stats.totalUsers) : 0;
            
            if (stats.lowestXP === Infinity) {
                stats.lowestXP = 0;
            }

            return stats;
        } catch (error) {
            console.error('Error getting XP statistics:', error);
            throw error;
        }
    }

    async getXPLogs(userId = null, limit = 100) {
        try {
            let query = db.collection('xp_logs')
                .orderBy('timestamp', 'desc')
                .limit(limit);

            if (userId) {
                query = query.where('userId', '==', userId);
            }

            const logsSnapshot = await query.get();
            const logs = [];

            logsSnapshot.forEach(doc => {
                logs.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return logs;
        } catch (error) {
            console.error('Error getting XP logs:', error);
            throw error;
        }
    }

    // Bulk XP operations
    async bulkAwardXP(userIds, xpAmount, reason = 'Bulk XP award') {
        if (!adminAuthManager.isAuthenticated()) {
            throw new Error('Admin authentication required');
        }

        const results = {
            successful: [],
            failed: []
        };

        for (const userId of userIds) {
            try {
                await this.awardBonusXP(userId, xpAmount, reason);
                results.successful.push(userId);
            } catch (error) {
                console.error(`Error awarding XP to user ${userId}:`, error);
                results.failed.push({ userId, error: error.message });
            }
        }

        return results;
    }

    async resetUserXP(userId, reason = 'XP reset by admin') {
        return await this.updateUserXP(userId, 0, reason);
    }

    async bulkResetXP(userIds, reason = 'Bulk XP reset') {
        if (!adminAuthManager.isAuthenticated()) {
            throw new Error('Admin authentication required');
        }

        const results = {
            successful: [],
            failed: []
        };

        for (const userId of userIds) {
            try {
                await this.resetUserXP(userId, reason);
                results.successful.push(userId);
            } catch (error) {
                console.error(`Error resetting XP for user ${userId}:`, error);
                results.failed.push({ userId, error: error.message });
            }
        }

        return results;
    }

    // XP system utilities
    formatXP(xp) {
        if (xp >= 1000000) {
            return `${(xp / 1000000).toFixed(1)}M XP`;
        } else if (xp >= 1000) {
            return `${(xp / 1000).toFixed(1)}K XP`;
        } else {
            return `${xp} XP`;
        }
    }

    getRankBadgeHTML(rank) {
        const rankClass = this.getRankClass(rank.name);
        return `
            <span class="rank-badge ${rankClass}">
                ${rank.icon} ${rank.name}
            </span>
        `;
    }

    getRankClass(rankName) {
        const rankClasses = {
            'Bronze': 'bronze',
            'Silver': 'silver',
            'Gold': 'gold',
            'Platinum': 'platinum',
            'Diamond': 'diamond',
            'Heroic': 'heroic',
            'Elite Heroic': 'elite-heroic',
            'Master': 'master',
            'Grandmaster': 'grandmaster'
        };
        
        return rankClasses[rankName] || 'bronze';
    }

    renderXPProgressBar(userXP) {
        const progress = calculateXPProgress(userXP);
        const currentRank = getCurrentUserRank(userXP);
        const rankClass = this.getRankClass(currentRank.name);
        
        return `
            <div class="xp-progress-container">
                <div class="xp-progress-bar">
                    <div class="xp-progress-fill ${rankClass}" style="width: ${progress.progress}%"></div>
                </div>
                <div class="xp-progress-text">
                    ${progress.needed > 0 
                        ? `${progress.current} / ${progress.current + progress.needed} XP to next rank`
                        : 'Maximum rank achieved!'
                    }
                </div>
            </div>
        `;
    }
}

// Initialize admin XP manager
const adminXPManager = new AdminXPManager();

// Make it globally available
window.adminXPManager = adminXPManager;

