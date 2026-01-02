
import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError("Login failed: " + err.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(isSignUp ? "Registration failed." : "Authentication failed.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="glass rounded-[2rem] p-8 md:p-12 w-full max-w-md animate-slide-up shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-4">
             <span className="text-[10px] font-bold text-cyan-400 tracking-[0.3em] uppercase">Reflex Engine v3.0</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">LIGHTNING</h1>
          <p className="text-slate-400 text-sm font-medium">초정밀 반응속도 경쟁 시스템</p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-wider">Account ID</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl text-white outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600 text-sm"
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-wider">Access Key</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl text-white outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600 text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-[0.98]"
          >
            {isSignUp ? '시스템 등록' : '데이터 동기화'}
          </button>
        </form>

        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-slate-500">
            <span className="bg-[#0f172a] px-3">or connect via</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="mt-6 w-full glass hover:bg-white/5 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-semibold text-slate-300 transition-all active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Google Authentication
        </button>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-6 text-slate-500 text-xs font-medium hover:text-cyan-400 transition-colors"
        >
          {isSignUp ? '이미 계정이 있나요? 로그인' : '시스템에 처음 접속하시나요? 계정 생성'}
        </button>

        {error && <p className="mt-6 text-rose-500 text-xs font-bold text-center animate-shake">{error}</p>}
      </div>
    </div>
  );
};

export default AuthView;
