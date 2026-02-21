// Hall component
const Hall = {
    currentSubscription: null,

    init() {
        const sendBtn = document.getElementById('sendHallMessageBtn');
        const input = document.getElementById('hallMessageInput');
        
        if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        // Setup realtime subscriptions when user joins
        if (Auth.getCurrentUser()) {
            this.joinHall();
        }
    },

    async joinHall() {
        const user = Auth.getCurrentUser();
        if (!user) return;
        
        await DB.joinHall(user.id, user.displayName);
        
        // Load hall messages (you'd need a hall_messages table)
        this.loadMessages();
        
        // Setup realtime subscription for hall messages
        this.setupSubscriptions();
    },

    async leaveHall() {
        const user = Auth.getCurrentUser();
        if (!user) return;
        
        await DB.leaveHall(user.id);
        
        if (this.currentSubscription) {
            supabaseClient.removeChannel(this.currentSubscription);
        }
    },

    setupSubscriptions() {
        // Subscribe to new hall messages
        this.currentSubscription = supabaseClient
            .channel('hall_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hall_messages' }, (payload) => {
                const user = Auth.getCurrentUser();
                if (payload.new && payload.new.user_id !== user?.id) {
                    const container = document.getElementById('hallChatMessages');
                    UI.displayMessage(container, payload.new, false);
                    
                    if (true) { // sound enabled
                        Helpers.playSound(true);
                    }
                }
            })
            .subscribe();
        
        // Subscribe to participant changes
        supabaseClient
            .channel('hall_participants')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'hall_participants' }, () => {
                this.loadParticipants();
            })
            .subscribe();
    },

    async loadMessages() {
        const container = document.getElementById('hallChatMessages');
        if (!container) return;
        
        container.innerHTML = '';
        
        UI.displaySystemMessage(container, 'Welcome to The Hall! This is a public discussion area.');
        
        // In a real app, you'd load messages from a hall_messages table
        // For now, just show a welcome message
    },

    async loadParticipants() {
        const container = document.getElementById('hallParticipantsList');
        const countEl = document.getElementById('hallParticipantsCount');
        
        if (!container) return;
        
        const participants = await DB.getHallParticipants();
        
        if (countEl) countEl.textContent = participants.length;
        
        if (participants.length === 0) {
            container.innerHTML = '<div class="empty-state">No participants in the hall</div>';
            return;
        }
        
        container.innerHTML = '';
        
        participants.forEach(p => {
            const div = document.createElement('div');
            div.className = 'hall-participant';
            div.innerHTML = `
                <i class="fas fa-user"></i>
                <span>${p.user_name}</span>
            `;
            container.appendChild(div);
        });
    },

    async sendMessage() {
        const input = document.getElementById('hallMessageInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        const user = Auth.getCurrentUser();
        if (!user) {
            Helpers.showNotification('You must be logged in to send messages.', 'warning');
            return;
        }
        
        try {
            // In a real app, you'd save to a hall_messages table
            const messageData = {
                user_id: user.id,
                user_name: user.displayName,
                message: text,
                created_at: new Date().toISOString()
            };
            
            // For now, just display locally
            const container = document.getElementById('hallChatMessages');
            UI.displayMessage(container, messageData, true);
            
            input.value = '';
            
        } catch (error) {
            console.error("Error sending hall message:", error);
            Helpers.showNotification('Failed to send message.', 'error');
        }
    }
};

window.Hall = Hall;