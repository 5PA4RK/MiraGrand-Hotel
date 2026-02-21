// UI helper functions
const UI = {
    showView(viewId) {
        const views = ['receptionView', 'hallView', 'myRoomView', 'myProfileView'];
        views.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        const view = document.getElementById(viewId);
        if (view) view.style.display = 'block';
    },

    updateConnectionStatus(isConnected, userName = '', isAdmin = false) {
        const indicator = document.getElementById('statusIndicator');
        const display = document.getElementById('userRoleDisplay');
        
        if (isConnected) {
            indicator.className = 'status-indicator online';
            display.textContent = `${userName} (Connected)`;
            
            // Show navigation buttons
            document.querySelectorAll('.nav-btn').forEach(btn => btn.style.display = 'flex');
            document.getElementById('logoutBtn').style.display = 'flex';
            
            // Set admin mode on body if user is admin
            if (isAdmin) {
                document.body.classList.add('admin-mode');
            } else {
                document.body.classList.remove('admin-mode');
            }
        } else {
            indicator.className = 'status-indicator offline';
            display.textContent = 'Not Logged In';
            
            // Hide navigation buttons
            document.querySelectorAll('.nav-btn').forEach(btn => btn.style.display = 'none');
            document.getElementById('logoutBtn').style.display = 'none';
            
            // Remove admin mode
            document.body.classList.remove('admin-mode');
        }
    },

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
        }
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    },

    displayMessage(container, message, isOwn = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'sent' : 'received'}`;
        messageDiv.id = `msg-${message.id}`;
        
        let content = message.message || '';
        if (message.image_url) {
            content += `<img src="${message.image_url}" class="message-image" onclick="Helpers.showFullImage('${message.image_url}')">`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-sender">${message.sender_name}</div>
            <div class="message-content">
                <div class="message-text">${content}</div>
                <div class="message-time">${Helpers.formatTime(message.created_at)}</div>
            </div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    },

    displaySystemMessage(container, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message received';
        messageDiv.innerHTML = `
            <div class="message-sender">System</div>
            <div class="message-content">
                <div class="message-text">${text}</div>
                <div class="message-time">${Helpers.formatTime(new Date())}</div>
            </div>
        `;
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    },

    createRoomElement(room, index) {
        const roomDiv = document.createElement('div');
        roomDiv.className = 'room-item';
        
        const roomNumber = (index + 1).toString().padStart(3, '0');
        
        roomDiv.innerHTML = `
            <div class="room-info">
                <div class="room-name">
                    <i class="fas fa-door-open"></i>
                    ${room.room_name || `Room ${roomNumber}`}
                </div>
                <div class="room-host">
                    <i class="fas fa-user-crown"></i>
                    Host: ${room.host_name}
                </div>
                <div class="room-created">
                    <i class="fas fa-clock"></i>
                    Created: ${Helpers.formatDate(room.created_at)}
                </div>
            </div>
            <button class="btn btn-small btn-success visit-room-btn" data-room-id="${room.session_id}" data-room-name="${room.room_name || `Room ${roomNumber}`}">
                <i class="fas fa-sign-in-alt"></i> Request Visit
            </button>
        `;
        
        return roomDiv;
    },

    createPendingVisitElement(request) {
        const div = document.createElement('div');
        div.className = 'pending-visit-item';
        
        div.innerHTML = `
            <div>
                <strong>${request.room_name || request.session?.room_name || 'Room'}</strong>
                <p><small>Requested: ${Helpers.formatDate(request.requested_at)}</small></p>
                ${request.note ? `<p><i class="fas fa-sticky-note"></i> ${request.note}</p>` : ''}
            </div>
            <span class="status-badge">${request.status}</span>
        `;
        
        return div;
    }
};

window.UI = UI;