import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yptmyubxikeuflfoyftr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdG15dWJ4aWtldWZsZm95ZnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NzM0ODgsImV4cCI6MjA5OTQ0OTQ4OH0.ezWTb-n2mYZVrVD_xztZpXNnFs4wUdEp9uS23UJJmj0';

export const supabase = createClient(supabaseUrl, supabaseKey);
