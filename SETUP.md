# 🚀 Setup Guide - Free Fire Tournament App

This guide will walk you through setting up the Free Fire Tournament App from scratch.

## 📋 Prerequisites

- A Google account for Firebase
- Basic knowledge of HTML/CSS/JavaScript
- A web hosting service (optional for local testing)

## 🔥 Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `free-fire-tournament`
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click "Save"

### Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (we'll add security rules later)
4. Select your preferred location
5. Click "Done"

### Step 4: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon (`</>`)
4. Register app name: `Free Fire Tournament`
5. Copy the `firebaseConfig` object

### Step 5: Update Configuration

Open `firebase-config.js` and replace the placeholder config:

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

## 🔒 Security Rules Setup

### Firestore Security Rules

1. Go to **Firestore Database** → **Rules**
2. Replace the default rules with:

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

3. Click "Publish"

## 👤 Create First Admin User

### Method 1: Firebase Console (Recommended)

1. Go to **Authentication** → **Users**
2. Click "Add user"
3. Enter email: `admin@yourdomain.com`
4. Enter password: `your-secure-password`
5. Click "Add user"
6. Copy the User UID

### Method 2: User Panel Registration

1. Open the User Panel in browser
2. Click "Sign up"
3. Register with your admin email
4. Note the User UID from Firebase Console

### Set Admin Role

1. Go to **Firestore Database**
2. Click "Start collection"
3. Collection ID: `users`
4. Document ID: `[paste-user-uid-here]`
5. Add the following fields:

```json
{
  "uid": "paste-user-uid-here",
  "email": "admin@yourdomain.com",
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

6. Click "Save"

## 🌐 Local Testing

### Option 1: Live Server (VS Code)

1. Install "Live Server" extension in VS Code
2. Right-click on `user-panel/index.html`
3. Select "Open with Live Server"
4. Test User Panel at `http://localhost:5500/user-panel/`
5. Test Admin Panel at `http://localhost:5500/admin-panel/`

### Option 2: Python HTTP Server

```bash
# Navigate to project directory
cd /path/to/free-fire-tournament

# Start server
python -m http.server 8000

# Access panels:
# User Panel: http://localhost:8000/user-panel/
# Admin Panel: http://localhost:8000/admin-panel/
```

### Option 3: Node.js HTTP Server

```bash
# Install http-server globally
npm install -g http-server

# Navigate to project directory
cd /path/to/free-fire-tournament

# Start server
http-server

# Access panels:
# User Panel: http://localhost:8080/user-panel/
# Admin Panel: http://localhost:8080/admin-panel/
```

## 🚀 Deployment

### Option 1: Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize hosting:
```bash
firebase init hosting
```

4. Configure `firebase.json`:
```json
{
  "hosting": [
    {
      "target": "user-panel",
      "public": "user-panel",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "admin-panel",
      "public": "admin-panel",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
```

5. Deploy:
```bash
firebase deploy
```

### Option 2: Netlify

1. Create account at [Netlify](https://netlify.com)
2. Drag and drop `user-panel` folder for user site
3. Drag and drop `admin-panel` folder for admin site
4. Configure custom domains if needed

### Option 3: Vercel

1. Create account at [Vercel](https://vercel.com)
2. Import project from GitHub
3. Set build settings for each panel
4. Deploy both panels separately

### Option 4: Traditional Web Hosting

1. Upload `user-panel` folder to your main domain
2. Upload `admin-panel` folder to subdomain or subfolder
3. Ensure HTTPS is enabled
4. Test both panels

## ⚙️ Configuration

### XP System Settings

1. Login to Admin Panel
2. Go to **Settings**
3. Configure:
   - Tournament XP Reward (default: 10)
   - Bonus XP Multiplier (default: 1)
4. Click "Save XP Settings"

### Tournament Settings

1. In Admin Panel → **Settings**
2. Configure:
   - Minimum Entry Fee (default: $1)
   - Default Max Participants (default: 100)
3. Click "Save Tournament Settings"

### Withdrawal Settings

1. In Admin Panel → **Settings**
2. Configure:
   - Minimum Withdrawal (default: $10)
   - Withdrawal Fee % (default: 0%)
3. Click "Save Withdrawal Settings"

## 🧪 Testing

### Test User Panel

1. Open User Panel
2. Create a test user account
3. Test login/logout
4. Check dashboard displays
5. Test tournament joining (create a test tournament first)
6. Verify XP system works
7. Test withdrawal request

### Test Admin Panel

1. Open Admin Panel
2. Login with admin account
3. Check dashboard statistics
4. Create a test tournament
5. Manage test users
6. Process withdrawal requests
7. Test XP management

### Test Tournament Flow

1. **Admin:** Create a tournament
2. **User:** Join the tournament
3. **Verify:** User balance decreases, XP increases
4. **Admin:** Start tournament
5. **Admin:** End tournament and set winners
6. **Verify:** Winners receive prizes

## 🔧 Troubleshooting

### Common Issues

#### Firebase Connection Error
```
Error: Firebase configuration not found
```
**Solution:** Check `firebase-config.js` has correct credentials

#### Permission Denied
```
Error: Missing or insufficient permissions
```
**Solution:** 
1. Check Firestore security rules
2. Verify user has correct role
3. Ensure user is authenticated

#### XP Not Updating
```
Error: Cannot update user XP
```
**Solution:**
1. Check user document exists in Firestore
2. Verify security rules allow XP updates
3. Check browser console for errors

#### Admin Panel Access Denied
```
Error: Admin privileges required
```
**Solution:**
1. Verify user role is set to "admin" in Firestore
2. Check user document structure
3. Clear browser cache and login again

### Debug Mode

Enable debug mode by adding to browser console:
```javascript
// Enable Firebase debug mode
firebase.firestore.enableNetwork();
firebase.firestore().enablePersistence();

// Enable console logging
window.DEBUG_MODE = true;
```

## 📞 Support

If you encounter issues:

1. **Check Browser Console** - Look for JavaScript errors
2. **Check Firebase Console** - Look for authentication/database errors
3. **Verify Configuration** - Double-check all setup steps
4. **Test with Different Browser** - Rule out browser-specific issues
5. **Check Network** - Ensure stable internet connection

## 🎉 Success!

Once setup is complete, you should have:

- ✅ Working User Panel with authentication
- ✅ Working Admin Panel with management features
- ✅ Functional XP/Rank system
- ✅ Tournament creation and joining
- ✅ Withdrawal request system
- ✅ Real-time data synchronization

Your Free Fire Tournament App is now ready for use! 🔥🎮

