'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Loader2, Shield } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'candidate',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/register', formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      if (
        response.data.user.role === 'recruiter' ||
        response.data.user.role === 'admin'
      ) {
        router.push('/dashboard');
      } else {
        router.push('/jobs');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Shield className="w-8 h-8 text-[#4a9eff] mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-[#e5e5e5]">Register</h1>
          <p className="text-xs text-[#a3a3a3] mt-1">
            Create a new account to get started
          </p>
        </div>

        <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3 py-2 text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/30 rounded">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs text-[#a3a3a3] block mb-1">Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#4a9eff]"
              />
            </div>
            <div>
              <label className="text-xs text-[#a3a3a3] block mb-1">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#4a9eff]"
              />
            </div>
            <div>
              <label className="text-xs text-[#a3a3a3] block mb-1">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={6}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#4a9eff]"
              />
            </div>
            <div>
              <label className="text-xs text-[#a3a3a3] block mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:border-[#4a9eff]"
              >
                <option value="candidate">Candidate</option>
                <option value="recruiter">Recruiter</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 bg-[#4a9eff] text-white text-sm font-medium rounded-lg hover:bg-[#3b8de6] disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Registering...' : 'Register'}
            </button>
            <p className="text-center text-xs text-[#a3a3a3]">
              Already have an account?{' '}
              <Link href="/login" className="text-[#4a9eff] hover:underline">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
