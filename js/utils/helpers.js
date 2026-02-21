// Helper functions
const Helpers = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatTime(date) {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    formatDate(date) {
        return new Date(date).toLocaleString();
    },

    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    async getRealIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || "Unknown";
        } catch (error) {
            console.error("Error getting IP:", error);
            return "Unknown";
        }
    },

    generateRoomName(hostName) {
        const adjectives = ['Cozy', 'Bright', 'Quiet', 'Spacious', 'Warm', 'Modern', 'Classic', 'Vintage'];
        const nouns = ['Nook', 'Corner', 'Space', 'Haven', 'Retreat', 'Spot', 'Den', 'Loft'];
        
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        
        return `${adj} ${noun} (${hostName}'s Room)`;
    },

    setupRealtimeSubscription(channel, table, filter, callback) {
        return supabaseClient
            .channel(channel)
            .on('postgres_changes', { event: '*', schema: 'public', table, filter }, callback)
            .subscribe();
    },

    playSound(enabled) {
        if (enabled) {
            const sound = document.getElementById('messageSound');
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(e => console.log("Sound play failed:", e));
            }
        }
    },

    showFullImage(src) {
        const modal = document.getElementById('imageModal');
        const fullImage = document.getElementById('fullSizeImage');
        if (modal && fullImage) {
            fullImage.src = src;
            modal.style.display = 'flex';
        }
    },

    parseMiraMessage(text) {
        // Parse format: Hi, I'm [Name]. I need [Something]. Contact me through [Method]
        const nameMatch = text.match(/I'?m\s+([^.]+)/i);
        const needMatch = text.match(/I\s+need\s+([^.]+)/i);
        const contactMatch = text.match(/contact\s+me\s+through\s+([^.]+)/i) || 
                            text.match(/contact:\s*([^.]+)/i) ||
                            text.match(/method:\s*([^.]+)/i);
        
        return {
            name: nameMatch ? nameMatch[1].trim() : 'Unknown',
            need: needMatch ? needMatch[1].trim() : 'Not specified',
            contact: contactMatch ? contactMatch[1].trim() : 'Not specified'
        };
    }
};

window.Helpers = Helpers;