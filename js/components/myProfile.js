// My Profile component
const MyProfile = {
    init() {
        const updateBtn = document.getElementById('updateProfileBtn');
        const avatarUpload = document.getElementById('avatarUpload');
        
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.updateProfile());
        }
        
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }
    },

    loadProfile() {
        const user = Auth.getCurrentUser();
        if (!user) return;
        
        const usernameInput = document.getElementById('profileUsername');
        const displayNameInput = document.getElementById('profileDisplayName');
        const avatarImg = document.getElementById('profileAvatar');
        
        usernameInput.value = user.username || user.displayName;
        displayNameInput.value = user.displayName;
        
        if (user.avatarUrl) {
            avatarImg.src = user.avatarUrl;
        }
    },

    async updateProfile() {
        const user = Auth.getCurrentUser();
        if (!user) return;
        
        const displayName = document.getElementById('profileDisplayName').value.trim();
        
        if (!displayName) {
            Helpers.showNotification('Display name cannot be empty.', 'warning');
            return;
        }
        
        const success = await DB.updateUserProfile(user.id, { display_name: displayName });
        
        if (success) {
            user.displayName = displayName;
            Helpers.showNotification('Profile updated successfully!', 'success');
            
            // Update header display
            document.getElementById('userRoleDisplay').textContent = `${displayName} (Connected)`;
        } else {
            Helpers.showNotification('Failed to update profile.', 'error');
        }
    },

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            Helpers.showNotification('Please select an image file.', 'warning');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            Helpers.showNotification('Image size should be less than 2MB.', 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const user = Auth.getCurrentUser();
            if (!user) return;
            
            const success = await DB.uploadAvatar(user.id, e.target.result);
            
            if (success) {
                document.getElementById('profileAvatar').src = e.target.result;
                user.avatarUrl = e.target.result;
                Helpers.showNotification('Avatar updated successfully!', 'success');
            } else {
                Helpers.showNotification('Failed to upload avatar.', 'error');
            }
        };
        
        reader.readAsDataURL(file);
    }
};

window.MyProfile = MyProfile;