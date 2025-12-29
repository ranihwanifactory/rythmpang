
import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 snow-bg">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-8 border-blue-100 transform transition-all hover:scale-[1.01]">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-blue-50 rounded-full mb-4 floating">
            <span className="text-6xl">🐧</span>
          </div>
          <h1 className="text-3xl font-bold text-blue-800">Antarctic Explorer</h1>
          <p className="text-blue-500">Join the expedition!</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Explorer Name"
              className="w-full px-4 py-3 rounded-xl border-2 border-blue-50 focus:border-blue-300 outline-none transition-all"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            className="w-full px-4 py-3 rounded-xl border-2 border-blue-50 focus:border-blue-300 outline-none transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Secret Code (Password)"
            className="w-full px-4 py-3 rounded-xl border-2 border-blue-50 focus:border-blue-300 outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all"
          >
            {isLogin ? 'Start Exploring' : 'Register Scout'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-2">
          <div className="flex-1 h-px bg-blue-100"></div>
          <span className="text-xs text-blue-300 font-bold uppercase">Or</span>
          <div className="flex-1 h-px bg-blue-100"></div>
        </div>

        <button
          onClick={handleGoogle}
          className="w-full bg-white border-2 border-blue-100 hover:bg-blue-50 text-blue-800 font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
          Google Sign In
        </button>

        <p className="text-center mt-6 text-sm text-blue-400">
          {isLogin ? "New scout?" : "Already a scout?"}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-bold hover:underline"
          >
            {isLogin ? 'Create Account' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};
