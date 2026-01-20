import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ikoqldnbuwulyzpurlyv.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb3FsZG5idXd1bHl6cHVybHl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDI5OTQsImV4cCI6MjA4NDM3ODk5NH0.QKz1CigzkMKjbxKb-Kvqruk1P2DSxBHi9ktWx8s23Fk';

export const supabase = createClient(supabaseUrl, supabaseKey);
