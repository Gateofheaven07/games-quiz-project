'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!formData.username || !formData.email || !formData.password) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    const result = await register(formData.username, formData.email, formData.password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setLocalError(result.error || 'Registration failed');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-20 bg-[#090f12] text-[#dde3e7] font-sans selection:bg-[#cf5cff]/30">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#cf5cff]/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00d1ff]/10 blur-[120px] rounded-full"></div>
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAlRcgUxa3ii_NiSemyYTATZdxkY8hVsG8tYrDMI-5f4i-OSMvdwmNeArzA8YTnYMiHAcRoU2AvtawIzxNKCVUykPvDuvxZlEzvzqBEu3YbgZb0Xiueilikt8q-Bjvoa0Iet5LbSrzPITyl4YVx0VqD95aQbJKyqLOAtUUnYhhhAGoUGwI-U3rr4VXVCiM4BFSepr9RGcf73oqEyvQoaDUFeroqwbm36JiIdqgdB4dP-gX7GjAYLw1C-j09glY27HGwFHqSp7TTghY')" }}></div>
      
      {/* Main Content Wrapper */}
      <div className="relative z-10 w-full max-w-[1100px] grid md:grid-cols-2 gap-12 items-center">
        {/* Branding/Value Prop Section */}
        <div className="hidden md:flex flex-col space-y-6">
          <div className="flex items-center gap-1">
            <div className="w-12 h-12 bg-gradient-to-br from-[#cf5cff] to-[#00d1ff] rounded-lg flex items-center justify-center neon-glow-hover">
              <span className="material-symbols-outlined text-[#0e1417] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
            </div>
            <span className="font-bold text-3xl text-[#ecb2ff] tracking-tighter italic">QuizBattle</span>
          </div>
          <h1 className="font-bold text-5xl text-[#dde3e7] leading-tight">
            BECOME AN <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#cf5cff] to-[#00d1ff]">OPERATOR.</span>
          </h1>
          <p className="text-lg text-[#bbc9cf] max-w-md">
            Initialize your profile to join the tactical knowledge exchange. Rank up, dominate leaderboards, and prove your cognitive superiority.
          </p>
          <div className="pt-12 grid grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-xl">
              <div className="text-[#a4e6ff] font-bold text-xs uppercase tracking-widest mb-1">NEW RECRUITS</div>
              <div className="font-semibold text-2xl">450+ Today</div>
            </div>
            <div className="glass-panel p-6 rounded-xl">
              <div className="text-[#ecb2ff] font-bold text-xs uppercase tracking-widest mb-1">GLOBAL RANKING</div>
              <div className="font-semibold text-2xl">Awaits You</div>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <div className="w-full">
          <div className="glass-panel p-10 rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Subtle Header for Mobile */}
            <div className="md:hidden flex flex-col items-center mb-12">
              <span className="font-bold text-3xl text-[#ecb2ff] tracking-tighter italic mb-2">QuizBattle</span>
              <h2 className="font-semibold text-2xl text-[#dde3e7]">Operator Registration</h2>
            </div>
            <div className="mb-12 hidden md:block">
              <h2 className="font-bold text-3xl text-[#dde3e7]">Operator Registration</h2>
              <p className="text-[#bbc9cf]">Initialize your new profile to enter combat.</p>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="font-bold text-xs tracking-widest text-[#bbc9cf] ml-1">CALLSIGN (USERNAME)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-[#859399] text-lg">badge</span>
                  <input 
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full bg-[#242b2e] border border-[#3c494e] rounded-lg py-3 pl-12 pr-6 text-[#dde3e7] focus:outline-none focus:border-[#cf5cff] transition-all" 
                    placeholder="Ghost007" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs tracking-widest text-[#bbc9cf] ml-1">IDENTIFICATION (EMAIL)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-[#859399] text-lg">alternate_email</span>
                  <input 
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-[#242b2e] border border-[#3c494e] rounded-lg py-3 pl-12 pr-6 text-[#dde3e7] focus:outline-none focus:border-[#cf5cff] transition-all" 
                    placeholder="operator@battle.net" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="font-bold text-xs tracking-widest text-[#bbc9cf] ml-1">CYPHER (PASSWORD)</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#859399] text-lg">lock</span>
                    <input 
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-[#242b2e] border border-[#3c494e] rounded-lg py-3 pl-10 pr-4 text-[#dde3e7] focus:outline-none focus:border-[#cf5cff] transition-all" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-xs tracking-widest text-[#bbc9cf] ml-1">CONFIRM CYPHER</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#859399] text-lg">lock_reset</span>
                    <input 
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full bg-[#242b2e] border border-[#3c494e] rounded-lg py-3 pl-10 pr-4 text-[#dde3e7] focus:outline-none focus:border-[#cf5cff] transition-all" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>
              </div>

              {(localError || error) && (
                <div className="bg-[#93000a]/30 border border-[#93000a] rounded p-3">
                  <p className="text-[#ffb4ab] text-sm">{localError || error}</p>
                </div>
              )}
              
              <div className="pt-4 space-y-3">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#cf5cff] to-[#00d1ff] py-6 rounded-lg font-bold text-xs tracking-widest text-[#0e1417] uppercase neon-glow-hover active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>{isLoading ? 'INITIALIZING...' : 'CREATE OPERATOR PROFILE'}</span>
                  <span className="material-symbols-outlined text-lg">person_add</span>
                </button>
                <Link href="/auth/login" className="block text-center w-full border border-[#cf5cff]/30 hover:bg-[#cf5cff]/10 py-6 rounded-lg font-bold text-xs tracking-widest text-[#ecb2ff] transition-all uppercase">
                  RETURN TO LOGIN
                </Link>
              </div>
            </form>

            {/* Footer Decorative */}
            <div className="mt-16 flex justify-between items-center opacity-40">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#cf5cff] rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-[#cf5cff]/50 rounded-full"></div>
                <div className="w-2 h-2 bg-[#cf5cff]/20 rounded-full"></div>
              </div>
              <span className="font-bold text-[10px] tracking-widest uppercase text-[#ecb2ff]">Encryption Active: AES-256</span>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 flex justify-center gap-12">
            <Link href="#" className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#dde3e7] transition-colors uppercase">STATUS: ONLINE</Link>
            <Link href="#" className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#dde3e7] transition-colors uppercase">PRIVACY PROTOCOL</Link>
            <Link href="#" className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#dde3e7] transition-colors uppercase">SUPPORT HUB</Link>
          </div>
        </div>
      </div>
      
      {/* Decorative Floating Image - Contextual */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[1228px] -z-10 opacity-30 mix-blend-overlay">
        <img alt="Gaming Background" className="w-full h-full object-cover grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDm2ab-JNTLpOZak88g5wLazEoLWAttmzgS_vG6759XdCDWOk4QYl4pthfA1XpA8Vd1KEJonNVtmDKDGlkTXkRoKq0oQlmLi47z8HDHYAwR1r8z79MIQuY0-N4ud_Z1ApFQiOnI_sMZImqPjHnVFQahcflJVnM5trRTHhJ1BeY0GNbXjhddNf2f7-2JhJHVj9RGXFAjs6VvipGFohV63TUeRALVfxIQZpaqUYrmP0DheAEvR2tIUv5cHCNajiA7YuQEyKZKNytzuuQ" />
      </div>
    </div>
  );
}
