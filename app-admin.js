// ============================================
// MIRA ADMIN PANEL - Only accessible by Mira
// ============================================

// Admin DOM Elements
const AdminUI = {
    panel: document.getElementById('miraAdminPanel'),
    tabs: document.querySelectorAll('[data-mira-tab]'),
    dashboardTab: document.getElementById('miraDashboardTab'),
    usersTab: document.getElementById('miraUsersTab'),
    roomsTab: document.getElementById('miraRoomsTab'),
    messagesTab: document.getElementById('miraMessagesTab'),
    analyticsTab: document.getElementById('miraAnalyticsTab'),
    
    // Stats
    totalUsers: document.getElementById('totalUsersStat'),
    totalRooms: document.getElementById('totalRoomsStat'),
    totalMessages: document.getElementById('totalMessagesStat'),
    activeNow: document.getElementById('activeNowStat'),
    
    // Tables
    usersTableBody: document.getElementById('usersTableBody'),
    roomsTableBody: document.getElementById('roomsTableBody'),
    messagesList: document.getElementById('miraMessagesList'),
    activityList: document.getElementById('recentActivityList'),
    
    // Search
    userSearch: document.getElementById('miraUserSearch'),
    roomSearch: document.getElementById('roomSearch'),
    
    // Buttons
    addUserBtn: document.getElementById('miraAddUserBtn'),
    refreshRoomsBtn: document.getElementById('refreshRoomsBtn'),
    refreshMessagesBtn: document.getElementById('refreshMessagesBtn'),
    markAllReadBtn: document.getElementById('markAllReadBtn')
};

// Modals
const AdminModals = {
    addUser: document.getElementById('miraAddUserModal'),
    editUser: document.getElementById('miraEditUserModal'),
    closeButtons: document.querySelectorAll('#miraAddUserModal .close-modal, #miraEditUserModal .close-modal')
};

// ============================================
// INITIALIZATION
// ============================================

function initMiraAdmin() {
    // Only initialize if user is Mira
    if (!window.AppState || !window.AppState.isMiraAdmin) {
        console.log("Not Mira admin, hiding admin panel");
        return;
    }
    
    console.log("🎮 Initializing Mira Admin Panel");
    
    // Show admin panel
    if (AdminUI.panel) {
        AdminUI.panel.style.display = 'block';
    }
    
    // Setup event listeners
    setupAdminEventListeners();
    
    // Load initial data
    loadAdminDashboard();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupAdminEventListeners() {
    // Tab switching
    AdminUI.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.miraTab;
            switchAdminTab(tabName);
        });
    });
    
    // Add user button
    if (AdminUI.addUserBtn) {
        AdminUI.addUserBtn.addEventListener('click', showAddUserModal);
    }
    
    // Refresh buttons
    if (AdminUI.refreshRoomsBtn) {
        AdminUI.refreshRoomsBtn.addEventListener('click', loadAdminRooms);
    }
    
    if (AdminUI.refreshMessagesBtn) {
        AdminUI.refreshMessagesBtn.addEventListener('click', loadMessagesToMira);
    }
    
    if (AdminUI.markAllReadBtn) {
        AdminUI.markAllReadBtn.addEventListener('click', markAllMessagesRead);
    }
    
    // Search
    if (AdminUI.userSearch) {
        AdminUI.userSearch.addEventListener('input', debounce(searchUsers, 300));
    }
    
    if (AdminUI.roomSearch) {
        AdminUI.roomSearch.addEventListener('input', debounce(searchRooms, 300));
    }
    
    // Modal close buttons
    AdminModals.closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            AdminModals.addUser.style.display = 'none';
            AdminModals.editUser.style.display = 'none';
        });
    });
    
    // Click outside to close modals
    window.addEventListener('click', (e) => {
        if (e.target === AdminModals.addUser) {
            AdminModals.addUser.style.display = 'none';
        }
        if (e.target === AdminModals.editUser) {
            AdminModals.editUser.style.display = 'none';
        }
    });
    
    // Save user button
    const saveUserBtn = document.getElementById('miraSaveUserBtn');
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', saveNewUser);
    }
    
    // Update user button
    const updateUserBtn = document.getElementById('miraUpdateUserBtn');
    if (updateUserBtn) {
        updateUserBtn.addEventListener('click', updateUser);
    }
    
    // Delete user button
    const deleteUserBtn = document.getElementById('miraDeleteUserBtn');
    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', deleteUser);
    }
}

// ============================================
// TAB SWITCHING
// ============================================

function switchAdminTab(tabName) {
    // Update tab buttons
    AdminUI.tabs.forEach(tab => {
        if (tab.dataset.miraTab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Hide all tabs
    AdminUI.dashboardTab.classList.remove('active');
    AdminUI.usersTab.classList.remove('active');
    AdminUI.roomsTab.classList.remove('active');
    AdminUI.messagesTab.classList.remove('active');
    AdminUI.analyticsTab.classList.remove('active');
    
    // Show selected tab
    switch(tabName) {
        case 'dashboard':
            AdminUI.dashboardTab.classList.add('active');
            loadAdminDashboard();
            break;
        case 'users':
            AdminUI.usersTab.classList.add('active');
            loadAdminUsers();
            break;
        case 'rooms':
            AdminUI.roomsTab.classList.add('active');
            loadAdminRooms();
            break;
        case 'messages':
            AdminUI.messagesTab.classList.add('active');
            loadMessagesToMira();
            break;
        case 'analytics':
            AdminUI.analyticsTab.classList.add('active');
            loadAnalytics();
            break;
    }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

async function loadAdminDashboard() {
    try {
        // Load stats
        const [users, rooms, messages, active] = await Promise.all([
            supabaseClient.from('user_management').select('*', { count: 'exact', head: true }),
            supabaseClient.from('rooms').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabaseClient.from('room_messages').select('*', { count: 'exact', head: true }),
            getActiveUsers()
        ]);
        
        if (AdminUI.totalUsers) {
            AdminUI.totalUsers.textContent = users.count || 0;
        }
        
        if (AdminUI.totalRooms) {
            AdminUI.totalRooms.textContent = rooms.count || 0;
        }
        
        if (AdminUI.totalMessages) {
            AdminUI.totalMessages.textContent = messages.count || 0;
        }
        
        if (AdminUI.activeNow) {
            AdminUI.activeNow.textContent = active || 0;
        }
        
        // Load recent activity
        await loadRecentActivity();
        
    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

async function getActiveUsers() {
    // This is a simplified version - in production you'd use presence
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data } = await supabaseClient
        .from('user_management')
        .select('id')
        .gte('last_login', fiveMinutesAgo);
    
    return data?.length || 0;
}

async function loadRecentActivity() {
    if (!AdminUI.activityList) return;
    
    try {
        // Get recent messages
        const { data: messages } = await supabaseClient
            .from('room_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (!messages || messages.length === 0) {
            AdminUI.activityList.innerHTML = '<div class="empty-state">No recent activity</div>';
            return;
        }
        
        AdminUI.activityList.innerHTML = '';
        
        messages.forEach(msg => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            const time = new Date(msg.created_at).toLocaleString();
            
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-comment"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-text">
                        <strong>${escapeHtml(msg.sender_name)}</strong> sent a message
                    </div>
                    <div class="activity-time">${time}</div>
                </div>
            `;
            
            AdminUI.activityList.appendChild(activityItem);
        });
        
    } catch (error) {
        console.error("Error loading activity:", error);
    }
}

// ============================================
// USER MANAGEMENT
// ============================================

async function loadAdminUsers() {
    if (!AdminUI.usersTableBody) return;
    
    AdminUI.usersTableBody.innerHTML = '<tr><td colspan="6" class="loading-row"><div class="loading-spinner"></div> Loading users...</td></tr>';
    
    try {
        const { data: users, error } = await supabaseClient
            .from('user_management')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderUsersTable(users || []);
        
    } catch (error) {
        console.error("Error loading users:", error);
        AdminUI.usersTableBody.innerHTML = '<tr><td colspan="6" class="loading-row">Error loading users</td></tr>';
    }
}

function renderUsersTable(users) {
    if (!AdminUI.usersTableBody) return;
    
    if (users.length === 0) {
        AdminUI.usersTableBody.innerHTML = '<tr><td colspan="6" class="loading-row">No users found</td></tr>';
        return;
    }
    
    AdminUI.usersTableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        const lastLogin = user.last_login 
            ? new Date(user.last_login).toLocaleString() 
            : 'Never';
        
        const statusClass = user.is_active ? 'active' : 'inactive';
        const statusText = user.is_active ? 'Active' : 'Inactive';
        
        row.innerHTML = `
            <td>${escapeHtml(user.username)}</td>
            <td>${escapeHtml(user.display_name || user.username)}</td>
            <td><span class="status-badge ${user.role}">${user.role}</span></td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${lastLogin}</td>
            <td>
                <button class="btn btn-small btn-secondary edit-user-btn" data-user-id="${user.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </td>
        `;
        
        AdminUI.usersTableBody.appendChild(row);
    });
    
    // Add edit button listeners
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.dataset.userId;
            openEditUserModal(userId);
        });
    });
}

function showAddUserModal() {
    document.getElementById('miraNewUsername').value = '';
    document.getElementById('miraNewDisplayName').value = '';
    document.getElementById('miraNewPassword').value = '';
    document.getElementById('miraNewRole').value = 'guest';
    document.getElementById('miraNewActive').checked = true;
    document.getElementById('miraAddUserError').style.display = 'none';
    
    AdminModals.addUser.style.display = 'flex';
}

async function saveNewUser() {
    const username = document.getElementById('miraNewUsername').value.trim();
    const displayName = document.getElementById('miraNewDisplayName').value.trim();
    const password = document.getElementById('miraNewPassword').value;
    const role = document.getElementById('miraNewRole').value;
    const isActive = document.getElementById('miraNewActive').checked;
    
    if (!username || !displayName || !password) {
        showAddUserError("All fields are required");
        return;
    }
    
    const saveBtn = document.getElementById('miraSaveUserBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    try {
        const { error } = await supabaseClient
            .from('user_management')
            .insert([{
                username: username,
                display_name: displayName,
                password_hash: password,
                role: role,
                is_active: isActive,
                created_at: new Date().toISOString(),
                created_by: 'mira'
            }]);
        
        if (error) throw error;
        
        AdminModals.addUser.style.display = 'none';
        await loadAdminUsers();
        
        // Refresh dashboard stats
        loadAdminDashboard();
        
    } catch (error) {
        console.error("Error creating user:", error);
        showAddUserError(error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Create User';
    }
}

function showAddUserError(message) {
    const errorEl = document.getElementById('miraAddUserError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

async function openEditUserModal(userId) {
    try {
        const { data: user, error } = await supabaseClient
            .from('user_management')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        document.getElementById('miraEditUserId').value = user.id;
        document.getElementById('miraEditUsername').value = user.username;
        document.getElementById('miraEditDisplayName').value = user.display_name || user.username;
        document.getElementById('miraEditPassword').value = '';
        document.getElementById('miraEditRole').value = user.role;
        document.getElementById('miraEditActive').checked = user.is_active;
        document.getElementById('miraEditUserError').style.display = 'none';
        
        AdminModals.editUser.style.display = 'flex';
        
    } catch (error) {
        console.error("Error loading user:", error);
        alert("Failed to load user details");
    }
}

async function updateUser() {
    const userId = document.getElementById('miraEditUserId').value;
    const displayName = document.getElementById('miraEditDisplayName').value.trim();
    const password = document.getElementById('miraEditPassword').value;
    const role = document.getElementById('miraEditRole').value;
    const isActive = document.getElementById('miraEditActive').checked;
    
    if (!userId) return;
    
    const updateBtn = document.getElementById('miraUpdateUserBtn');
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        const updateData = {
            display_name: displayName,
            role: role,
            is_active: isActive,
            updated_at: new Date().toISOString()
        };
        
        if (password) {
            updateData.password_hash = password;
        }
        
        const { error } = await supabaseClient
            .from('user_management')
            .update(updateData)
            .eq('id', userId);
        
        if (error) throw error;
        
        AdminModals.editUser.style.display = 'none';
        await loadAdminUsers();
        
    } catch (error) {
        console.error("Error updating user:", error);
        document.getElementById('miraEditUserError').textContent = error.message;
        document.getElementById('miraEditUserError').style.display = 'block';
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerHTML = '<i class="fas fa-save"></i> Update';
    }
}

async function deleteUser() {
    const userId = document.getElementById('miraEditUserId').value;
    
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
        return;
    }
    
    const deleteBtn = document.getElementById('miraDeleteUserBtn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    
    try {
        const { error } = await supabaseClient
            .from('user_management')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
        
        AdminModals.editUser.style.display = 'none';
        await loadAdminUsers();
        
    } catch (error) {
        console.error("Error deleting user:", error);
        alert("Failed to delete user: " + error.message);
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    }
}

function searchUsers() {
    const searchTerm = AdminUI.userSearch.value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        if (row.querySelector('td[colspan]')) return; // Skip loading/empty rows
        
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ============================================
// ROOM MANAGEMENT
// ============================================

async function loadAdminRooms() {
    if (!AdminUI.roomsTableBody) return;
    
    AdminUI.roomsTableBody.innerHTML = '<tr><td colspan="6" class="loading-row"><div class="loading-spinner"></div> Loading rooms...</td></tr>';
    
    try {
        const { data: rooms, error } = await supabaseClient
            .from('rooms')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderRoomsTable(rooms || []);
        
    } catch (error) {
        console.error("Error loading rooms:", error);
        AdminUI.roomsTableBody.innerHTML = '<tr><td colspan="6" class="loading-row">Error loading rooms</td></tr>';
    }
}

function renderRoomsTable(rooms) {
    if (!AdminUI.roomsTableBody) return;
    
    if (rooms.length === 0) {
        AdminUI.roomsTableBody.innerHTML = '<tr><td colspan="6" class="loading-row">No rooms found</td></tr>';
        return;
    }
    
    AdminUI.roomsTableBody.innerHTML = '';
    
    rooms.forEach(room => {
        const row = document.createElement('tr');
        
        const created = new Date(room.created_at).toLocaleDateString();
        const statusClass = room.is_active ? 'active' : 'inactive';
        const statusText = room.is_active ? 'Active' : 'Inactive';
        
        row.innerHTML = `
            <td>${escapeHtml(room.name)}</td>
            <td>${escapeHtml(room.host_name)}</td>
            <td>${room.guest_count || 0}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${created}</td>
            <td>
                <button class="btn btn-small btn-danger delete-room-btn" data-room-id="${room.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        
        AdminUI.roomsTableBody.appendChild(row);
    });
    
    // Add delete button listeners
    document.querySelectorAll('.delete-room-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const roomId = btn.dataset.roomId;
            deleteRoom(roomId);
        });
    });
}

async function deleteRoom(roomId) {
    if (!confirm("Are you sure you want to delete this room? All messages and guest data will be lost.")) {
        return;
    }
    
    try {
        // Delete room messages
        await supabaseClient
            .from('room_messages')
            .delete()
            .eq('room_id', roomId);
        
        // Delete room guests
        await supabaseClient
            .from('room_guests')
            .delete()
            .eq('room_id', roomId);
        
        // Delete room
        const { error } = await supabaseClient
            .from('rooms')
            .delete()
            .eq('id', roomId);
        
        if (error) throw error;
        
        await loadAdminRooms();
        
    } catch (error) {
        console.error("Error deleting room:", error);
        alert("Failed to delete room: " + error.message);
    }
}

function searchRooms() {
    const searchTerm = AdminUI.roomSearch.value.toLowerCase();
    const rows = document.querySelectorAll('#roomsTableBody tr');
    
    rows.forEach(row => {
        if (row.querySelector('td[colspan]')) return;
        
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ============================================
// MESSAGES TO MIRA
// ============================================

async function loadMessagesToMira() {
    if (!AdminUI.messagesList) return;
    
    AdminUI.messagesList.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const { data: messages, error } = await supabaseClient
            .from('messages_to_mira')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderMessagesToMira(messages || []);
        
    } catch (error) {
        console.error("Error loading messages:", error);
        AdminUI.messagesList.innerHTML = '<div class="empty-state">Error loading messages</div>';
    }
}

function renderMessagesToMira(messages) {
    if (!AdminUI.messagesList) return;
    
    if (messages.length === 0) {
        AdminUI.messagesList.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No messages yet</p></div>';
        return;
    }
    
    AdminUI.messagesList.innerHTML = '';
    
    messages.forEach(msg => {
        const msgElement = document.createElement('div');
        msgElement.className = `mira-message-item ${msg.is_read ? '' : 'unread'}`;
        
        const time = new Date(msg.created_at).toLocaleString();
        
        msgElement.innerHTML = `
            <div class="message-header">
                <div class="message-sender-info">
                    <i class="fas fa-user"></i>
                    <strong>Anonymous Guest</strong>
                    ${!msg.is_read ? '<span class="unread-badge">New</span>' : ''}
                </div>
                <div class="message-time">${time}</div>
            </div>
            <div class="message-content">
                ${escapeHtml(msg.message)}
            </div>
            <div class="message-footer">
                <div class="message-ip">
                    <i class="fas fa-network-wired"></i> IP: ${msg.sender_ip || 'Unknown'}
                </div>
                <div class="message-actions">
                    ${!msg.is_read ? `
                        <button class="btn btn-small btn-success mark-read-btn" data-msg-id="${msg.id}">
                            <i class="fas fa-check"></i> Mark Read
                        </button>
                    ` : ''}
                    <button class="btn btn-small btn-danger delete-msg-btn" data-msg-id="${msg.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        
        AdminUI.messagesList.appendChild(msgElement);
    });
    
    // Add button listeners
    document.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', () => markMessageRead(btn.dataset.msgId));
    });
    
    document.querySelectorAll('.delete-msg-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteMessage(btn.dataset.msgId));
    });
}

async function markMessageRead(msgId) {
    try {
        const { error } = await supabaseClient
            .from('messages_to_mira')
            .update({ is_read: true })
            .eq('id', msgId);
        
        if (error) throw error;
        
        await loadMessagesToMira();
        
    } catch (error) {
        console.error("Error marking message read:", error);
    }
}

async function deleteMessage(msgId) {
    if (!confirm("Delete this message?")) return;
    
    try {
        const { error } = await supabaseClient
            .from('messages_to_mira')
            .delete()
            .eq('id', msgId);
        
        if (error) throw error;
        
        await loadMessagesToMira();
        
    } catch (error) {
        console.error("Error deleting message:", error);
    }
}

async function markAllMessagesRead() {
    try {
        const { error } = await supabaseClient
            .from('messages_to_mira')
            .update({ is_read: true })
            .eq('is_read', false);
        
        if (error) throw error;
        
        await loadMessagesToMira();
        
    } catch (error) {
        console.error("Error marking all messages read:", error);
    }
}

// ============================================
// ANALYTICS
// ============================================

async function loadAnalytics() {
    // This would require chart.js library
    // For now, just show placeholder
    console.log("Analytics loaded");
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// EXPORT
// ============================================

// Make functions globally available
window.initMiraAdmin = initMiraAdmin;
window.loadAdminDashboard = loadAdminDashboard;
window.loadAdminUsers = loadAdminUsers;
window.loadAdminRooms = loadAdminRooms;
window.loadMessagesToMira = loadMessagesToMira;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for app to initialize
    setTimeout(() => {
        if (window.AppState && window.AppState.isMiraAdmin) {
            initMiraAdmin();
        }
    }, 1000);
});
