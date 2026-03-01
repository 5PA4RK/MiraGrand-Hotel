// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://plqvqenoroacvzwtgoxq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_91IHQ5--y4tDIo8L9X2ZJQ_YeThfdu_';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// GLOBAL APP STATE
// ============================================
const AppState = {
    // User info
    isAuthenticated: false,
    userId: null,
    userName: "Guest",
    userRole: "guest",
    userDisplayName: "Guest",
    userAvatar: null,
    
    // Connection
    isConnected: false,
    connectionTime: null,
    
    // Settings
    soundEnabled: true,
    
    // Mira admin flag (only user "mira" is admin)
    isMiraAdmin: false,
    
    // Current panel
    currentPanel: 'profile',
    
    // Hall
    hallParticipants: [],
    hallMessages: [],
    
    // Rooms
    myRooms: [],
    availableRooms: [],
    currentRoom: null,
    
    // Pending requests
    pendingRequests: [],
    
    // Messages to Mira (no login)
    miraMessages: [],
    
    // Subscriptions
    realtimeSubscriptions: {}
};

// ============================================
// DOM ELEMENTS (Cached)
// ============================================
const DOM = {
    // Modals
    connectionModal: document.getElementById('connectionModal'),
    
    // Header
    mainHeader: document.getElementById('mainHeader'),
    mainContent: document.getElementById('mainContent'),
    statusIndicator: document.getElementById('statusIndicator'),
    userRoleDisplay: document.getElementById('userRoleDisplay'),
    logoutBtn: document.getElementById('logoutBtn'),
    adminPanelBtn: document.getElementById('adminPanelBtn'),
    
    // Navigation
    navBtns: document.querySelectorAll('.nav-btn'),
    
    // Panels
    profilePanel: document.getElementById('profilePanel'),
    receptionPanel: document.getElementById('receptionPanel'),
    hallPanel: document.getElementById('hallPanel'),
    myRoomPanel: document.getElementById('myRoomPanel'),
    adminPanel: document.getElementById('adminPanel'),
    
    // Profile
    profileAvatar: document.getElementById('profileAvatar'),
    profileUsername: document.getElementById('profileUsername'),
    profileDisplayName: document.getElementById('profileDisplayName'),
    profileRole: document.getElementById('profileRole'),
    profileImageUpload: document.getElementById('profileImageUpload'),
    updateProfileBtn: document.getElementById('updateProfileBtn'),
    profileUpdateMessage: document.getElementById('profileUpdateMessage'),
    
    // Mira message (no login)
    miraMessageInput: document.getElementById('miraMessageInput'),
    sendMiraMessageBtn: document.getElementById('sendMiraMessageBtn'),
    miraMessageSuccess: document.getElementById('miraMessageSuccess'),
    
    // Connection
    usernameInput: document.getElementById('usernameInput'),
    passwordInput: document.getElementById('passwordInput'),
    connectBtn: document.getElementById('connectBtn'),
    passwordError: document.getElementById('passwordError'),
    
    // Image modal
    imageModal: document.getElementById('imageModal'),
    fullSizeImage: document.getElementById('fullSizeImage'),
    closeImageModal: document.querySelector('.close-image-modal'),
    
    // Audio
    messageSound: document.getElementById('messageSound')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get real IP address
async function getRealIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip || "Unknown";
    } catch (error) {
        console.error("Error getting IP:", error);
        return "Unknown";
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show notification
function showNotification(message, type = 'info', duration = 3000) {
    // You can implement toast notifications here
    console.log(`[${type}] ${message}`);
    
    // Simple alert for now
    if (type === 'error') {
        alert(`Error: ${message}`);
    }
}

// Save to localStorage
function saveToStorage(key, data) {
    try {
        localStorage.setItem(`mira_${key}`, JSON.stringify(data));
    } catch (e) {
        console.error("Storage error:", e);
    }
}

// Load from localStorage
function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(`mira_${key}`);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("Storage error:", e);
        return null;
    }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

// Save session
function saveSession() {
    const sessionData = {
        userId: AppState.userId,
        userName: AppState.userName,
        userRole: AppState.userRole,
        userDisplayName: AppState.userDisplayName,
        userAvatar: AppState.userAvatar,
        soundEnabled: AppState.soundEnabled,
        isMiraAdmin: AppState.isMiraAdmin
    };
    saveToStorage('session', sessionData);
}
// ============================================
// DATABASE SETUP HELPER
// ============================================

async function setupDatabase() {
    console.log("🔧 Checking database setup...");
    
    // Check if we can connect
    try {
        const { data, error } = await supabaseClient
            .from('user_management')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error("Database connection error:", error);
            return;
        }
        
        console.log("✅ Database connected");
        
        // Check if mira user exists
        const { data: miraUser } = await supabaseClient
            .from('user_management')
            .select('*')
            .eq('username', 'mira')
            .maybeSingle();
        
        if (!miraUser) {
            console.log("Creating mira user...");
            
            // Create mira user
            const { error: createError } = await supabaseClient
                .from('user_management')
                .insert([{
                    username: 'mira',
                    display_name: 'Mira',
                    password_hash: 'mira123',
                    role: 'admin',
                    is_active: true,
                    created_at: new Date().toISOString()
                }]);
            
            if (createError) {
                console.error("Error creating mira user:", createError);
            } else {
                console.log("✅ Mira user created successfully");
            }
        } else {
            console.log("✅ Mira user exists");
        }
        
    } catch (error) {
        console.error("Database setup error:", error);
    }
}

async function initApp() {
    console.log("🚀 Initializing MiraGrand-Hotel...");
    
    // Setup event listeners
    setupCoreEventListeners();
    
    // Check database setup (optional, can be removed in production)
    await setupDatabase();
    
    // Check for saved session
    const hasSession = await loadSession();
    
    if (hasSession) {
        hideConnectionModal();
        updateUIAfterLogin();
        setupRealtimeSubscriptions();
    } else {
        showConnectionModal();
    }
}

// Load session
async function loadSession() {
    const session = loadFromStorage('session');
    if (session) {
        AppState.userId = session.userId;
        AppState.userName = session.userName;
        AppState.userRole = session.userRole;
        AppState.userDisplayName = session.userDisplayName || session.userName;
        AppState.userAvatar = session.userAvatar;
        AppState.soundEnabled = session.soundEnabled !== false;
        AppState.isMiraAdmin = session.isMiraAdmin || false;
        
        // Verify session is still valid
        try {
            const { data: user, error } = await supabaseClient
                .from('user_management')
                .select('*')
                .eq('id', AppState.userId)
                .maybeSingle();
            
            if (user && user.is_active) {
                AppState.isAuthenticated = true;
                AppState.isConnected = true;
                console.log("Session loaded. Is Mira admin?", AppState.isMiraAdmin);
                return true;
            }
        } catch (error) {
            console.error("Error verifying session:", error);
        }
    }
    return false;
}

// Clear session
function clearSession() {
    localStorage.removeItem('mira_session');
    AppState.isAuthenticated = false;
    AppState.isConnected = false;
    AppState.userId = null;
    AppState.userName = "Guest";
    AppState.userRole = "guest";
    AppState.userDisplayName = "Guest";
    AppState.userAvatar = null;
    AppState.isMiraAdmin = false;
}

// ============================================
// UI FUNCTIONS
// ============================================

// Show connection modal
function showConnectionModal() {
    if (DOM.connectionModal) {
        DOM.connectionModal.style.display = 'flex';
        DOM.mainHeader.style.display = 'none';
        DOM.mainContent.style.display = 'none';
    }
}

// Hide connection modal
function hideConnectionModal() {
    if (DOM.connectionModal) {
        DOM.connectionModal.style.display = 'none';
        DOM.mainHeader.style.display = 'block';
        DOM.mainContent.style.display = 'block';
    }
}

// Update UI after login
function updateUIAfterLogin() {
    // Update status
    DOM.statusIndicator.className = 'status-indicator online';
    DOM.userRoleDisplay.textContent = `${AppState.userDisplayName} (${AppState.userRole})`;
    DOM.logoutBtn.style.display = 'flex';
    
    // Show/hide admin panel button (only Mira)
    console.log("Is Mira admin?", AppState.isMiraAdmin);
    if (AppState.isMiraAdmin) {
        DOM.adminPanelBtn.style.display = 'flex';
        console.log("Admin button should be visible");
    } else {
        DOM.adminPanelBtn.style.display = 'none';
    }
    
    // Update profile panel
    if (DOM.profileUsername) DOM.profileUsername.value = AppState.userName;
    if (DOM.profileDisplayName) DOM.profileDisplayName.value = AppState.userDisplayName;
    if (DOM.profileRole) DOM.profileRole.value = AppState.userRole;
    
    // Update avatar
    updateAvatarDisplay();
    
    // Load initial data
    loadUserData();
    
    // Switch to profile panel
    switchPanel('profile');
}

// Update avatar display
function updateAvatarDisplay() {
    if (AppState.userAvatar) {
        DOM.profileAvatar.innerHTML = `<img src="${AppState.userAvatar}" alt="Avatar">`;
    } else {
        DOM.profileAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
}

// Switch panel
function switchPanel(panelName) {
    // Hide all panels
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-panel'));
    
    // Update nav buttons
    DOM.navBtns.forEach(btn => btn.classList.remove('active'));
    
    // Show selected panel
    let panelElement = null;
    switch(panelName) {
        case 'profile':
            panelElement = DOM.profilePanel;
            document.querySelector('[data-panel="profile"]').classList.add('active');
            break;
        case 'reception':
            panelElement = DOM.receptionPanel;
            document.querySelector('[data-panel="reception"]').classList.add('active');
            loadAvailableRooms();
            loadPendingRequests();
            break;
        case 'hall':
            panelElement = DOM.hallPanel;
            document.querySelector('[data-panel="hall"]').classList.add('active');
            loadHallParticipants();
            loadHallMessages();
            break;
        case 'myroom':
            panelElement = DOM.myRoomPanel;
            document.querySelector('[data-panel="myroom"]').classList.add('active');
            loadMyRooms();
            break;
        case 'admin':
            panelElement = DOM.adminPanel;
            break;
    }
    
    if (panelElement) {
        panelElement.classList.add('active-panel');
    }
    
    AppState.currentPanel = panelName;
}

// Show image
function showFullImage(src) {
    DOM.fullSizeImage.src = src;
    DOM.imageModal.style.display = 'flex';
}

// Play sound
function playNotificationSound() {
    if (AppState.soundEnabled && DOM.messageSound) {
        DOM.messageSound.currentTime = 0;
        DOM.messageSound.play().catch(e => console.log("Sound error:", e));
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupCoreEventListeners() {
    // Navigation
    DOM.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const panel = btn.dataset.panel;
            switchPanel(panel);
        });
    });
    
    // Logout
    DOM.logoutBtn.addEventListener('click', handleLogout);
    
    // Admin panel button
    DOM.adminPanelBtn.addEventListener('click', () => {
        switchPanel('admin');
        loadAdminData();
    });
    
    // Connect button
    DOM.connectBtn.addEventListener('click', handleLogin);
    DOM.passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // Profile update
    DOM.updateProfileBtn.addEventListener('click', updateProfile);
    DOM.profileImageUpload.addEventListener('change', handleProfileImageUpload);
    
    // Mira message (no login)
    DOM.sendMiraMessageBtn.addEventListener('click', sendMessageToMira);
    
    // Image modal
    DOM.closeImageModal.addEventListener('click', () => {
        DOM.imageModal.style.display = 'none';
    });
    
    DOM.imageModal.addEventListener('click', (e) => {
        if (e.target === DOM.imageModal) {
            DOM.imageModal.style.display = 'none';
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin() {
    const username = DOM.usernameInput.value.trim();
    const password = DOM.passwordInput.value;
    
    if (!username || !password) {
        showError("Please enter username and password");
        return;
    }
    
    DOM.connectBtn.disabled = true;
    DOM.connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
        // Find user - use exact match, not ilike for case sensitivity
        const { data: user, error } = await supabaseClient
            .from('user_management')
            .select('*')
            .eq('username', username)  // Use eq instead of ilike for exact match
            .eq('is_active', true)
            .maybeSingle();  // Use maybeSingle instead of single to avoid errors
        
        if (error) {
            console.error("Database error:", error);
            showError("Login failed. Please try again.");
            return;
        }
        
        if (!user) {
            console.log("User not found:", username);
            showError("Invalid username or password");
            return;
        }
        
        console.log("User found:", user.username, "Role:", user.role);
        
        // VERIFY PASSWORD - Fixed version
        let isAuthenticated = false;
        
        // For demo purposes - check against test passwords
        // In production, you should use proper password hashing
        const testPasswords = {
            'guest': 'guest123',
            'host': 'host123',
            'mira': 'mira123'
        };
        
        // Check if it's a test account with correct password
        if (testPasswords[username.toLowerCase()] === password) {
            isAuthenticated = true;
            console.log("✅ Test account authenticated");
        } 
        // Check if password matches the stored password_hash (for demo)
        else if (user.password_hash === password) {
            isAuthenticated = true;
            console.log("✅ Password matched stored hash");
        }
        // Special case for mira account
        else if (username.toLowerCase() === 'mira' && password === 'mira123') {
            isAuthenticated = true;
            console.log("✅ Mira account authenticated");
        }
        
        if (!isAuthenticated) {
            console.log("❌ Password verification failed");
            showError("Invalid username or password");
            return;
        }
        
        // Set user data
        AppState.userId = user.id;
        AppState.userName = user.username;
        AppState.userRole = user.role;
        AppState.userDisplayName = user.display_name || user.username;
        AppState.userAvatar = user.avatar_url;
        
        // Check if user is Mira (case insensitive)
        AppState.isMiraAdmin = (user.username.toLowerCase() === 'mira');
        
        AppState.isAuthenticated = true;
        AppState.isConnected = true;
        AppState.connectionTime = new Date();
        
        console.log("Login successful. Is Mira admin?", AppState.isMiraAdmin);
        
        // Update last login
        try {
            await supabaseClient
                .from('user_management')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id);
        } catch (updateError) {
            console.log("Could not update last login:", updateError);
        }
        
        // Save session
        saveSession();
        
        // Hide modal and update UI
        hideConnectionModal();
        updateUIAfterLogin();
        
        // Setup realtime subscriptions
        setupRealtimeSubscriptions();
        
    } catch (error) {
        console.error("Login error:", error);
        showError("Login failed. Please try again.");
    } finally {
        DOM.connectBtn.disabled = false;
        DOM.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Login to MiraGrand-Hotel';
    }
}

function showError(message) {
    DOM.passwordError.style.display = 'block';
    DOM.passwordError.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
}

// ============================================
// LOGOUT
// ============================================

async function handleLogout() {
    if (!confirm("Are you sure you want to logout?")) return;
    
    // Clean up subscriptions
    Object.values(AppState.realtimeSubscriptions).forEach(sub => {
        if (sub) supabaseClient.removeChannel(sub);
    });
    
    // Clear state
    clearSession();
    
    // Update UI
    DOM.statusIndicator.className = 'status-indicator offline';
    DOM.userRoleDisplay.textContent = "Disconnected";
    DOM.logoutBtn.style.display = 'none';
    DOM.adminPanelBtn.style.display = 'none';
    DOM.mainHeader.style.display = 'none';
    DOM.mainContent.style.display = 'none';
    
    // Show connection modal
    showConnectionModal();
    
    // Clear inputs
    DOM.usernameInput.value = '';
    DOM.passwordInput.value = '';
}

// ============================================
// MIRA MESSAGE (NO LOGIN REQUIRED)
// ============================================

async function sendMessageToMira() {
    const message = DOM.miraMessageInput.value.trim();
    
    if (!message) {
        alert("Please enter a message");
        return;
    }
    
    DOM.sendMiraMessageBtn.disabled = true;
    DOM.sendMiraMessageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        const userIP = await getRealIP();
        
        // Save to messages_to_mira table
        const { error } = await supabaseClient
            .from('messages_to_mira')
            .insert([{
                message: message,
                sender_ip: userIP,
                created_at: new Date().toISOString(),
                is_read: false
            }]);
        
        if (error) throw error;
        
        // Show success
        DOM.miraMessageSuccess.style.display = 'block';
        DOM.miraMessageInput.value = '';
        
        setTimeout(() => {
            DOM.miraMessageSuccess.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error("Error sending to Mira:", error);
        alert("Failed to send message. Please try again.");
    } finally {
        DOM.sendMiraMessageBtn.disabled = false;
        DOM.sendMiraMessageBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send to Mira';
    }
}

// ============================================
// PROFILE FUNCTIONS
// ============================================

async function updateProfile() {
    const newDisplayName = DOM.profileDisplayName.value.trim();
    
    if (!newDisplayName) {
        alert("Display name cannot be empty");
        return;
    }
    
    DOM.updateProfileBtn.disabled = true;
    DOM.updateProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        const { error } = await supabaseClient
            .from('user_management')
            .update({
                display_name: newDisplayName,
                updated_at: new Date().toISOString()
            })
            .eq('id', AppState.userId);
        
        if (error) throw error;
        
        AppState.userDisplayName = newDisplayName;
        saveSession();
        
        // Update UI
        DOM.userRoleDisplay.textContent = `${newDisplayName} (${AppState.userRole})`;
        
        DOM.profileUpdateMessage.textContent = "Profile updated successfully!";
        DOM.profileUpdateMessage.style.display = 'block';
        
        setTimeout(() => {
            DOM.profileUpdateMessage.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile: " + error.message);
    } finally {
        DOM.updateProfileBtn.disabled = false;
        DOM.updateProfileBtn.innerHTML = '<i class="fas fa-save"></i> Update Profile';
    }
}

async function handleProfileImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert("Please select an image file");
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(ev) {
        const imageData = ev.target.result;
        
        try {
            const { error } = await supabaseClient
                .from('user_management')
                .update({
                    avatar_url: imageData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', AppState.userId);
            
            if (error) throw error;
            
            AppState.userAvatar = imageData;
            saveSession();
            updateAvatarDisplay();
            
            alert("Avatar updated successfully!");
            
        } catch (error) {
            console.error("Error updating avatar:", error);
            alert("Failed to update avatar: " + error.message);
        }
    };
    reader.readAsDataURL(file);
}

// ============================================
// DATA LOADING
// ============================================

async function loadUserData() {
    // Load user's rooms
    await loadMyRooms();
    
    // Load available rooms
    await loadAvailableRooms();
    
    // Load pending requests (if host)
    if (AppState.userRole === 'host') {
        await loadPendingRequests();
    }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

function setupRealtimeSubscriptions() {
    // Hall channel
    AppState.realtimeSubscriptions.hall = supabaseClient
        .channel('hall')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'hall_messages'
        }, handleNewHallMessage)
        .subscribe();
    
    // User presence in hall
    AppState.realtimeSubscriptions.hallPresence = supabaseClient
        .channel('hall_presence')
        .on('presence', { event: 'sync' }, () => {
            loadHallParticipants();
        })
        .subscribe();
}

function handleNewHallMessage(payload) {
    if (AppState.currentPanel === 'hall') {
        displayHallMessage(payload.new);
    }
    if (AppState.soundEnabled) {
        playNotificationSound();
    }
}

// ============================================
// INITIALIZATION
// ============================================

async function initApp() {
    console.log("🚀 Initializing MiraGrand-Hotel...");
    
    // Setup event listeners
    setupCoreEventListeners();
    
    // Check for saved session
    const hasSession = await loadSession();
    
    if (hasSession) {
        hideConnectionModal();
        updateUIAfterLogin();
        setupRealtimeSubscriptions();
    } else {
        showConnectionModal();
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);

// Export for other modules
window.AppState = AppState;
window.DOM = DOM;
window.supabaseClient = supabaseClient;
window.showFullImage = showFullImage;
window.playNotificationSound = playNotificationSound;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;
