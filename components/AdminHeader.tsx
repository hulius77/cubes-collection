'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navLinks = [
    { name: 'Cubos / Items', href: '/admin' },
    { name: 'Modelos', href: '/admin/models' },
    { name: 'Categorías', href: '/admin/categories' },
    { name: 'Marcas', href: '/admin/brands' },
  ]

  return (
    <header className="bg-slate-900 text-white shadow-md mb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / Título Admin */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              CubosAdmin
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
              Panel
            </span>
          </div>

          {/* Navegación Principal */}
          <nav className="hidden md:flex space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </nav>

          {/* Acciones Secundarias */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition border border-slate-700 flex items-center gap-1"
            >
              🌐 Web Pública ↗
            </Link>

            <button
              onClick={handleSignOut}
              className="text-xs bg-red-600/80 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-medium transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Navegación Móvil */}
        <div className="flex md:hidden overflow-x-auto border-t border-slate-800 py-2 space-x-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
                  isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 bg-slate-800'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}