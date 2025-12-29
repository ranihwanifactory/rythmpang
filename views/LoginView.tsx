
import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Flag, Play, Mail, LogIn, Snowflake } from 'lucide-react';

const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden bg-gradient-to-b from-blue-400 to-blue-600">
      {/* Floating Snowflakes */}
      <div className="absolute top-10 left-10 animate-bounce text-white/20"><Snowflake size={64} /></div>
      <div className="absolute bottom-20 right-20 animate-pulse text-white/20"><Snowflake size={120} /></div>

      <div className="z-10 text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <div className="p-6 bg-white rounded-full shadow-2xl animate-bounce">
            <span className="text-7xl">🐧</span>
          </div>
        </div>
        <h1 className="text-6xl md:text-7xl font-game tracking-wider text-white drop-shadow-[0_5px_0_rgba(30,58,138,1)]">
          SNOW DASH
        </h1>
        <p className="text-blue-100 mt-4 text-xl font-bold uppercase tracking-widest">Penguin Expedition Battle</p>
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-[40px] shadow-2xl border border-white/20 space-y-6">
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email Address" 
            className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white placeholder-blue-100 focus:outline-none focus:ring-4 focus:ring-white/50 transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white placeholder-blue-100 focus:outline-none focus:ring-4 focus:ring-white/50 transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button 
            type="submit" 
            className="w-full bg-white hover:bg-blue-50 transition-all text-blue-600 font-game text-2xl py-5 rounded-2xl shadow-xl active:scale-95"
          >
            {isRegister ? 'JOIN THE EXPEDITION' : 'START RACING'}
          </button>
        </form>

        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-transparent text-blue-200 uppercase font-bold">Or use google</span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-blue-900/40 text-white hover:bg-blue-900/60 transition-colors font-bold py-4 rounded-2xl flex items-center justify-center gap-2 border border-white/10"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          Google Quick Sign In
        </button>

        {error && <p className="text-red-200 text-center text-sm font-bold bg-red-500/20 p-2 rounded-xl">{error}</p>}

        <p className="text-center text-blue-100 text-sm">
          <button 
            onClick={() => setIsRegister(!isRegister)} 
            className="underline font-bold"
          >
            {isRegister ? 'Already have a penguin? Login' : 'New penguin? Create account'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginView;
