import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { GameProvider } from '../context/GameContext'
import { NotificationProvider } from '../context/NotificationContext'
import { GlobalInviteModal } from '../components/GlobalInviteModal'
import { Toaster } from '../components/ui/sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'QuizBattle — Arena Permainan Taktis',
  description: 'Uji kemampuanmu dengan pertempuran kuis taktis, teka-teki silang, dan Tetris. Bersaing dengan pemain di seluruh dunia di arena bertema siber kami.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="font-sans antialiased" style={{ backgroundColor: '#0e1417', color: '#dde3e7' }}>
        {/*
          GameProvider membungkus seluruh app agar socket singleton berjalan
          persisten — tidak terputus saat perpindahan rute (router.push).
        */}
        <GameProvider>
          <NotificationProvider>
            {children}
            <GlobalInviteModal />
            <Toaster position="top-right" richColors />
          </NotificationProvider>
        </GameProvider>
      </body>
    </html>
  )
}
