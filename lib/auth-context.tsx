'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id?: number;
  nombre?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

function parseJWT(token: string): User {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      id: decoded.sub,
      email: decoded.email,
      nombre: decoded.nombre ?? decoded.name ?? decoded.email,
    };
  } catch {
    return {};
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      setUser(parseJWT(stored));
    }
  }, []);

  async function login(email: string, password: string) {
    const res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data: { access_token: string } = await res.json();
    const { access_token } = data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(parseJWT(access_token));
    router.push('/dashboard');
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
