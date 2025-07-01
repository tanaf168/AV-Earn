# 🔥 Free Fire Tournament App

A comprehensive tournament management system with separate User and Admin panels, featuring a complete XP/Rank system and professional UI design.

## ✨ Features

### 🎯 User Panel (`user-panel/`)
- **Authentication System** - Firebase login/signup with role-based access
- **Dashboard** - Balance, XP, matches played, earnings overview
- **Tournament System** - Browse, join tournaments with real-time updates
- **XP & Rank System** - 9 tiers from Bronze to Grandmaster with visual effects
- **Withdrawal System** - Request withdrawals with multiple payment methods
- **Transaction History** - Complete financial transaction tracking
- **Profile Management** - User stats and rank progression display
- **Fully Responsive** - Mobile-optimized design

### 🛡️ Admin Panel (`admin-panel/`)
- **Admin Authentication** - Secure admin-only access
- **Dashboard Overview** - System stats, recent activity, pending actions
- **Tournament Management** - Create, edit, manage tournaments
- **User Management** - View users, manage balances, control XP
- **Withdrawal Processing** - Approve/reject withdrawal requests
- **Transaction Monitoring** - View all system transactions
- **Games Management** - Manage available games
- **Promotions** - Create and manage promotional campaigns
- **System Settings** - Configure XP rewards, tournament settings

### ⭐ XP & Rank System
- **9 Rank Tiers:** Bronze → Silver → Gold → Platinum → Diamond → Heroic → Elite Heroic → Master → Grandmaster
- **Visual Effects:** Animated progress bars, rank-up animations, special Grandmaster effects
- **XP Rewards:** 10 XP per tournament participation (configurable by admin)
- **Admin Control:** Full XP management, bulk operations, leaderboards

## 🏗️ Architecture

### Completely Separate Codebases
- **User Panel:** `user-panel/` - Independent user-facing application
- **Admin Panel:** `admin-panel/` - Separate admin management system
- **Shared Config:** `firebase-config.js` - Common Firebase configuration only

### Technology Stack
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Firebase (Authentication, Firestore, Realtime Database)
- **Styling:** Custom CSS with responsive design
- **Icons:** Font Awesome 6
- **Fonts:** Google Fonts (Poppins for User, Inter for Admin)

## 🚀 Quick Start

### 1. Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create Firestore Database
4. Update `firebase-config.js` with your project credentials:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 2. Firestore Security Rules
Set up the following security rules in Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Tournaments - users can read, admins can write
    match /tournaments/{tournamentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Transactions - users can read their own, admins can read all
    match /transactions/{transactionId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Withdrawals - users can read/write their own, admins can read/write all
    match /withdrawals/{withdrawalId} {
      allow read, write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Admin-only collections
    match /settings/{document} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /admin_logs/{document} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /xp_logs/{document} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 3. Create First Admin User
1. Go to Firebase Console → Authentication
2. Add a new user with email/password
3. Go to Firestore Database
4. Create a document in the `users` collection with the user's UID:

```json
{
  "uid": "user-uid-here",
  "email": "admin@example.com",
  "displayName": "Admin",
  "role": "admin",
  "balance": 0,
  "userXP": 0,
  "matchesPlayed": 0,
  "tournamentsWon": 0,
  "totalEarnings": 0,
  "createdAt": "2024-01-01T00:00:00Z",
  "lastLogin": "2024-01-01T00:00:00Z"
}
```

### 4. Deploy
1. **User Panel:** Deploy `user-panel/` folder to your main domain
2. **Admin Panel:** Deploy `admin-panel/` folder to admin subdomain or path
3. Both panels share the same Firebase project

## 📱 User Experience Flow

### Tournament Participation
1. User signs up/logs in
2. Views available tournaments on dashboard
3. Joins tournament (balance deducted, 10 XP awarded)
4. Participates in tournament
5. Receives winnings (if applicable)
6. Can request withdrawal of earnings

### Admin Management
1. Admin logs in with elevated privileges
2. Views system overview on dashboard
3. Creates and manages tournaments
4. Monitors user activity and transactions
5. Processes withdrawal requests
6. Manages XP system and user accounts

## 🎨 Design Features

### User Panel Design
- **Modern Gradient Background** - Purple to blue gradient
- **Glass Morphism Effects** - Translucent navigation with backdrop blur
- **Animated Rank System** - Color-coded ranks with special Grandmaster effects
- **Professional Cards** - Clean card-based layout with hover effects
- **Mobile-First** - Responsive design for all screen sizes

### Admin Panel Design
- **Professional Dashboard** - Clean, business-focused interface
- **Sidebar Navigation** - Collapsible sidebar with organized sections
- **Data Tables** - Sortable, filterable tables for data management
- **Status Indicators** - Color-coded badges for various states
- **Modern Typography** - Clean, readable Inter font family

## 🔒 Security Features

- **Role-based Access Control** - Separate user and admin roles
- **Firebase Security Rules** - Server-side data protection
- **Input Validation** - Client and server-side validation
- **Transaction Integrity** - Atomic operations for financial transactions
- **Admin Audit Trail** - Logging of all admin actions

## 📊 Database Structure

### Collections

#### `users`
```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "role": "user|admin",
  "balance": "number",
  "userXP": "number",
  "matchesPlayed": "number",
  "tournamentsWon": "number",
  "totalEarnings": "number",
  "createdAt": "timestamp",
  "lastLogin": "timestamp",
  "suspended": "boolean"
}
```

#### `tournaments`
```json
{
  "name": "string",
  "description": "string",
  "gameMode": "string",
  "status": "upcoming|live|completed",
  "maxParticipants": "number",
  "participants": "array",
  "entryFee": "number",
  "prizePool": "number",
  "startTime": "timestamp",
  "createdAt": "timestamp",
  "createdBy": "string"
}
```

#### `transactions`
```json
{
  "userId": "string",
  "amount": "number",
  "type": "tournament_entry|tournament_win|withdrawal|bonus|refund",
  "description": "string",
  "timestamp": "timestamp",
  "status": "completed|pending|failed"
}
```

#### `withdrawals`
```json
{
  "userId": "string",
  "amount": "number",
  "paymentMethod": "string",
  "paymentDetails": "string",
  "status": "pending|approved|rejected",
  "requestDate": "timestamp",
  "processedDate": "timestamp",
  "adminNotes": "string"
}
```

## 🛠️ Customization

### XP System
- Modify `RANK_SYSTEM` in `firebase-config.js` to change rank thresholds
- Adjust `TOURNAMENT_XP_REWARD` for different XP amounts
- Customize rank colors and effects in `user-panel/css/ranks.css`

### UI Themes
- **User Panel:** Modify colors in `user-panel/css/style.css`
- **Admin Panel:** Adjust theme in `admin-panel/css/admin-style.css`
- Both panels support easy color scheme changes

### Tournament Settings
- Configure default settings in Admin Panel → Settings
- Modify tournament creation form in `admin-panel/js/tournament-management.js`

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Check `firebase-config.js` credentials
   - Verify Firebase project settings
   - Ensure Firestore is enabled

2. **Authentication Issues**
   - Check Firebase Authentication settings
   - Verify email/password is enabled
   - Check security rules

3. **Permission Denied**
   - Verify Firestore security rules
   - Check user role assignments
   - Ensure admin users have correct role

4. **XP Not Updating**
   - Check Firebase security rules for transactions
   - Verify XP system configuration
   - Check browser console for errors

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Firebase Console for errors
3. Check browser developer console
4. Verify all configuration steps

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ for Free Fire tournament organizers and players worldwide! 🎮

