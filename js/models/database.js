// Database interaction functions
const DB = {
    // User functions
    async authenticateUser(username, password) {
        try {
            console.log("🔐 Attempting to authenticate:", username);
            
            // Get user from database
            const { data: userData, error } = await supabaseClient
                .from('user_management')
                .select('id, username, display_name, password_hash, role, is_active, avatar_url')
                .eq('username', username)
                .eq('is_active', true)
                .single();
            
            if (error || !userData) {
                console.log("❌ User not found:", error);
                return null;
            }
            
            console.log("✅ User found:", userData.username);
            
            // Verify password using RPC function
            const { data: isValid, error: verifyError } = await supabaseClient
                .rpc('verify_password', {
                    stored_hash: userData.password_hash,
                    password: password
                });
            
            if (verifyError) {
                console.error("❌ Password verification error:", verifyError);
                
                // Fallback: direct comparison for testing (remove in production)
                if (userData.password_hash === password) {
                    console.log("⚠️ Using fallback password comparison");
                    return userData;
                }
                return null;
            }
            
            if (!isValid) {
                console.log("❌ Invalid password");
                return null;
            }
            
            console.log("✅ Password verified successfully");
            return userData;
            
        } catch (error) {
            console.error("❌ Authentication error:", error);
            return null;
        }
    },

    async updateUserLastLogin(userId) {
        try {
            await supabaseClient
                .from('user_management')
                .update({ last_login: new Date().toISOString() })
                .eq('id', userId);
        } catch (error) {
            console.log("Could not update last login:", error);
        }
    },

    async updateUserProfile(userId, updates) {
        try {
            const { error } = await supabaseClient
                .from('user_management')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);
            
            return !error;
        } catch (error) {
            console.error("Profile update error:", error);
            return false;
        }
    },

    // Room functions
    async createRoom(hostId, hostName, roomName = null) {
        try {
            const sessionId = 'room_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
            
            const { data, error } = await supabaseClient
                .from('sessions')
                .insert([{
                    session_id: sessionId,
                    host_id: hostId,
                    host_name: hostName,
                    room_name: roomName || `${hostName}'s Room`,
                    is_active: true,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            // Add host as participant
            await supabaseClient
                .from('session_participants')
                .insert([{
                    session_id: sessionId,
                    user_id: hostId,
                    user_name: hostName,
                    role: 'host',
                    joined_at: new Date().toISOString()
                }]);
            
            return data;
        } catch (error) {
            console.error("Create room error:", error);
            return null;
        }
    },

    async getAvailableRooms() {
        try {
            const { data, error } = await supabaseClient
                .from('sessions')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Get rooms error:", error);
            return [];
        }
    },

    async getUserRooms(userId) {
        try {
            // Rooms where user is host
            const { data: hostedRooms } = await supabaseClient
                .from('sessions')
                .select('*')
                .eq('host_id', userId)
                .eq('is_active', true);
            
            // Rooms where user is approved participant
            const { data: participantRooms } = await supabaseClient
                .from('session_participants')
                .select('session:sessions(*)')
                .eq('user_id', userId)
                .eq('status', 'approved');
            
            const rooms = [];
            if (hostedRooms) rooms.push(...hostedRooms);
            if (participantRooms) {
                participantRooms.forEach(p => {
                    if (p.session && !rooms.some(r => r.session_id === p.session.session_id)) {
                        rooms.push(p.session);
                    }
                });
            }
            
            return rooms;
        } catch (error) {
            console.error("Get user rooms error:", error);
            return [];
        }
    },

    // Visit requests
    async requestRoomVisit(roomId, userId, userName, note = '') {
        try {
            const { error } = await supabaseClient
                .from('visit_requests')
                .insert([{
                    session_id: roomId,
                    user_id: userId,
                    user_name: userName,
                    note: note,
                    status: 'pending',
                    requested_at: new Date().toISOString()
                }]);
            
            return !error;
        } catch (error) {
            console.error("Visit request error:", error);
            return false;
        }
    },

    async getPendingVisitsForUser(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('visit_requests')
                .select('*, session:sessions(*)')
                .eq('user_id', userId)
                .eq('status', 'pending')
                .order('requested_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Get pending visits error:", error);
            return [];
        }
    },

    async getPendingVisitsForHost(hostId) {
        try {
            const { data, error } = await supabaseClient
                .from('visit_requests')
                .select('*, session:sessions(*), user:user_management(*)')
                .eq('session.host_id', hostId)
                .eq('status', 'pending')
                .order('requested_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Get host pending visits error:", error);
            return [];
        }
    },

    async respondToVisitRequest(requestId, status) {
        try {
            const { error } = await supabaseClient
                .from('visit_requests')
                .update({
                    status: status,
                    responded_at: new Date().toISOString()
                })
                .eq('id', requestId);
            
            if (error) throw error;
            
            // If approved, add user as participant
            if (status === 'approved') {
                const { data: request } = await supabaseClient
                    .from('visit_requests')
                    .select('*')
                    .eq('id', requestId)
                    .single();
                
                if (request) {
                    await supabaseClient
                        .from('session_participants')
                        .insert([{
                            session_id: request.session_id,
                            user_id: request.user_id,
                            user_name: request.user_name,
                            role: 'guest',
                            joined_at: new Date().toISOString(),
                            status: 'approved'
                        }]);
                }
            }
            
            return true;
        } catch (error) {
            console.error("Respond to visit error:", error);
            return false;
        }
    },

    // Hall functions
    async getHallParticipants() {
        try {
            const { data, error } = await supabaseClient
                .from('hall_participants')
                .select('*')
                .eq('is_online', true)
                .order('joined_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Get hall participants error:", error);
            return [];
        }
    },

    async joinHall(userId, userName) {
        try {
            const { error } = await supabaseClient
                .from('hall_participants')
                .upsert([{
                    user_id: userId,
                    user_name: userName,
                    is_online: true,
                    joined_at: new Date().toISOString()
                }], { onConflict: 'user_id' });
            
            return !error;
        } catch (error) {
            console.error("Join hall error:", error);
            return false;
        }
    },

    async leaveHall(userId) {
        try {
            const { error } = await supabaseClient
                .from('hall_participants')
                .update({ is_online: false })
                .eq('user_id', userId);
            
            return !error;
        } catch (error) {
            console.error("Leave hall error:", error);
            return false;
        }
    },

    // Mira messages
    async saveMiraMessage(name, message, contactMethod = '') {
        try {
            const { error } = await supabaseClient
                .from('mira_messages')
                .insert([{
                    sender_name: name,
                    message: message,
                    contact_method: contactMethod,
                    created_at: new Date().toISOString(),
                    is_read: false
                }]);
            
            return !error;
        } catch (error) {
            console.error("Save mira message error:", error);
            return false;
        }
    },

    async getMiraMessages() {
        try {
            const { data, error } = await supabaseClient
                .from('mira_messages')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Get mira messages error:", error);
            return [];
        }
    },

    async markMiraMessageAsRead(messageId) {
        try {
            const { error } = await supabaseClient
                .from('mira_messages')
                .update({ is_read: true })
                .eq('id', messageId);
            
            return !error;
        } catch (error) {
            console.error("Mark mira message as read error:", error);
            return false;
        }
    },

    // Messages
    async sendMessage(sessionId, userId, userName, text, imageUrl = null) {
        try {
            const messageData = {
                session_id: sessionId,
                sender_id: userId,
                sender_name: userName,
                message: text || '',
                created_at: new Date().toISOString()
            };
            
            if (imageUrl) messageData.image_url = imageUrl;
            
            const { data, error } = await supabaseClient
                .from('messages')
                .insert([messageData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Send message error:", error);
            return null;
        }
    },

    async getMessages(sessionId) {
        try {
            const { data, error } = await supabaseClient
                .from('messages')
                .select('*')
                .eq('session_id', sessionId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Get messages error:", error);
            return [];
        }
    },

    // Avatar upload
    async uploadAvatar(userId, base64Image) {
        try {
            const { error } = await supabaseClient
                .from('user_management')
                .update({
                    avatar_url: base64Image,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);
            
            return !error;
        } catch (error) {
            console.error("Upload avatar error:", error);
            return false;
        }
    },

    // Admin functions
    async getAllUsers() {
        try {
            const { data, error } = await supabaseClient
                .from('user_management')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Get all users error:", error);
            return [];
        }
    },

    async getAllRooms() {
        try {
            const { data, error } = await supabaseClient
                .from('sessions')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Get all rooms error:", error);
            return [];
        }
    }
};

window.DB = DB;
