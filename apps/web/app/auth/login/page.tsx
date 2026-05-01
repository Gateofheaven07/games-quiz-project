'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, error } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!formData.email || !formData.password) {
      setLocalError('Harap isi semua kolom');
      return;
    }

    const result = await login(formData.email, formData.password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setLocalError(result.error || 'Login gagal');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-20 bg-[#090f12] text-[#dde3e7] font-sans selection:bg-[#00d1ff]/30">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00d1ff]/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#cf5cff]/10 blur-[120px] rounded-full"></div>
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAlRcgUxa3ii_NiSemyYTATZdxkY8hVsG8tYrDMI-5f4i-OSMvdwmNeArzA8YTnYMiHAcRoU2AvtawIzxNKCVUykPvDuvxZlEzvzqBEu3YbgZb0Xiueilikt8q-Bjvoa0Iet5LbSrzPITyl4YVx0VqD95aQbJKyqLOAtUUnYhhhAGoUGwI-U3rr4VXVCiM4BFSepr9RGcf73oqEyvQoaDUFeroqwbm36JiIdqgdB4dP-gX7GjAYLw1C-j09glY27HGwFHqSp7TTghY')" }}></div>
      
      {/* Main Content Wrapper */}
      <div className="relative z-10 w-full max-w-[1100px] grid md:grid-cols-2 gap-12 items-center">
        {/* Branding/Value Prop Section */}
        <div className="hidden md:flex flex-col space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-[#00d1ff] to-[#cf5cff] rounded-xl flex items-center justify-center neon-glow-primary icon-box">
              <span className="material-symbols-outlined text-[#0e1417] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>
            </div>
            <span className="font-bold text-4xl text-[#a4e6ff] tracking-tighter italic">QuizBattle</span>
          </div>
          <h1 className="font-bold text-5xl text-[#dde3e7] leading-tight">
            MASUK KE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d1ff] to-[#cf5cff]">ARENA.</span>
          </h1>
          <p className="text-lg text-[#bbc9cf] max-w-md">
            Bergabunglah dalam pertukaran pengetahuan taktis terbaik. Tingkatkan peringkat, kuasai leaderboard, dan buktikan keunggulan kognitifmu.
          </p>
          <div className="pt-12 grid grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-xl">
              <div className="text-[#a4e6ff] font-bold text-xs uppercase tracking-widest mb-1">PEMAIN AKTIF</div>
              <div className="font-semibold text-2xl">12.4K+</div>
            </div>
            <div className="glass-panel p-6 rounded-xl">
              <div className="text-[#ecb2ff] font-bold text-xs uppercase tracking-widest mb-1">HADIAH SAAT INI</div>
              <div className="font-semibold text-2xl">$2.500</div>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <div className="w-full">
          <div className="glass-panel p-10 rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Subtle Header for Mobile */}
            <div className="md:hidden flex flex-col items-center mb-12">
              <span className="font-bold text-3xl text-[#a4e6ff] tracking-tighter italic mb-2">QuizBattle</span>
              <h2 className="font-semibold text-2xl text-[#dde3e7]">Login Operator</h2>
            </div>
            <div className="mb-12 hidden md:block">
              <h2 className="font-bold text-3xl text-[#dde3e7]">Akses Operator</h2>
              <p className="text-[#bbc9cf]">Inisialisasi sesi Anda untuk melanjutkan pertempuran.</p>
            </div>

            {/* Social Login */}
            <button className="w-full glass-panel py-3 px-6 rounded-lg flex items-center justify-center gap-2 font-bold text-xs tracking-widest hover:bg-white/10 transition-all duration-300 group border-white/5 uppercase">
              <img alt="Google Logo" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnuejLyVtsbzUOgEj7wcmB-fOqIUnrptC45hqrzOE3UetoaXmFpismcZo-lAdcZHoyM0-kyBu-NAWR5BD7VFs7NNw_BWmhHl1gA-CYZaFHjPThV0vnQEqVZ83jOZrDF0DeeigSEF_5usUgx56TYhCsA04fPVFNyqOKXEpTUZdjypLvL1yrzfzvWkHyrVt-b4ual0US4Lp2e255OoJyiHS6cUku862Q50ynXEDYE8P7zALehX2qMhdk_vqD-_kOangqlDZ2HhOxczc" />
              <span>Lanjutkan dengan Google</span>
            </button>

            <div className="relative my-8 flex items-center">
              <div className="flex-grow border-t border-[#3c494e]/30"></div>
              <span className="px-2 font-bold text-xs tracking-widest text-[#859399]">ATAU LOGIN AMAN</span>
              <div className="flex-grow border-t border-[#3c494e]/30"></div>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="font-bold text-xs tracking-widest text-[#bbc9cf] ml-1">IDENTIFIKASI (EMAIL)</label>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#859399] group-focus-within:text-[#00d1ff] transition-colors icon-box">
                    <span className="material-symbols-outlined text-xl">alternate_email</span>
                  </div>
                  <input 
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-[#1a2123]/50 border border-[#3c494e] rounded-lg py-4 pl-16 pr-6 text-[#dde3e7] focus:outline-none focus:border-[#00d1ff] focus:ring-1 focus:ring-[#00d1ff]/30 transition-all placeholder:text-[#859399]/50" 
                    placeholder="operator@battle.net" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="font-bold text-xs tracking-widest text-[#bbc9cf]">CIPHER (KATA SANDI)</label>
                  <Link href="#" className="text-[10px] font-bold tracking-widest text-[#a4e6ff] hover:text-[#b7eaff] transition-colors">LUPA?</Link>
                </div>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#859399] group-focus-within:text-[#00d1ff] transition-colors icon-box">
                    <span className="material-symbols-outlined text-xl">lock</span>
                  </div>
                  <input 
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-[#1a2123]/50 border border-[#3c494e] rounded-lg py-4 pl-16 pr-6 text-[#dde3e7] focus:outline-none focus:border-[#00d1ff] focus:ring-1 focus:ring-[#00d1ff]/30 transition-all placeholder:text-[#859399]/50" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              {(localError || error) && (
                <div className="bg-[#93000a]/30 border border-[#93000a] rounded p-3">
                  <p className="text-[#ffb4ab] text-sm">{localError || error}</p>
                </div>
              )}

              <div className="flex items-center gap-2 px-1">
                <input id="remember" type="checkbox" className="w-4 h-4 rounded border-[#3c494e] bg-[#242b2e] text-[#00d1ff] focus:ring-[#00d1ff] focus:ring-offset-[#0e1417]" />
                <label htmlFor="remember" className="font-bold tracking-widest text-[#bbc9cf] text-[11px] cursor-pointer">TETAP TERHUBUNG</label>
              </div>
              
              <div className="pt-2 space-y-3">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] py-5 rounded-lg font-bold text-xs tracking-widest text-[#0e1417] uppercase neon-glow-primary neon-glow-hover active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <span>{isLoading ? 'MENGINISIALISASI...' : 'INISIALISASI SESI'}</span>
                  <span className="material-symbols-outlined text-xl">login</span>
                </button>
                <Link href="/auth/register" className="block text-center w-full border border-[#00d1ff]/30 hover:bg-[#00d1ff]/10 py-6 rounded-lg font-bold text-xs tracking-widest text-[#a4e6ff] transition-all uppercase">
                  BUAT AKUN OPERATOR BARU
                </Link>
              </div>
            </form>

            {/* Footer Decorative */}
            <div className="mt-20 flex justify-between items-center opacity-40">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#00d1ff] rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-[#00d1ff]/50 rounded-full"></div>
                <div className="w-2 h-2 bg-[#00d1ff]/20 rounded-full"></div>
              </div>
              <span className="font-bold text-[10px] tracking-widest uppercase">Enkripsi Aktif: AES-256</span>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-12">
            <Link href="#" className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#dde3e7] transition-colors uppercase">STATUS: AKTIF</Link>
            <Link href="#" className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#dde3e7] transition-colors uppercase">PROTOKOL PRIVASI</Link>
            <Link href="#" className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#dde3e7] transition-colors uppercase">PUSAT BANTUAN</Link>
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
