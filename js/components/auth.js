// Authentication component
const Auth = {
    currentUser: null,
    isAdmin: false,

    init() {
        const connectBtn = document.getElementById('connectBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const usernameInput = document.getElementById('usernameInput');
        const passwordInput = document.getElementById('passwordInput');
        
        if (connectBtn) connectBtn.addEventListener('click', () => this.login());
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.login();
            });
        }
        
        // Check for saved session
        this.checkSavedSession();
    },

    async login() {
        const username = document.getElementById('usernameInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        const errorEl = document.getElementById('passwordError');
        
        if (!username || !password) {
            errorEl.textContent = "Please enter username and password.";
            errorEl.style.display = 'block';
            return;
        }
        
        const userData = await DB.authenticateUser(username, password);
        
        if (!userData) {
            errorEl.textContent = "Invalid username or password.";
            errorEl.style.display = 'block';
            return;
        }
        
        this.currentUser = {
            id: userData.id,
            username: userData.username,
            displayName: userData.display_name || userData.username,
            role: userData.role,
            avatarUrl: userData.avatar_url
        };
        
        this.isAdmin = userData.role === 'admin';
        
        await DB.updateUserLastLogin(userData.id);
        
        // Save session
        localStorage.setItem('writeToMe_session', JSON.stringify({
            userId: userData.id,
            userName: this.currentUser.displayName,
            isAdmin: this.isAdmin
        }));
        
        // Hide connection modal
        UI.hideModal('connectionModal');
        
        // Update UI
        UI.updateConnectionStatus(true, this.currentUser.displayName, this.isAdmin);
        
        // Show reception view by default
        UI.showView('receptionView');
        
        // Load initial data
        Reception.loadAvailableRooms();
        Reception.loadPendingVisits();
        MyRoom.loadUserRooms();
        
        // Join hall
        Hall.joinHall();
        
        Helpers.showNotification(`Welcome, ${this.currentUser.displayName}!`, 'success');
    },

    async logout() {
        // Leave hall
        if (this.currentUser) {
            await Hall.leaveHall();
        }
        
        this.currentUser = null;
        this.isAdmin = false;
        
        localStorage.removeItem('writeToMe_session');
        
        UI.updateConnectionStatus(false);
        
        // Hide all views
        document.querySelectorAll('.main-view').forEach(view => view.style.display = 'none');
        
        // Show connection modal
        UI.showModal('connectionModal');
        
        // Clear inputs
        document.getElementById('usernameInput').value = '';
        document.getElementById('passwordInput').value = '';
        
        Helpers.showNotification('You have been logged out.', 'info');
    },

    checkSavedSession() {
        const saved = localStorage.getItem('writeToMe_session');
        if (saved) {
            try {
                const session = JSON.parse(saved);
                // In a real app, you'd verify the session with the server
                this.currentUser = {
                    id: session.userId,
                    displayName: session.userName
                };
                this.isAdmin = session.isAdmin || false;
                
                UI.updateConnectionStatus(true, session.userName, this.isAdmin);
                UI.showView('receptionView');
                
                // Load data
                Reception.loadAvailableRooms();
                Reception.loadPendingVisits();
                MyRoom.loadUserRooms();
                Hall.joinHall();
            } catch (e) {
                console.error("Error parsing saved session:", e);
                localStorage.removeItem('writeToMe_session');
            }
        } else {
            UI.showModal('connectionModal');
        }
    },

    getCurrentUser() {
        return this.currentUser;
    },

    isUserAdmin() {
        return this.isAdmin;
    }
};

window.Auth = Auth;