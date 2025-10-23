import { useState } from 'react';

import { useAuth } from './AuthContext.jsx';

export default function AuthForm({ onAuth }) {
  const { user, setUser, refresh } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // user comes from context now

  async function call(endpoint, body, method = 'POST') {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: method === 'POST' ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    // Basic validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const data = await call(endpoint, { email, password });
      setUser(data.user);
      onAuth?.(data.user);
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchMe = async () => {
    try {
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const logout = async () => {
    try {
      await call('/api/auth/logout', {});
      setUser(null);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-xl shadow border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {user ? 'Account' : mode === 'login' ? 'Welcome back' : 'Create account'}
      </h2>

      {user ? (
        <div className="space-y-4">
          <div className="text-gray-700">Signed in as <span className="font-medium">{user.email}</span></div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200" onClick={fetchMe} disabled={loading}>Refresh</button>
            <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={logout} disabled={loading}>Logout</button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
            <button type="button" className={`flex-1 py-2 rounded-md ${mode==='login'?'bg-white shadow':''}`} onClick={() => setMode('login')}>Login</button>
            <button type="button" className={`flex-1 py-2 rounded-md ${mode==='signup'?'bg-white shadow':''}`} onClick={() => setMode('signup')}>Sign up</button>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button type="submit" className="w-full py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      )}
    </div>
  );
}
