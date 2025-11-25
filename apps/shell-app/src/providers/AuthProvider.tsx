import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, userData: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    // Verificar sesión existente
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Obtener datos adicionales del usuario
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            setUser({
              id: session.user.id,
              email: session.user.email!,
              role: profile?.role || 'user',
              name: profile?.name,
            });
          } catch (profileError) {
            console.error('Error fetching profile:', profileError);
            // Set user even if profile fetch fails
            setUser({
              id: session.user.id,
              email: session.user.email!,
              role: 'user',
              name: undefined,
            });
          }
        }
      } catch (error) {
        console.error('Error verificando sesión:', error);
      } finally {
        setLoading(false);
      }
    };

    // Check session first
    checkSession();

    // Setup auth state listener after initial check
    try {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              setUser({
                id: session.user.id,
                email: session.user.email!,
                role: profile?.role || 'user',
                name: profile?.name,
              });
            } catch (profileError) {
              console.error('Error fetching profile:', profileError);
              setUser({
                id: session.user.id,
                email: session.user.email!,
                role: 'user',
                name: undefined,
              });
            }
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      );

      subscription = authListener.subscription;
    } catch (error) {
      console.error('Error setting up auth listener:', error);
    }

    // Cleanup function - always runs, only unsubscribes if subscription exists
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
  };

  const register = async (email: string, password: string, userData: Partial<User>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      // Crear perfil de usuario
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          role: userData.role || 'user',
          name: userData.name,
        });

      if (profileError) {
        throw profileError;
      }
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 