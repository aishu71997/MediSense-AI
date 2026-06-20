import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  getIdToken 
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { User } from '../types.ts';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  dbUser: User | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  synchronizedFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  compactMode: boolean;
  setCompactMode: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [compactMode, setCompactModeState] = useState<boolean>(false);

  // Sync compact mode initial preference
  useEffect(() => {
    const saved = localStorage.getItem('compactMode');
    if (saved === 'true') {
      setCompactModeState(true);
      document.documentElement.classList.add('compact-mode');
    }
  }, []);

  const setCompactMode = (val: boolean) => {
    setCompactModeState(val);
    localStorage.setItem('compactMode', String(val));
    if (val) {
      document.documentElement.classList.add('compact-mode');
    } else {
      document.documentElement.classList.remove('compact-mode');
    }
  };

  // Auto-observe Firebase Auth states
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          // Retrieve ID token
          const idToken = await getIdToken(user, true);
          setToken(idToken);
          setFirebaseUser(user);

          // Synchronize/Register user in PostgreSQL
          const res = await fetch('/api/me', {
            headers: {
              'Authorization': `Bearer ${idToken}`,
            },
          });

          if (res.ok) {
            const userData = await res.json();
            setDbUser(userData);
          } else {
            console.error('Failed to sync profile to Postgres database:', await res.text());
          }
        } catch (error) {
          console.error('Error synchronizing authenticated user profile:', error);
        }
      } else {
        setFirebaseUser(null);
        setDbUser(null);
        setToken(null);
      }
      setLoading(false);
    });
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Google credentials validation error:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setDbUser(null);
      setToken(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Error during logoff sequence:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper fetch function that automatically injects bearer credentials into API routes
  const synchronizedFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Default to application/json
    if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(input, {
      ...init,
      headers,
    });
  };

  return (
    <AuthContext.Provider value={{ 
      firebaseUser, 
      dbUser, 
      token, 
      loading, 
      loginWithGoogle, 
      logout,
      synchronizedFetch,
      compactMode,
      setCompactMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be housed inside an AuthProvider wrapper.');
  }
  return context;
};
