// XP and Rank System Manager

class XPManager {
    constructor() {
        this.currentUserXP = 0;
        this.currentRank = null;
        this.init();
    }

    init() {
        // Initialize rank display elements
        this.setupRankDisplay();
    }

    setupRankDisplay() {
        // Setup rank display in dashboard
        this.updateRankDisplay(0);
    }

    updateRankDisplay(userXP) {
        this.currentUserXP = userXP;
        this.currentRank = getCurrentUserRank(userXP);
        
        // Update main dashboard rank display
        this.updateMainRankDisplay();
        
        // Update profile rank display
        this.updateProfileRankDisplay();
    }

    updateMainRankDisplay() {
        const rankIcon = document.getElementById('rankIcon');
        const rankName = document.getElementById('rankName');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const rankDisplay = document.getElementById('rankDisplay');

        if (!rankIcon || !rankName || !progressFill || !progressText) return;

        // Update rank icon and name
        rankIcon.textContent = this.currentRank.icon;
        rankName.textContent = this.currentRank.name;

        // Apply rank-specific styling
        const rankClass = this.getRankClass(this.currentRank.name);
        rankName.className = `rank-name ${rankClass}`;
        
        if (rankDisplay) {
            rankDisplay.className = `rank-display ${rankClass}`;
        }

        // Update progress bar
        const progress = calculateXPProgress(this.currentUserXP);
        progressFill.style.width = `${progress.progress}%`;
        
        // Apply rank-specific progress bar styling
        progressFill.className = `progress-fill ${rankClass}`;

        // Update progress text
        if (progress.needed > 0) {
            progressText.textContent = `${progress.current} / ${progress.current + progress.needed} XP to next rank`;
        } else {
            progressText.textContent = 'Maximum rank achieved!';
        }
    }

    updateProfileRankDisplay() {
        const profileRankDisplay = document.getElementById('profileRankDisplay');
        
        if (!profileRankDisplay) return;

        const progress = calculateXPProgress(this.currentUserXP);
        const rankClass = this.getRankClass(this.currentRank.name);
        
        profileRankDisplay.innerHTML = `
            <div class="profile-rank-icon ${rankClass}">
                ${this.currentRank.icon}
            </div>
            <div class="profile-rank-info">
                <h3 class="profile-rank-name ${rankClass}">${this.currentRank.name}</h3>
                <div class="profile-xp-progress">
                    <div class="profile-progress-bar">
                        <div class="profile-progress-fill ${rankClass}" style="width: ${progress.progress}%"></div>
                    </div>
                    <p class="profile-progress-text">
                        ${progress.needed > 0 
                            ? `${progress.current} / ${progress.current + progress.needed} XP to next rank`
                            : 'Maximum rank achieved!'
                        }
                    </p>
                </div>
            </div>
        `;
    }

    getRankClass(rankName) {
        const rankClasses = {
            'Bronze': 'rank-bronze',
            'Silver': 'rank-silver',
            'Gold': 'rank-gold',
            'Platinum': 'rank-platinum',
            'Diamond': 'rank-diamond',
            'Heroic': 'rank-heroic',
            'Elite Heroic': 'rank-elite-heroic',
            'Master': 'rank-master',
            'Grandmaster': 'rank-grandmaster'
        };
        
        return rankClasses[rankName] || 'rank-bronze';
    }

    async awardXP(amount, reason = 'Tournament participation') {
        if (!authManager.isAuthenticated()) {
            console.error('User not authenticated');
            return false;
        }

        const currentUser = authManager.getCurrentUser();
        const oldXP = this.currentUserXP;
        const oldRank = this.currentRank;

        try {
            // Award XP in Firebase
            const result = await awardTournamentXP(currentUser.uid);
            
            if (result) {
                const newXP = result.newXP;
                const newRank = getCurrentUserRank(newXP);
                
                // Show XP gain animation
                this.showXPGainAnimation(amount);
                
                // Update local state
                this.currentUserXP = newXP;
                this.currentRank = newRank;
                
                // Update displays
                this.updateRankDisplay(newXP);
                
                // Check for rank up
                if (oldRank.name !== newRank.name) {
                    setTimeout(() => {
                        this.showRankUpAnimation(oldRank, newRank);
                    }, 1000);
                }
                
                // Refresh user data in auth manager
                await authManager.refreshUserData();
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error awarding XP:', error);
            showToast('Error awarding XP', 'error');
            return false;
        }
    }

    showXPGainAnimation(amount) {
        const animation = document.createElement('div');
        animation.className = 'xp-gain-animation';
        animation.innerHTML = `
            <i class="fas fa-star"></i>
            +${amount} XP
        `;
        
        document.body.appendChild(animation);
        
        setTimeout(() => {
            if (document.body.contains(animation)) {
                document.body.removeChild(animation);
            }
        }, 2000);
    }

    showRankUpAnimation(oldRank, newRank) {
        const animation = document.createElement('div');
        animation.className = 'rank-up-animation';
        
        const rankClass = this.getRankClass(newRank.name);
        
        animation.innerHTML = `
            <div class="rank-up-content">
                <h1>RANK UP!</h1>
                <div class="old-rank">
                    <span class="${this.getRankClass(oldRank.name)}">
                        ${oldRank.icon} ${oldRank.name}
                    </span>
                </div>
                <div style="font-size: 2rem; margin: 20px 0;">↓</div>
                <div class="new-rank ${rankClass}">
                    ${newRank.icon} ${newRank.name}
                </div>
                <p style="margin-top: 20px; font-size: 1.2rem;">Congratulations!</p>
            </div>
        `;
        
        document.body.appendChild(animation);
        
        // Play sound effect (if available)
        this.playRankUpSound();
        
        setTimeout(() => {
            if (document.body.contains(animation)) {
                document.body.removeChild(animation);
            }
        }, 4000);
        
        // Show toast notification
        setTimeout(() => {
            showToast(`🎉 Rank Up! You are now ${newRank.name}!`, 'success');
        }, 4500);
    }

    playRankUpSound() {
        // Create audio element for rank up sound
        try {
            const audio = new Audio();
            audio.volume = 0.3;
            
            // You can add a sound file here
            // audio.src = 'assets/sounds/rank-up.mp3';
            // audio.play().catch(e => console.log('Could not play sound:', e));
            
        } catch (error) {
            console.log('Audio not supported or sound file not found');
        }
    }

    createRankBadge(userXP) {
        const rank = getCurrentUserRank(userXP);
        const rankClass = this.getRankClass(rank.name);
        const badgeClass = rankClass.replace('rank-', '');
        
        return `
            <span class="rank-badge ${badgeClass}">
                ${rank.icon} ${rank.name}
            </span>
        `;
    }

    // Get rank requirements for display
    getRankRequirements() {
        return Object.values(RANK_SYSTEM).map(rank => ({
            name: rank.name,
            minXP: rank.minXP,
            icon: rank.icon,
            color: rank.color
        }));
    }

    // Calculate XP needed for specific rank
    getXPNeededForRank(targetRankName) {
        const targetRank = Object.values(RANK_SYSTEM).find(rank => rank.name === targetRankName);
        if (!targetRank) return null;
        
        const needed = targetRank.minXP - this.currentUserXP;
        return Math.max(0, needed);
    }

    // Get progress percentage to specific rank
    getProgressToRank(targetRankName) {
        const targetRank = Object.values(RANK_SYSTEM).find(rank => rank.name === targetRankName);
        if (!targetRank) return 0;
        
        const currentRankXP = this.currentRank.minXP;
        const targetRankXP = targetRank.minXP;
        
        if (this.currentUserXP >= targetRankXP) return 100;
        if (targetRankXP <= currentRankXP) return 0;
        
        const progress = (this.currentUserXP - currentRankXP) / (targetRankXP - currentRankXP);
        return Math.max(0, Math.min(100, progress * 100));
    }

    // Format XP display
    formatXP(xp) {
        if (xp >= 1000000) {
            return `${(xp / 1000000).toFixed(1)}M XP`;
        } else if (xp >= 1000) {
            return `${(xp / 1000).toFixed(1)}K XP`;
        } else {
            return `${xp} XP`;
        }
    }

    // Get rank statistics
    getRankStats() {
        const allRanks = Object.values(RANK_SYSTEM);
        const currentRankIndex = allRanks.findIndex(rank => rank.name === this.currentRank.name);
        
        return {
            currentRank: this.currentRank,
            currentXP: this.currentUserXP,
            rankIndex: currentRankIndex,
            totalRanks: allRanks.length,
            progressPercentage: ((currentRankIndex + 1) / allRanks.length) * 100,
            nextRank: allRanks[currentRankIndex + 1] || null,
            isMaxRank: currentRankIndex === allRanks.length - 1
        };
    }

    // Admin function to set user XP (for testing)
    async setUserXP(userId, newXP) {
        try {
            await db.collection('users').doc(userId).update({
                userXP: newXP
            });
            
            if (userId === authManager.getCurrentUser()?.uid) {
                this.updateRankDisplay(newXP);
                await authManager.refreshUserData();
            }
            
            return true;
        } catch (error) {
            console.error('Error setting user XP:', error);
            return false;
        }
    }
}

// Initialize XP manager
const xpManager = new XPManager();

// Make it globally available
window.xpManager = xpManager;

