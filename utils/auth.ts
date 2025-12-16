import { supabase } from './supabaseClient';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'cashier';
  username: string;
}

export const login = async (username: string, password: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    // First, sign in with email/password (assuming username is the email)
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });

    if (signInError) {
      return { user: null, error: signInError.message };
    }

    if (!authData.user) {
      return { user: null, error: 'Authentication failed' };
    }

    // Get the user's role from the database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return { user: null, error: 'User not found' };
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      username: userData.username,
    };

    return { user, error: null };
  } catch (error) {
    console.error('Login error:', error);
    return { user: null, error: 'An unexpected error occurred' };
  }
};

export const logout = async (): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  } catch (error) {
    console.error('Logout error:', error);
    return { error: 'Failed to log out' };
  }
};
