// ============================================
// HOTEL MODULE - Rooms, Reception, Admin
// ============================================

// Reception DOM elements
const ReceptionDOM = {
    availableRoomsList: document.getElementById('availableRoomsList'),
    pendingRequestsList: document.getElementById('pendingRequestsList'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    receptionTabs: document.querySelectorAll('.reception-tab'),
    availableTab: document.getElementById('availableRoomsTab'),
    pendingTab: document.getElementById('pendingRequestsTab')
};

// My Rooms DOM
const MyRoomsDOM = {
    list: document.getElementById('myRoomsList')
};

// Modals
const Modals = {
    createRoom: document.getElementById('createRoomModal'),
    visitRoom: document.getElementById('visitRoomModal'),
    closeButtons: document.querySelectorAll('.close-modal')
};

// Admin DOM
const AdminDOM = {
    panel: document.getElementById('adminPanel'),
    usersList: document.getElementById('adminUsersList'),
    roomsList: document.getElementById('adminRoomsList'),
    messagesList: document.getElementById('messagesToMiraList'),
    tabs: document.querySelectorAll('.admin-tab'),
    addUserBtn: document.getElementById('addUserBtn'),
    userSearch: document.getElementById('userSearchInput')
};

// ============================================
// ROOM FUNCTIONS
// ============================================

// Load available rooms
async function loadAvailableRooms() {
    if (!ReceptionDOM.availableRoomsList) return;
    
    try {
        const { data: rooms, error } = await supabaseClient
            .from('rooms')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        AppState.availableRooms = rooms || [];
        renderAvailableRooms();
        
    } catch (error) {
        console.error("Error loading rooms:", error);
        ReceptionDOM.availableRoomsList.innerHTML = '<div class="empty-state">Error loading rooms</div>';
    }
}

// Render available rooms
function renderAvailableRooms() {
    if (!ReceptionDOM.availableRoomsList) return;
    
    if (!AppState.availableRooms || AppState.availableRooms.length === 0) {
        ReceptionDOM.availableRoomsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-door-open"></i>
                <h3>No Rooms Available</h3>
                <p>Be the first to create a room!</p>
            </div>
        `;
        return;
    }
    
    ReceptionDOM.availableRoomsList.innerHTML = '';
    
    AppState.availableRooms.forEach(room => {
        const roomCard = document.createElement('div');
        roomCard.className = 'room-card';
        roomCard.dataset.roomId = room.id;
        
        const created = new Date(room.created_at).toLocaleDateString();
        const isOwnRoom = room.host_id === AppState.userId;
        
        roomCard.innerHTML = `
            <div class="room-card-header">
                <span class="room-name">${escapeHtml(room.name)}</span>
                <span class="room-status-badge active">Active</span>
            </div>
            <div class="room-host">
                <i class="fas fa-user-crown"></i> Host: ${escapeHtml(room.host_name)}
            </div>
            <div class="room-description">
                ${escapeHtml(room.description || 'No description')}
            </div>
            <div class="room-meta">
                <span><i class="fas fa-calendar"></i> ${created}</span>
                <span><i class="fas fa-users"></i> ${room.guest_count || 0} guests</span>
            </div>
            <div class="room-actions">
                ${!isOwnRoom ? `
                    <button class="btn btn-small visit-room-btn" data-room-id="${room.id}" data-room-name="${escapeHtml(room.name)}">
                        <i class="fas fa-door-open"></i> Visit Room
                    </button>
                ` : `
                    <span class="room-host-badge">Your Room</span>
                `}
            </div>
        `;
        
        ReceptionDOM.availableRoomsList.appendChild(roomCard);
    });
    
    // Add event listeners to visit buttons
    document.querySelectorAll('.visit-room-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const roomId = btn.dataset.roomId;
            const roomName = btn.dataset.roomName;
            showVisitRoomModal(roomId, roomName);
        });
    });
}

// Load my rooms
async function loadMyRooms() {
    if (!MyRoomsDOM.list) return;
    
    try {
        // Rooms where user is host
        const { data: hostedRooms, error: hostedError } = await supabaseClient
            .from('rooms')
            .select('*')
            .eq('host_id', AppState.userId)
            .order('created_at', { ascending: false });
        
        if (hostedError) throw hostedError;
        
        // Rooms where user is approved guest
        const { data: guestRooms, error: guestError } = await supabaseClient
            .from('room_guests')
            .select('room_id, rooms(*)')
            .eq('guest_id', AppState.userId)
            .eq('status', 'approved');
        
        if (guestError) throw guestError;
        
        const approvedRooms = guestRooms.map(g => g.rooms).filter(r => r && r.is_active);
        
        AppState.myRooms = [...(hostedRooms || []), ...(approvedRooms || [])];
        renderMyRooms();
        
    } catch (error) {
        console.error("Error loading my rooms:", error);
        MyRoomsDOM.list.innerHTML = '<div class="empty-state">Error loading rooms</div>';
    }
}

// Render my rooms
function renderMyRooms() {
    if (!MyRoomsDOM.list) return;
    
    if (!AppState.myRooms || AppState.myRooms.length === 0) {
        MyRoomsDOM.list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-door-closed"></i>
                <h3>No Rooms Yet</h3>
                <p>Go to Reception to create or join a room</p>
            </div>
        `;
        return;
    }
    
    MyRoomsDOM.list.innerHTML = '';
    
    AppState.myRooms.forEach(room => {
        const isHost = room.host_id === AppState.userId;
        const roomItem = document.createElement('div');
        roomItem.className = 'my-room-item';
        roomItem.dataset.roomId = room.id;
        
        roomItem.innerHTML = `
            <h3><i class="fas fa-door-open"></i> ${escapeHtml(room.name)}</h3>
            <div class="room-stats">
                <span><i class="fas fa-user-crown"></i> ${escapeHtml(room.host_name)}</span>
                <span><i class="fas fa-calendar"></i> ${new Date(room.created_at).toLocaleDateString()}</span>
            </div>
            <p class="room-description">${escapeHtml(room.description || 'No description')}</p>
            ${isHost ? '<span class="room-host-badge">You are the host</span>' : ''}
        `;
        
        roomItem.addEventListener('click', () => {
            openRoomChat(room);
        });
        
        MyRoomsDOM.list.appendChild(roomItem);
    });
}

// ============================================
// CREATE ROOM
// ============================================

function showCreateRoomModal() {
    document.getElementById('roomName').value = '';
    document.getElementById('roomDescription').value = '';
    document.getElementById('roomRequireApproval').checked = true;
    document.getElementById('createRoomError').style.display = 'none';
    Modals.createRoom.style.display = 'flex';
}

async function createRoom() {
    const name = document.getElementById('roomName').value.trim();
    const description = document.getElementById('roomDescription').value.trim();
    const requireApproval = document.getElementById('roomRequireApproval').checked;
    
    if (!name) {
        document.getElementById('createRoomError').textContent = "Room name is required";
        document.getElementById('createRoomError').style.display = 'block';
        return;
    }
    
    const saveBtn = document.getElementById('saveRoomBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    try {
        const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        
        const { error } = await supabaseClient
            .from('rooms')
            .insert([{
                id: roomId,
                name: name,
                description: description,
                host_id: AppState.userId,
                host_name: AppState.userDisplayName,
                requires_approval: requireApproval,
                is_active: true,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        Modals.createRoom.style.display = 'none';
        
        // Refresh lists
        await loadMyRooms();
        await loadAvailableRooms();
        
        alert("Room created successfully!");
        
    } catch (error) {
        console.error("Error creating room:", error);
        document.getElementById('createRoomError').textContent = "Failed to create room: " + error.message;
        document.getElementById('createRoomError').style.display = 'block';
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-hotel"></i> Create Room';
    }
}

// ============================================
// VISIT ROOM REQUEST
// ============================================

function showVisitRoomModal(roomId, roomName) {
    document.getElementById('visitRoomInfo').innerHTML = `
        <i class="fas fa-info-circle"></i> Request to visit <strong>${escapeHtml(roomName)}</strong>
    `;
    document.getElementById('visitNote').value = '';
    document.getElementById('visitRoomError').style.display = 'none';
    
    // Store room info in modal dataset
    Modals.visitRoom.dataset.roomId = roomId;
    Modals.visitRoom.dataset.roomName = roomName;
    
    Modals.visitRoom.style.display = 'flex';
}

async function sendVisitRequest() {
    const roomId = Modals.visitRoom.dataset.roomId;
    const roomName = Modals.visitRoom.dataset.roomName;
    const note = document.getElementById('visitNote').value.trim();
    
    if (!roomId) return;
    
    const sendBtn = document.getElementById('sendVisitRequestBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        // Check if request already exists
        const { data: existing } = await supabaseClient
            .from('room_guests')
            .select('*')
            .eq('room_id', roomId)
            .eq('guest_id', AppState.userId)
            .maybeSingle();
        
        if (existing) {
            if (existing.status === 'pending') {
                throw new Error("You already have a pending request for this room");
            } else if (existing.status === 'approved') {
                throw new Error("You are already a member of this room");
            }
        }
        
        // Create request
        const { error } = await supabaseClient
            .from('room_guests')
            .insert([{
                room_id: roomId,
                guest_id: AppState.userId,
                guest_name: AppState.userDisplayName,
                guest_note: note,
                status: 'pending',
                requested_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        Modals.visitRoom.style.display = 'none';
        alert("Request sent to host!");
        
    } catch (error) {
        document.getElementById('visitRoomError').textContent = error.message;
        document.getElementById('visitRoomError').style.display = 'block';
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
    }
}

// ============================================
// PENDING REQUESTS (For Hosts)
// ============================================

async function loadPendingRequests() {
    if (!ReceptionDOM.pendingRequestsList) return;
    if (AppState.userRole !== 'host') return;
    
    try {
        // Get rooms where user is host
        const { data: myRooms } = await supabaseClient
            .from('rooms')
            .select('id')
            .eq('host_id', AppState.userId);
        
        if (!myRooms || myRooms.length === 0) {
            ReceptionDOM.pendingRequestsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No pending requests</p>
                </div>
            `;
            return;
        }
        
        const roomIds = myRooms.map(r => r.id);
        
        const { data: requests, error } = await supabaseClient
            .from('room_guests')
            .select('*, rooms(name)')
            .in('room_id', roomIds)
            .eq('status', 'pending')
            .order('requested_at', { ascending: false });
        
        if (error) throw error;
        
        renderPendingRequests(requests || []);
        
    } catch (error) {
        console.error("Error loading pending requests:", error);
    }
}

function renderPendingRequests(requests) {
    if (!ReceptionDOM.pendingRequestsList) return;
    
    if (requests.length === 0) {
        ReceptionDOM.pendingRequestsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>No pending requests</p>
            </div>
        `;
        return;
    }
    
    ReceptionDOM.pendingRequestsList.innerHTML = '';
    
    requests.forEach(req => {
        const reqElement = document.createElement('div');
        reqElement.className = 'pending-request-item';
        
        reqElement.innerHTML = `
            <div class="request-info">
                <h4><i class="fas fa-user"></i> ${escapeHtml(req.guest_name)}</h4>
                <p><i class="fas fa-door-open"></i> Room: ${escapeHtml(req.rooms?.name || 'Unknown')}</p>
                ${req.guest_note ? `<p><i class="fas fa-sticky-note"></i> Note: ${escapeHtml(req.guest_note)}</p>` : ''}
                <small><i class="fas fa-clock"></i> ${new Date(req.requested_at).toLocaleString()}</small>
            </div>
            <div class="request-actions">
                <button class="btn btn-small btn-success approve-request" data-request-id="${req.id}">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-small btn-danger deny-request" data-request-id="${req.id}">
                    <i class="fas fa-times"></i> Deny
                </button>
            </div>
        `;
        
        ReceptionDOM.pendingRequestsList.appendChild(reqElement);
    });
    
    // Add event listeners
    document.querySelectorAll('.approve-request').forEach(btn => {
        btn.addEventListener('click', () => approveRequest(btn.dataset.requestId));
    });
    
    document.querySelectorAll('.deny-request').forEach(btn => {
        btn.addEventListener('click', () => denyRequest(btn.dataset.requestId));
    });
}

async function approveRequest(requestId) {
    try {
        const { error } = await supabaseClient
            .from('room_guests')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        if (error) throw error;
        
        await loadPendingRequests();
        
    } catch (error) {
        console.error("Error approving request:", error);
        alert("Failed to approve request");
    }
}

async function denyRequest(requestId) {
    try {
        const { error } = await supabaseClient
            .from('room_guests')
            .update({
                status: 'rejected',
                rejected_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        if (error) throw error;
        
        await loadPendingRequests();
        
    } catch (error) {
        console.error("Error denying request:", error);
        alert("Failed to deny request");
    }
}

// ============================================
// ADMIN FUNCTIONS - ENHANCED
// ============================================

// Load admin data with better error handling
async function loadAdminData() {
    console.log("Loading admin data...");
    
    if (!AppState.isMiraAdmin) {
        console.log("Not Mira admin, cannot load admin data");
        return;
    }
    
    try {
        await loadAdminUsers();
        await loadAdminRooms();
        await loadMessagesToMira();
        console.log("✅ Admin data loaded successfully");
    } catch (error) {
        console.error("Error loading admin data:", error);
    }
}

// Make sure admin panel is visible when switching
function switchToAdminPanel() {
    console.log("Switching to admin panel");
    
    // Hide all panels
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-panel'));
    
    // Show admin panel
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.classList.add('active-panel');
        adminPanel.style.display = 'block';
    }
    
    // Load data
    loadAdminData();
}

async function loadAdminUsers() {
    if (!AdminDOM.usersList) return;
    
    try {
        const { data: users, error } = await supabaseClient
            .from('user_management')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderAdminUsers(users || []);
        
    } catch (error) {
        console.error("Error loading users:", error);
    }
}

function renderAdminUsers(users) {
    if (!AdminDOM.usersList) return;
    
    AdminDOM.usersList.innerHTML = '';
    
    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        
        userCard.innerHTML = `
            <div class="user-header">
                <span class="user-name">${escapeHtml(user.display_name || user.username)}</span>
                <span class="user-badge badge-${user.role}">${user.role}</span>
            </div>
            <div class="user-details">
                <div><i class="fas fa-user"></i> ${escapeHtml(user.username)}</div>
                <div><i class="fas fa-calendar"></i> Joined: ${new Date(user.created_at).toLocaleDateString()}</div>
                <div><i class="fas fa-clock"></i> Last login: ${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</div>
            </div>
            <div class="user-actions">
                <button class="btn btn-small btn-danger delete-user" data-user-id="${user.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        AdminDOM.usersList.appendChild(userCard);
    });
    
    // Add delete listeners
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', () => deleteUser(btn.dataset.userId));
    });
}

async function loadAdminRooms() {
    if (!AdminDOM.roomsList) return;
    
    try {
        const { data: rooms, error } = await supabaseClient
            .from('rooms')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderAdminRooms(rooms || []);
        
    } catch (error) {
        console.error("Error loading rooms:", error);
    }
}

function renderAdminRooms(rooms) {
    if (!AdminDOM.roomsList) return;
    
    AdminDOM.roomsList.innerHTML = '';
    
    rooms.forEach(room => {
        const roomCard = document.createElement('div');
        roomCard.className = 'room-card';
        
        roomCard.innerHTML = `
            <div class="room-card-header">
                <span class="room-name">${escapeHtml(room.name)}</span>
                <span class="room-status-badge ${room.is_active ? 'active' : 'inactive'}">
                    ${room.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="room-host">
                <i class="fas fa-user-crown"></i> Host: ${escapeHtml(room.host_name)}
            </div>
            <div class="room-description">${escapeHtml(room.description || 'No description')}</div>
            <div class="room-meta">
                <span><i class="fas fa-calendar"></i> ${new Date(room.created_at).toLocaleDateString()}</span>
                <span><i class="fas fa-users"></i> Guests: ${room.guest_count || 0}</span>
            </div>
            <div class="room-actions">
                <button class="btn btn-small btn-danger delete-room" data-room-id="${room.id}">
                    <i class="fas fa-trash"></i> Delete Room
                </button>
            </div>
        `;
        
        AdminDOM.roomsList.appendChild(roomCard);
    });
    
    // Add delete listeners
    document.querySelectorAll('.delete-room').forEach(btn => {
        btn.addEventListener('click', () => deleteRoom(btn.dataset.roomId));
    });
}

async function loadMessagesToMira() {
    if (!AdminDOM.messagesList) return;
    
    try {
        const { data: messages, error } = await supabaseClient
            .from('messages_to_mira')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderMessagesToMira(messages || []);
        
    } catch (error) {
        console.error("Error loading messages:", error);
    }
}

function renderMessagesToMira(messages) {
    if (!AdminDOM.messagesList) return;
    
    AdminDOM.messagesList.innerHTML = '';
    
    messages.forEach(msg => {
        const msgElement = document.createElement('div');
        msgElement.className = 'visitor-note-item';
        
        msgElement.innerHTML = `
            <div class="note-header">
                <span class="note-guest-info">
                    <i class="fas fa-user"></i> Anonymous Guest
                </span>
                <span class="note-time">${new Date(msg.created_at).toLocaleString()}</span>
            </div>
            <div class="note-content">
                <div class="note-text">${escapeHtml(msg.message)}</div>
                <div class="note-ip"><i class="fas fa-network-wired"></i> IP: ${msg.sender_ip || 'Unknown'}</div>
            </div>
            <div class="note-actions">
                <button class="btn btn-small btn-success mark-read" data-msg-id="${msg.id}" ${msg.is_read ? 'disabled' : ''}>
                    <i class="fas fa-check"></i> Mark Read
                </button>
            </div>
        `;
        
        AdminDOM.messagesList.appendChild(msgElement);
    });
    
    // Add mark read listeners
    document.querySelectorAll('.mark-read').forEach(btn => {
        btn.addEventListener('click', () => markMessageRead(btn.dataset.msgId));
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

async function deleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    
    try {
        const { error } = await supabaseClient
            .from('user_management')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
        
        await loadAdminUsers();
        
    } catch (error) {
        console.error("Error deleting user:", error);
        alert("Failed to delete user");
    }
}

async function deleteRoom(roomId) {
    if (!confirm("Are you sure you want to delete this room? All messages will be lost.")) return;
    
    try {
        // Delete room messages first
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
        alert("Failed to delete room");
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupHotelEventListeners() {
    // Create room button
    if (ReceptionDOM.createRoomBtn) {
        ReceptionDOM.createRoomBtn.addEventListener('click', showCreateRoomModal);
    }
    
    // Save room button
    const saveRoomBtn = document.getElementById('saveRoomBtn');
    if (saveRoomBtn) {
        saveRoomBtn.addEventListener('click', createRoom);
    }
    
    // Send visit request button
    const sendVisitBtn = document.getElementById('sendVisitRequestBtn');
    if (sendVisitBtn) {
        sendVisitBtn.addEventListener('click', sendVisitRequest);
    }
    
    // Reception tabs
    ReceptionDOM.receptionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Update tabs
            ReceptionDOM.receptionTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update content
            ReceptionDOM.availableTab.classList.remove('active');
            ReceptionDOM.pendingTab.classList.remove('active');
            
            if (tabName === 'available') {
                ReceptionDOM.availableTab.classList.add('active');
            } else {
                ReceptionDOM.pendingTab.classList.add('active');
                loadPendingRequests();
            }
        });
    });
    
    // Admin tabs
    AdminDOM.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            AdminDOM.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            
            if (tabName === 'users') {
                document.getElementById('adminUsersTab').classList.add('active');
            } else if (tabName === 'rooms') {
                document.getElementById('adminRoomsTab').classList.add('active');
            } else if (tabName === 'messages') {
                document.getElementById('adminMessagesTab').classList.add('active');
            }
        });
    });
    
    // Close modal buttons
    Modals.closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            Modals.createRoom.style.display = 'none';
            Modals.visitRoom.style.display = 'none';
        });
    });
    
    // Click outside to close modals
    window.addEventListener('click', (e) => {
        if (e.target === Modals.createRoom) Modals.createRoom.style.display = 'none';
        if (e.target === Modals.visitRoom) Modals.visitRoom.style.display = 'none';
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupHotelEventListeners();
});

// Export functions
window.loadAvailableRooms = loadAvailableRooms;
window.loadMyRooms = loadMyRooms;
window.loadPendingRequests = loadPendingRequests;
