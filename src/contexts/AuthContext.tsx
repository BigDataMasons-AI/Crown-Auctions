import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schemas for authentication
const emailSchema = z.string().trim().email('Invalid email format').max(255, 'Email too long');
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Explicitly handle SIGNED_OUT event
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    // Validate inputs
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (validationError: any) {
      const message = validationError.errors?.[0]?.message || 'Invalid input';
      toast.error(message);
      return { error: { message } };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created successfully!');
      navigate('/');
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Validate inputs
    try {
      emailSchema.parse(email);
    } catch (validationError: any) {
      const message = validationError.errors?.[0]?.message || 'Invalid email';
      toast.error(message);
      return { error: { message } };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed in successfully!');
      navigate('/');
    }

    return { error };
  };

  const signOut = async () => {
    try {
      // Sign out from Supabase - this will trigger the auth state change listener
      // with SIGNED_OUT event, which will clear user and session state
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error('Failed to sign out');
        console.error('Sign out error:', error);
        return;
      }
      
      // Small delay to ensure auth state change propagates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      toast.success('Signed out successfully');
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
