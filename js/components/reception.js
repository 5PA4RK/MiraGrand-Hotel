// Reception component
const Reception = {
    init() {
        const createBtn = document.getElementById('createRoomBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createRoom());
        }
    },

    async loadAvailableRooms() {
        const container = document.getElementById('availableRoomsList');
        if (!container) return;
        
        container.innerHTML = '<div class="loading-spinner"></div>';
        
        const rooms = await DB.getAvailableRooms();
        
        if (rooms.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-door-closed"></i>
                    <p>No rooms available</p>
                    <small>Create a new room to get started</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        rooms.forEach((room, index) => {
            const roomEl = UI.createRoomElement(room, index);
            
            const visitBtn = roomEl.querySelector('.visit-room-btn');
            visitBtn.addEventListener('click', () => {
                this.requestVisit(room.session_id, visitBtn.dataset.roomName);
            });
            
            container.appendChild(roomEl);
        });
    },

    async createRoom() {
        const user = Auth.getCurrentUser();
        if (!user) {
            Helpers.showNotification('You must be logged in to create a room.', 'warning');
            return;
        }
        
        const roomName = Helpers.generateRoomName(user.displayName);
        
        const room = await DB.createRoom(user.id, user.displayName, roomName);
        
        if (room) {
            Helpers.showNotification(`Room "${roomName}" created successfully!`, 'success');
            await this.loadAvailableRooms();
            await MyRoom.loadUserRooms();
        } else {
            Helpers.showNotification('Failed to create room.', 'error');
        }
    },

    async requestVisit(roomId, roomName) {
        const user = Auth.getCurrentUser();
        if (!user) {
            Helpers.showNotification('You must be logged in to request a visit.', 'warning');
            return;
        }
        
        // Show request modal
        const modal = document.getElementById('visitRequestModal');
        const roomNameSpan = document.getElementById('visitRoomName');
        roomNameSpan.textContent = roomName;
        
        UI.showModal('visitRequestModal');
        
        const submitBtn = document.getElementById('submitVisitRequestBtn');
        const noteInput = document.getElementById('visitRequestNote');
        const closeBtn = modal.querySelector('.close-modal');
        
        const submitHandler = async () => {
            const note = noteInput.value.trim();
            
            const success = await DB.requestRoomVisit(roomId, user.id, user.displayName, note);
            
            if (success) {
                UI.hideModal('visitRequestModal');
                Helpers.showNotification(`Request sent to join ${roomName}`, 'success');
                noteInput.value = '';
                await this.loadPendingVisits();
            } else {
                Helpers.showNotification('Failed to send request.', 'error');
            }
            
            submitBtn.removeEventListener('click', submitHandler);
            closeBtn?.removeEventListener('click', closeHandler);
        };
        
        const closeHandler = () => {
            UI.hideModal('visitRequestModal');
            noteInput.value = '';
            submitBtn.removeEventListener('click', submitHandler);
            closeBtn?.removeEventListener('click', closeHandler);
        };
        
        submitBtn.addEventListener('click', submitHandler);
        closeBtn?.addEventListener('click', closeHandler);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeHandler();
            }
        }, { once: true });
    },

    async loadPendingVisits() {
        const user = Auth.getCurrentUser();
        if (!user) return;
        
        const container = document.getElementById('pendingVisitsList');
        if (!container) return;
        
        const visits = await DB.getPendingVisitsForUser(user.id);
        
        if (visits.length === 0) {
            container.innerHTML = '<div class="empty-state">No pending visit requests</div>';
            return;
        }
        
        container.innerHTML = '';
        
        visits.forEach(visit => {
            const el = UI.createPendingVisitElement(visit);
            container.appendChild(el);
        });
    },

    // For hosts - load pending requests for their rooms
    async loadPendingRequestsForHost() {
        const user = Auth.getCurrentUser();
        if (!user || user.role !== 'host') return;
        
        const requests = await DB.getPendingVisitsForHost(user.id);
        
        // Show in UI if needed
        if (requests.length > 0) {
            this.showHostPendingRequests(requests);
        }
    },

    showHostPendingRequests(requests) {
        // Group by room
        const byRoom = {};
        requests.forEach(req => {
            const roomId = req.session_id;
            if (!byRoom[roomId]) {
                byRoom[roomId] = {
                    room: req.session,
                    requests: []
                };
            }
            byRoom[roomId].requests.push(req);
        });
        
        // Show notification
        Helpers.showNotification(`You have ${requests.length} pending visit request(s)`, 'info');
        
        // You could add a button to view them
        // For now, we'll just show a notification
    }
};

window.Reception = Reception;