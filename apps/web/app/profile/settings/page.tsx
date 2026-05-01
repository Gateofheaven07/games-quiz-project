'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, getAuthClient, logout, token, refreshToken } = useAuth();

  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [profileForm, setProfileForm] = useState({ username: '', email: '', avatar: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) {
      setProfileForm({ username: user.username || '', email: user.email || '', avatar: user.avatar || '' });
    }
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm(p => ({ ...p, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); setSuccessMsg(''); setErrorMsg('');
    try {
      const client = getAuthClient();
      const res = await client.put('/users/profile', {
        username: profileForm.username,
        email: profileForm.email,
        avatar: profileForm.avatar,
      });
      const updated = res.data?.data;
      if (updated && token) {
        const newUser = { ...user, ...updated };
        localStorage.setItem('auth', JSON.stringify({ user: newUser, token, refreshToken }));
        setSuccessMsg('Profil berhasil diperbarui!');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal memperbarui profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); setSuccessMsg(''); setErrorMsg('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMsg('Kata sandi tidak cocok'); setIsSaving(false); return;
    }
    if (passwordForm.newPassword.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter'); setIsSaving(false); return;
    }
    try {
      const client = getAuthClient();
      await client.put('/users/profile', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccessMsg('Kata sandi berhasil diubah!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal mengubah kata sandi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => { logout(); router.push('/'); };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#090f12]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#00d1ff]" />
    </div>
  );
  if (!isAuthenticated || !user) return null;

  const avatarLetter = (profileForm.username || user.username || 'O').charAt(0).toUpperCase();

  return (
    <div className="layout-container" style={{ backgroundColor: 'var(--c-bg, #090f12)', fontFamily: "'Inter', sans-serif", color: '#dde3e7' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        
        .layout-container { display: flex; min-height: 100vh; flex-direction: column; }
        .sidebar { display: none; }
        .mobile-nav { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; z-index: 50; backdrop-filter: blur(10px); }
        .main-content { flex: 1; padding: 20px; overflow-y: auto; }
        
        @media (min-width: 768px) {
          .layout-container { flex-direction: row; }
          .sidebar { display: flex; width: 260px; min-width: 260px; flex-direction: column; padding: 24px 16px; gap: 4px; background: rgba(255,255,255,0.03); border-right: 1px solid rgba(255,255,255,0.08); }
          .mobile-nav { display: none; }
          .main-content { padding: 40px; }
        }

        .settings-input {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px; padding: 12px 16px; color: #dde3e7; font-size: 0.9375rem;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
        }
        .settings-input:focus { border-color: #00d1ff; box-shadow: 0 0 0 3px rgba(0,209,255,0.15); }
        .settings-input::placeholder { color: #556e78; }
        .settings-label { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #859399; margin-bottom: 6px; display: block; }
        .tab-btn { padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.8125rem; letter-spacing: 0.05em; text-transform: uppercase; border: none; cursor: pointer; transition: all 0.2s; }
        .tab-btn.active { background: linear-gradient(135deg, #00d1ff22, #cf5cff22); color: #00d1ff; border: 1px solid #00d1ff44; }
        .tab-btn:not(.active) { background: transparent; color: #556e78; }
        .save-btn { width: 100%; padding: 14px; border-radius: 10px; background: linear-gradient(135deg, #00d1ff, #cf5cff); color: #0e1417; font-weight: 800; font-size: 0.8125rem; letter-spacing: 0.1em; text-transform: uppercase; border: none; cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
        .save-btn:hover { opacity: 0.9; }
        .save-btn:active { transform: scale(0.98); }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .nav-item-s { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 10px; font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; text-decoration: none; color: #556e78; transition: all 0.2s; }
        .nav-item-s:hover { background: rgba(255,255,255,0.06); color: #dde3e7; }
        .nav-item-s.active { background: rgba(0,209,255,0.1); color: #00d1ff; border-right: 3px solid #00d1ff; }
      `}</style>

      <div className="mobile-nav">
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 700, background: 'linear-gradient(135deg, #00d1ff, #cf5cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em', margin: 0 }}>
          ⚡ QuizBattle
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ background: 'transparent', border: 'none', color: '#dde3e7', cursor: 'pointer' }}>
          <span className="material-symbols-rounded">{isMobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {isMobileMenuOpen && (
        <div style={{ position: 'absolute', top: 60, left: 0, right: 0, background: '#090f12', borderBottom: '1px solid rgba(255,255,255,0.08)', zIndex: 40, display: 'flex', flexDirection: 'column', padding: 16, gap: 8 }}>
          {[
            { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },
            { icon: 'swords', label: 'Arena Pertempuran', href: '/game' },
            { icon: 'sports_esports', label: 'Arkade', href: '/game/crossword' },
            { icon: 'group', label: 'Teman', href: '/friends' },
            { icon: 'leaderboard', label: 'Peringkat', href: '/leaderboard' },
            { icon: 'person', label: 'Profil', href: '/profile' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="nav-item-s">
              <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <a className="nav-item-s active">
            <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>settings</span>
            Pengaturan
          </a>
          <button onClick={handleLogout} className="nav-item-s" style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#ffb4ab', width: '100%', marginTop: 4 }}>
            <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>logout</span>
            Keluar
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ marginBottom: 32, paddingInline: 8 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(135deg, #00d1ff, #cf5cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
            ⚡ QuizBattle
          </h1>
          <p style={{ color: '#556e78', marginTop: 4, fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>Tactical Game Arena</p>
        </div>

        {/* Avatar chip */}
        <div style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
          {profileForm.avatar ? (
            <img src={profileForm.avatar} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #00d1ff' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #00d1ff, #cf5cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#003543' }}>
              {avatarLetter}
            </div>
          )}
          <div>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: '#dde3e7' }}>{user.username}</p>
            <span style={{ fontSize: '0.6875rem', color: '#00d1ff', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Operator</span>
          </div>
        </div>

        {[
          { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },
          { icon: 'swords', label: 'Arena Pertempuran', href: '/game' },
          { icon: 'sports_esports', label: 'Arkade', href: '/game/crossword' },
          { icon: 'group', label: 'Teman', href: '/friends' },
          { icon: 'leaderboard', label: 'Peringkat', href: '/leaderboard' },
          { icon: 'person', label: 'Profil', href: '/profile' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="nav-item-s">
            <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div style={{ flex: 1 }} />

        <a className="nav-item-s active">
          <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>settings</span>
          Pengaturan
        </a>
        <button onClick={handleLogout} className="nav-item-s" style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#ffb4ab', width: '100%', marginTop: 4 }}>
          <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>logout</span>
          Keluar
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Page Header */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00d1ff', marginBottom: 6 }}>⚙ Pengaturan Akun</p>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#dde3e7', letterSpacing: '-0.01em', marginBottom: 4 }}>Edit Profil</h2>
            <p style={{ color: '#556e78', fontSize: '0.9375rem' }}>Kelola identitas operator, avatar, dan kredensial keamanan Anda.</p>
          </div>

          {/* Avatar Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 28 }}>
            <div style={{ position: 'relative' }}>
              {profileForm.avatar ? (
                <img src={profileForm.avatar} alt="avatar preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #00d1ff', boxShadow: '0 0 20px rgba(0,209,255,0.3)' }}
                  onError={(e: any) => { e.target.style.display = 'none'; }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #00d1ff, #cf5cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: '#003543', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 0 20px rgba(0,209,255,0.3)' }}>
                  {avatarLetter}
                </div>
              )}
            </div>
            <div>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: '#dde3e7' }}>{profileForm.username || user.username}</p>
              <p style={{ color: '#556e78', fontSize: '0.875rem', marginTop: 4 }}>{profileForm.email || user.email}</p>
              <p style={{ fontSize: '0.6875rem', color: '#859399', marginTop: 8 }}>Unggah gambar di bawah untuk mengubah foto avatar Anda.</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button className={`tab-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => { setTab('profile'); setSuccessMsg(''); setErrorMsg(''); }}>
              Info Profil
            </button>
            <button className={`tab-btn ${tab === 'password' ? 'active' : ''}`} onClick={() => { setTab('password'); setSuccessMsg(''); setErrorMsg(''); }}>
              Ubah Kata Sandi
            </button>
          </div>

          {/* Messages */}
          {successMsg && (
            <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(74,255,145,0.08)', border: '1px solid rgba(74,255,145,0.3)', borderRadius: 10, color: '#4aff91', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>check_circle</span>
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 10, color: '#ffb4ab', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>error</span>
              {errorMsg}
            </div>
          )}

          {/* Profile Tab */}
          {tab === 'profile' && (
            <form onSubmit={handleProfileSave} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="settings-label">Callsign (Username)</label>
                <input className="settings-input" value={profileForm.username} onChange={e => setProfileForm(p => ({ ...p, username: e.target.value }))} placeholder="Your username" />
              </div>
              <div>
                <label className="settings-label">Identifikasi (Email)</label>
                <input className="settings-input" type="email" value={profileForm.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <div>
                <label className="settings-label">Foto Profil (opsional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="file" accept="image/*" id="avatar-upload" style={{ display: 'none' }} onChange={handleImageUpload} />
                  <label htmlFor="avatar-upload" className="settings-input" style={{ cursor: 'pointer', textAlign: 'center', width: 'auto', display: 'inline-block', marginBottom: 0 }}>
                    Pilih File
                  </label>
                  {profileForm.avatar && profileForm.avatar.length > 200 && <span style={{ fontSize: '0.75rem', color: '#00d1ff', fontWeight: 'bold' }}>Gambar dipilih ✓</span>}
                </div>
                <p style={{ color: '#556e78', fontSize: '0.75rem', marginTop: 6 }}>Unggah gambar dari perangkat Anda (JPG, PNG, WebP)</p>
              </div>
              <button type="submit" className="save-btn" disabled={isSaving} style={{ marginTop: 8 }}>
                {isSaving ? 'Menyimpan...' : '💾 Simpan Profil'}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {tab === 'password' && (
            <form onSubmit={handlePasswordSave} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="settings-label">Kata Sandi Saat Ini</label>
                <input className="settings-input" type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} placeholder="••••••••" />
              </div>
              <div>
                <label className="settings-label">Kata Sandi Baru</label>
                <input className="settings-input" type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="Minimal 6 karakter" />
              </div>
              <div>
                <label className="settings-label">Konfirmasi Kata Sandi Baru</label>
                <input className="settings-input" type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="••••••••" />
              </div>
              <button type="submit" className="save-btn" disabled={isSaving} style={{ marginTop: 8 }}>
                {isSaving ? 'Mengubah...' : '🔒 Ubah Kata Sandi'}
              </button>
            </form>
          )}

          {/* Back link */}
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <Link href="/dashboard" style={{ color: '#556e78', fontSize: '0.8125rem', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.05em' }}>
              ← Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
