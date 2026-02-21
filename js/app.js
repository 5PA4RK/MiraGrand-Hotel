// Main application entry point
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Initializing WriteToMira App...");
    
    // Initialize all components
    Auth.init();
    MiraMessages.init();
    Hall.init();
    Reception.init();
    MyRoom.init();
    MyProfile.init();
    
    // Setup navigation
    setupNavigation();
    
    // Setup admin tabs if user is admin
    setupAdminTabs();
    
    // Setup global event listeners
    setupGlobalListeners();
    
    // Setup sound control
    setupSoundControl();
});

function setupNavigation() {
    const profileBtn = document.getElementById('myProfileBtn');
    const receptionBtn = document.getElementById('receptionBtn');
    const hallBtn = document.getElementById('hallBtn');
    const myRoomBtn = document.getElementById('myRoomBtn');
    
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            UI.showView('myProfileView');
            MyProfile.loadProfile();
        });
    }
    
    if (receptionBtn) {
        receptionBtn.addEventListener('click', () => {
            UI.showView('receptionView');
            Reception.loadAvailableRooms();
            Reception.loadPendingVisits();
        });
    }
    
    if (hallBtn) {
        hallBtn.addEventListener('click', () => {
            UI.showView('hallView');
            Hall.loadParticipants();
        });
    }
    
    if (myRoomBtn) {
        myRoomBtn.addEventListener('click', () => {
            UI.showView('myRoomView');
            MyRoom.loadUserRooms();
        });
    }
}

function setupAdminTabs() {
    const roomsTab = document.getElementById('adminRoomsTab');
    const usersTab = document.getElementById('adminUsersTab');
    const miraTab = document.getElementById('adminMiraTab');
    
    if (roomsTab) {
        roomsTab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            roomsTab.classList.add('active');
            document.getElementById('adminRoomsContent').classList.add('active');
            
            loadAdminRooms();
        });
    }
    
    if (usersTab) {
        usersTab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            usersTab.classList.add('active');
            document.getElementById('adminUsersContent').classList.add('active');
            
            loadAdminUsers();
        });
    }
    
    if (miraTab) {
        miraTab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            miraTab.classList.add('active');
            document.getElementById('adminMiraContent').classList.add('active');
            
            MiraMessages.loadMessagesForAdmin('adminMiraMessagesList');
        });
    }
}

async function loadAdminRooms() {
    const container = document.getElementById('adminRoomsList');
    if (!container) return;
    
    const rooms = await DB.getAllRooms();
    
    if (rooms.length === 0) {
        container.innerHTML = '<div class="empty-state">No rooms found</div>';
        return;
    }
    
    container.innerHTML = '';
    
    rooms.forEach(room => {
        const div = document.createElement('div');
        div.className = 'admin-room-item';
        div.innerHTML = `
            <div><strong>${room.room_name || room.session_id}</strong></div>
            <div>Host: ${room.host_name}</div>
            <div>Created: ${Helpers.formatDate(room.created_at)}</div>
            <div>Status: ${room.is_active ? 'Active' : 'Inactive'}</div>
        `;
        container.appendChild(div);
    });
}

async function loadAdminUsers() {
    const container = document.getElementById('adminUsersList');
    if (!container) return;
    
    const users = await DB.getAllUsers();
    
    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state">No users found</div>';
        return;
    }
    
    container.innerHTML = '';
    
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'admin-user-item';
        div.innerHTML = `
            <div><strong>${user.display_name || user.username}</strong> (${user.username})</div>
            <div>Role: ${user.role}</div>
            <div>Status: ${user.is_active ? 'Active' : 'Inactive'}</div>
            <div>Last Login: ${user.last_login ? Helpers.formatDate(user.last_login) : 'Never'}</div>
        `;
        container.appendChild(div);
    });
}

function setupGlobalListeners() {
    // Close modals when clicking outside or on close buttons
    document.querySelectorAll('.modal-overlay .close-modal, .modal-overlay .btn-secondary.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // Image modal close
    const imageModal = document.getElementById('imageModal');
    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                imageModal.style.display = 'none';
            }
        });
    }
    
    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

function setupSoundControl() {
    const soundControl = document.getElementById('soundControl');
    if (!soundControl) return;
    
    let soundEnabled = true;
    
    soundControl.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        
        if (soundEnabled) {
            soundControl.innerHTML = '<i class="fas fa-volume-up"></i> <span>Sound On</span>';
            soundControl.classList.remove('muted');
        } else {
            soundControl.innerHTML = '<i class="fas fa-volume-mute"></i> <span>Sound Off</span>';
            soundControl.classList.add('muted');
        }
        
        // Store preference
        localStorage.setItem('writeToMe_sound', soundEnabled ? 'on' : 'off');
    });
    
    // Load preference
    const savedSound = localStorage.getItem('writeToMe_sound');
    if (savedSound === 'off') {
        soundEnabled = false;
        soundControl.innerHTML = '<i class="fas fa-volume-mute"></i> <span>Sound Off</span>';
        soundControl.classList.add('muted');
    }
}