import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ihcyxthkdmqlkxsfwyoo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vgEiWPlIVHmJGQ-nQoPA9w_vnqvZJIC';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
