// Supabase Configuration
const SUPABASE_URL = 'https://jrskweooduuovhvbbvsp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_a_IpZjQzxHb4X5ax8f_XWw_1pZxMY2f'; 

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabaseClient;
