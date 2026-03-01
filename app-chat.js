// ============================================
// CHAT MODULE - Handles all messaging
// ============================================

// Hall DOM elements
const HallDOM = {
    messages: document.getElementById('hallMessages'),
    input: document.getElementById('hallMessageInput'),
    sendBtn: document.getElementById('sendHallMessageBtn'),
    participantsList: document.getElementById('hallParticipantsList'),
    participantCount: document.getElementById('hallParticipantCount')
};

// Room chat DOM elements
const RoomChatDOM = {
    container: document.getElementById('roomChatContainer'),
    messages: document.getElementById('roomMessages'),
    input: document.getElementById('roomMessageInput'),
    sendBtn: document.getElementById('sendRoomMessageBtn'),
    currentRoomTitle: document.getElementById('currentRoomTitle'),
    backBtn: document.getElementById('backToRoomsBtn')
};

// ============================================
// HALL CHAT FUNCTIONS
// ============================================

// Load hall messages
async function loadHallMessages() {
    try {
        const { data: messages, error } = await supabaseClient
            .from('hall_messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(100);
        
        if (error) throw error;
        
        HallDOM.messages.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            // Show welcome message
            const welcomeMsg = {
                sender_name: 'Hall System',
                message: 'Welcome to The Hall! Everyone can chat here.',
                created_at: new Date().toISOString()
            };
            displayHallMessage(welcomeMsg);
        } else {
            messages.forEach(msg => displayHallMessage(msg));
        }
        
        scrollHallToBottom();
        
    } catch (error) {
        console.error("Error loading hall messages:", error);
    }
}

// Display hall message
function displayHallMessage(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.sender_id === AppState.userId ? 'sent' : 'received'}`;
    
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-sender">${escapeHtml(msg.sender_name)}</div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(msg.message)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    HallDOM.messages.appendChild(messageDiv);
    scrollHallToBottom();
}

// Send hall message
async function sendHallMessage() {
    const message = HallDOM.input.value.trim();
    
    if (!message) return;
    
    HallDOM.sendBtn.disabled = true;
    
    try {
        const { error } = await supabaseClient
            .from('hall_messages')
            .insert([{
                sender_id: AppState.userId,
                sender_name: AppState.userDisplayName,
                message: message,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        HallDOM.input.value = '';
        
    } catch (error) {
        console.error("Error sending hall message:", error);
        alert("Failed to send message");
    } finally {
        HallDOM.sendBtn.disabled = false;
    }
}

// Load hall participants
async function loadHallParticipants() {
    try {
        // Get active users in hall (simplified - in production use presence)
        const { data: recentMessages, error } = await supabaseClient
            .from('hall_messages')
            .select('sender_id, sender_name')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        // Get unique users
        const participants = [];
        const seen = new Set();
        
        recentMessages.forEach(msg => {
            if (!seen.has(msg.sender_id) && msg.sender_id !== 'system') {
                seen.add(msg.sender_id);
                participants.push(msg.sender_name);
            }
        });
        
        AppState.hallParticipants = participants;
        
        if (HallDOM.participantsList) {
            HallDOM.participantsList.textContent = participants.length > 0 
                ? participants.join(', ') 
                : 'No participants yet';
        }
        
        if (HallDOM.participantCount) {
            HallDOM.participantCount.textContent = participants.length;
        }
        
    } catch (error) {
        console.error("Error loading hall participants:", error);
    }
}

// Scroll hall to bottom
function scrollHallToBottom() {
    if (HallDOM.messages) {
        HallDOM.messages.scrollTop = HallDOM.messages.scrollHeight;
    }
}

// ============================================
// ROOM CHAT FUNCTIONS
// ============================================

// Load room messages
async function loadRoomMessages(roomId) {
    if (!roomId) return;
    
    try {
        const { data: messages, error } = await supabaseClient
            .from('room_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        RoomChatDOM.messages.innerHTML = '';
        
        messages.forEach(msg => {
            displayRoomMessage(msg);
        });
        
        scrollRoomToBottom();
        
    } catch (error) {
        console.error("Error loading room messages:", error);
    }
}

// Display room message
function displayRoomMessage(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.sender_id === AppState.userId ? 'sent' : 'received'}`;
    
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-sender">${escapeHtml(msg.sender_name)}</div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(msg.message)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    RoomChatDOM.messages.appendChild(messageDiv);
}

// Send room message
async function sendRoomMessage() {
    if (!AppState.currentRoom) return;
    
    const message = RoomChatDOM.input.value.trim();
    
    if (!message) return;
    
    RoomChatDOM.sendBtn.disabled = true;
    
    try {
        const { error } = await supabaseClient
            .from('room_messages')
            .insert([{
                room_id: AppState.currentRoom.id,
                sender_id: AppState.userId,
                sender_name: AppState.userDisplayName,
                message: message,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        RoomChatDOM.input.value = '';
        
    } catch (error) {
        console.error("Error sending room message:", error);
        alert("Failed to send message");
    } finally {
        RoomChatDOM.sendBtn.disabled = false;
    }
}

// Scroll room to bottom
function scrollRoomToBottom() {
    if (RoomChatDOM.messages) {
        RoomChatDOM.messages.scrollTop = RoomChatDOM.messages.scrollHeight;
    }
}

// Open room chat
function openRoomChat(room) {
    AppState.currentRoom = room;
    
    // Hide rooms list, show chat
    document.querySelector('.my-rooms-list').style.display = 'none';
    RoomChatDOM.container.style.display = 'block';
    
    RoomChatDOM.currentRoomTitle.textContent = room.name || `Room #${room.id.substring(0, 8)}`;
    
    // Load messages
    loadRoomMessages(room.id);
    
    // Setup room subscription
    setupRoomSubscription(room.id);
}

// Close room chat
function closeRoomChat() {
    AppState.currentRoom = null;
    
    // Show rooms list, hide chat
    document.querySelector('.my-rooms-list').style.display = 'grid';
    RoomChatDOM.container.style.display = 'none';
    
    // Clean up subscription
    if (AppState.realtimeSubscriptions.currentRoom) {
        supabaseClient.removeChannel(AppState.realtimeSubscriptions.currentRoom);
    }
}

// Setup room subscription
function setupRoomSubscription(roomId) {
    if (AppState.realtimeSubscriptions.currentRoom) {
        supabaseClient.removeChannel(AppState.realtimeSubscriptions.currentRoom);
    }
    
    AppState.realtimeSubscriptions.currentRoom = supabaseClient
        .channel(`room_${roomId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'room_messages',
            filter: `room_id=eq.${roomId}`
        }, (payload) => {
            if (AppState.currentRoom && AppState.currentRoom.id === roomId) {
                displayRoomMessage(payload.new);
                scrollRoomToBottom();
                
                if (payload.new.sender_id !== AppState.userId && AppState.soundEnabled) {
                    playNotificationSound();
                }
            }
        })
        .subscribe();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupChatEventListeners() {
    // Hall send message
    if (HallDOM.sendBtn) {
        HallDOM.sendBtn.addEventListener('click', sendHallMessage);
    }
    
    if (HallDOM.input) {
        HallDOM.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendHallMessage();
            }
        });
    }
    
    // Room send message
    if (RoomChatDOM.sendBtn) {
        RoomChatDOM.sendBtn.addEventListener('click', sendRoomMessage);
    }
    
    if (RoomChatDOM.input) {
        RoomChatDOM.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendRoomMessage();
            }
        });
    }
    
    // Back to rooms
    if (RoomChatDOM.backBtn) {
        RoomChatDOM.backBtn.addEventListener('click', closeRoomChat);
    }
}

// Initialize chat module
document.addEventListener('DOMContentLoaded', () => {
    setupChatEventListeners();
});

// Export functions
window.loadHallMessages = loadHallMessages;
window.loadHallParticipants = loadHallParticipants;
window.openRoomChat = openRoomChat;
window.closeRoomChat = closeRoomChat;
