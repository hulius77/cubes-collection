'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorMsg('Credenciales incorrectas o error de acceso.')
    } else {
      router.push('/admin')
      router.refresh()
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-24 min-h-screen flex flex-col justify-center">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Panel Privado</h1>
        <p className="text-xs text-zinc-400 text-center mb-6">Introduce tus datos para administrar la colección</p>
        
        {errorMsg && (
          <div className="mb-4 bg-red-950/50 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-600"
              required
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-600"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition text-sm shadow-lg"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition">
            ← Volver al sitio público
          </Link>
        </div>
      </div>
    </main>
  )
}