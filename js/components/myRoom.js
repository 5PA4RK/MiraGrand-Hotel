// My Room component
const MyRoom = {
    currentRoomId: null,
    messagesSubscription: null,

    init() {
        const roomSelect = document.getElementById('myRoomsSelect');
        const sendBtn = document.getElementById('sendRoomMessageBtn');
        const input = document.getElementById('roomMessageInput');
        
        if (roomSelect) {
            roomSelect.addEventListener('change', (e) => this.selectRoom(e.target.value));
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    },

    async loadUserRooms() {
        const user = Auth.getCurrentUser();
        if (!user) return;
        
        const select = document.getElementById('myRoomsSelect');
        if (!select) return;
        
        const rooms = await DB.getUserRooms(user.id);
        
        select.innerHTML = '<option value="">Select a room...</option>';
        
        if (rooms.length === 0) {
            select.innerHTML += '<option value="" disabled>No rooms available</option>';
            return;
        }
        
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.session_id;
            option.textContent = room.room_name || room.session_id;
            select.appendChild(option);
        });
    },

    async selectRoom(roomId) {
        // Clear previous subscription
        if (this.messagesSubscription) {
            supabaseClient.removeChannel(this.messagesSubscription);
            this.messagesSubscription = null;
        }
        
        if (!roomId) {
            document.getElementById('selectedRoomChat').style.display = 'none';
            document.getElementById('noRoomSelected').style.display = 'block';
            this.currentRoomId = null;
            return;
        }
        
        this.currentRoomId = roomId;
        
        document.getElementById('selectedRoomChat').style.display = 'block';
        document.getElementById('noRoomSelected').style.display = 'none';
        
        await this.loadRoomMessages(roomId);
        await this.loadRoomParticipants(roomId);
        this.setupRoomSubscription(roomId);
    },

    async loadRoomMessages(roomId) {
        const container = document.getElementById('roomChatMessages');
        if (!container) return;
        
        container.innerHTML = '';
        
        const messages = await DB.getMessages(roomId);
        
        if (messages.length === 0) {
            UI.displaySystemMessage(container, 'Welcome to the room! Start the conversation.');
        } else {
            const user = Auth.getCurrentUser();
            messages.forEach(msg => {
                UI.displayMessage(container, msg, msg.sender_id === user?.id);
            });
        }
    },

    async loadRoomParticipants(roomId) {
        const container = document.getElementById('roomParticipantsList');
        if (!container) return;
        
        const { data: participants } = await supabaseClient
            .from('session_participants')
            .select('*')
            .eq('session_id', roomId)
            .eq('status', 'approved');
        
        if (!participants || participants.length === 0) {
            container.innerHTML = '<div class="empty-state">No participants</div>';
            return;
        }
        
        container.innerHTML = '';
        
        participants.forEach(p => {
            const div = document.createElement('div');
            div.className = 'participant-item';
            div.innerHTML = `
                <i class="fas fa-user"></i>
                <span>${p.user_name}</span>
                ${p.role === 'host' ? '<span class="host-badge">Host</span>' : ''}
            `;
            container.appendChild(div);
        });
    },

    setupRoomSubscription(roomId) {
        this.messagesSubscription = supabaseClient
            .channel(`room_${roomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${roomId}` }, (payload) => {
                const user = Auth.getCurrentUser();
                if (payload.new && payload.new.sender_id !== user?.id) {
                    const container = document.getElementById('roomChatMessages');
                    UI.displayMessage(container, payload.new, false);
                    
                    if (true) { // sound enabled
                        Helpers.playSound(true);
                    }
                }
            })
            .subscribe();
    },

    async sendMessage() {
        const input = document.getElementById('roomMessageInput');
        const text = input.value.trim();
        
        if (!text || !this.currentRoomId) return;
        
        const user = Auth.getCurrentUser();
        if (!user) return;
        
        const message = await DB.sendMessage(this.currentRoomId, user.id, user.displayName, text);
        
        if (message) {
            const container = document.getElementById('roomChatMessages');
            UI.displayMessage(container, message, true);
            input.value = '';
        } else {
            Helpers.showNotification('Failed to send message.', 'error');
        }
    }
};

window.MyRoom = MyRoom;