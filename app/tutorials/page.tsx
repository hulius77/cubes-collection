'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function TutorialsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [tutorials, setTutorials] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [tRes, cRes] = await Promise.all([
      supabase.from('tutorials').select('*, categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name')
    ])

    setTutorials(tRes.data || [])
    setCategories(cRes.data || [])
    setLoading(false)
  }

  // Función para extraer el ID del vídeo de YouTube y convertirlo en formato embed
  function getYouTubeEmbedUrl(url: string) {
    if (!url) return ''
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null
  }

  // Filtrar tutoriales por categoría seleccionada
  const filteredTutorials = tutorials.filter(t => {
    if (!selectedCategory) return true
    return t.category_id === selectedCategory
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-6 flex items-center justify-between">
        <Link href="/">
          <img src="/logo.png" alt="Cubes & Stuff" className="h-16 w-auto object-contain" />
        </Link>
        <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition">
          ← Volver al catálogo
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black">📺 Videotutoriales de Resolución</h1>
            <p className="text-xs text-slate-400 mt-1">Aprende a resolver cada tipo y categoría de cubo</p>
          </div>

          {/* Menú de Filtros por Categoría */}
          <div className="flex flex-wrap gap-2 items-center">
            <button 
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${selectedCategory === '' ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
            >
              Todas ({tutorials.length})
            </button>
            {categories.map(c => {
              const count = tutorials.filter(t => t.category_id === c.id).length
              return (
                <button 
                  key={c.id} 
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${selectedCategory === c.id ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                >
                  {c.name} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* CUADRÍCULA DE VÍDEOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-500">Cargando tutoriales...</div>
          ) : filteredTutorials.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500 bg-slate-900/50 border border-slate-800 rounded-2xl">
              No hay tutoriales disponibles para esta categoría.
            </div>
          ) : (
            filteredTutorials.map(tutorial => {
              const embedUrl = getYouTubeEmbedUrl(tutorial.youtube_url)
              return (
                <div key={tutorial.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  <div className="aspect-video bg-black relative">
                    {embedUrl ? (
                      <iframe 
                        src={embedUrl} 
                        title={tutorial.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">URL de YouTube no válida</div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-grow space-y-3">
                    <div>
                      {tutorial.categories?.name && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                          {tutorial.categories.name}
                        </span>
                      )}
                      <h3 className="font-bold text-sm text-white mt-1.5">{tutorial.title}</h3>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </main>
    </div>
  )
}