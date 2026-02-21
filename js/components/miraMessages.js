// Mira Messages component
const MiraMessages = {
    init() {
        const sendBtn = document.getElementById('sendMiraMessageBtn');
        const input = document.getElementById('miraMessageInput');
        
        if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    },

    async sendMessage() {
        const input = document.getElementById('miraMessageInput');
        const text = input.value.trim();
        
        if (!text) {
            Helpers.showNotification('Please enter a message.', 'warning');
            return;
        }
        
        const parsed = Helpers.parseMiraMessage(text);
        
        const success = await DB.saveMiraMessage(parsed.name, parsed.need, parsed.contact);
        
        if (success) {
            input.value = '';
            const successEl = document.getElementById('miraMessageSuccess');
            successEl.style.display = 'flex';
            setTimeout(() => {
                successEl.style.display = 'none';
            }, 5000);
            
            Helpers.showNotification('Your message has been sent to Mira!', 'success');
        } else {
            Helpers.showNotification('Failed to send message. Please try again.', 'error');
        }
    },

    async loadMessagesForAdmin(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const messages = await DB.getMiraMessages();
        
        if (messages.length === 0) {
            container.innerHTML = '<div class="empty-state">No messages yet.</div>';
            return;
        }
        
        container.innerHTML = '';
        
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = `admin-mira-item ${msg.is_read ? 'read' : 'unread'}`;
            
            div.innerHTML = `
                <div class="mira-header">
                    <strong>From: ${msg.sender_name || 'Unknown'}</strong>
                    <span class="mira-time">${Helpers.formatDate(msg.created_at)}</span>
                </div>
                <div class="mira-content">
                    <p><strong>Message:</strong> ${Helpers.escapeHtml(msg.message)}</p>
                    ${msg.contact_method ? `<p><strong>Contact:</strong> ${Helpers.escapeHtml(msg.contact_method)}</p>` : ''}
                </div>
                ${!msg.is_read ? `
                    <button class="btn btn-small btn-success mark-read-btn" data-id="${msg.id}">
                        <i class="fas fa-check"></i> Mark as Read
                    </button>
                ` : ''}
            `;
            
            container.appendChild(div);
        });
        
        // Add event listeners for mark as read buttons
        container.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                await DB.markMiraMessageAsRead(id);
                this.loadMessagesForAdmin(containerId);
            });
        });
    }
};

window.MiraMessages = MiraMessages;