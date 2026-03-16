import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Film, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 text-blue-600 mb-4">
            <Film size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow">Forgot Password</h1>
          <p className="text-white/70 mt-2">We'll send you a reset link</p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-700 font-medium">Check your inbox!</p>
              <p className="text-slate-500 text-sm">If an account exists for <strong>{email}</strong>, we sent a password reset link. It expires in 1 hour.</p>
              <Link to="/login" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mt-2">
                <ArrowLeft size={16}/> Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                  placeholder="you@gmail.com"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <Link to="/login" className="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
                <ArrowLeft size={15}/> Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
