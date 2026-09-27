'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function CuboDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    if (id) fetchItemDetail()
  }, [id])

  async function fetchItemDetail() {
    setLoading(true)
    const { data } = await supabase
      .from('items')
      .select('*, models(*, brands(*), categories(*))')
      .eq('id', id)
      .single()

    if (data) {
      console.log('Objeto completo del cubo:', data) // Útil para verificar columnas en F12
      setItem(data)
    }
    setLoading(false)
  }

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Cargando...</div>
  if (!item) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">No encontrado.</div>

  // Recopilar imágenes para la galería
  const images = []
  if (item.images && Array.isArray(item.images)) images.push(...item.images)
  if (item.image_url) images.push(item.image_url)
  const uniqueImages = Array.from(new Set(images))

  const nextImage = () => {
    if (uniqueImages.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % uniqueImages.length)
    }
  }

  const prevImage = () => {
    if (uniqueImages.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + uniqueImages.length) % uniqueImages.length)
    }
  }

  // Comprueba varias opciones posibles para el nombre de las notas en la BD
  const notasPersonales = item.personal_notes || item.notes || item.notas || item.personal_note

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl mb-4">
        <button 
          onClick={() => router.push('/')}
          className="text-xs font-bold text-slate-400 hover:text-white transition flex items-center gap-1"
        >
          ← Volver al catálogo
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-8 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* COLUMNA IZQUIERDA: MINI GALERÍA CON FLECHAS */}
        <div className="space-y-4">
          <div className="bg-black aspect-square rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 relative group">
            {uniqueImages.length > 0 ? (
              <>
                <img 
                  src={uniqueImages[currentImageIndex]} 
                  alt={item.models?.name} 
                  className="max-h-full max-w-full object-contain"
                />

                {/* Flechas de desplazamiento */}
                {uniqueImages.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute left-3 bg-slate-800/80 hover:bg-slate-700 text-white w-9 h-9 rounded-full flex items-center justify-center transition shadow-md"
                    >
                      ‹
                    </button>
                    <button 
                      onClick={nextImage}
                      className="absolute right-3 bg-slate-800/80 hover:bg-slate-700 text-white w-9 h-9 rounded-full flex items-center justify-center transition shadow-md"
                    >
                      ›
                    </button>
                  </>
                )}

                {/* Indicador numérico */}
                <div className="absolute bottom-3 bg-slate-900/80 px-3 py-1 rounded-full text-xs font-bold text-slate-300">
                  {currentImageIndex + 1} / {uniqueImages.length}
                </div>
              </>
            ) : (
              <div className="text-slate-600 text-xs">Sin imagen</div>
            )}
          </div>

          {/* Miniaturas inferiores */}
          {uniqueImages.length > 1 && (
            <div className="flex gap-2 justify-center overflow-x-auto py-1">
              {uniqueImages.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition shrink-0 ${currentImageIndex === idx ? 'border-emerald-500 scale-105' : 'border-slate-800 opacity-60'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: INFORMACIÓN */}
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {item.models?.brands?.name || 'MARCA'}
              </span>
              <h1 className="text-2xl font-black text-white mt-0.5">
                {item.models?.name || 'Nombre del modelo'}
              </h1>
              {item.models?.categories?.name && (
                <span className="inline-block mt-2 bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-lg">
                  Categoría: {item.models.categories.name}
                </span>
              )}
            </div>
            {item.rating > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1">
                ⭐ {item.rating}/10
              </div>
            )}
          </div>

          {/* LISTA DE DATOS */}
          <div className="divide-y divide-slate-800 border-t border-b border-slate-800 py-2 text-sm">
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Estado del ejemplar</span>
              <span className="font-semibold text-slate-200">{item.condition || item.estado || 'No especificado'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Color Base</span>
              <span className="font-semibold text-emerald-400">{item.base_color || item.color_base || 'No especificado'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Precio estimado / compra</span>
              <span className="font-semibold text-emerald-400">{item.price ? `${item.price} €` : '-'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Año de compra</span>
              <span className="font-semibold text-slate-200">{item.purchase_year || '-'}</span>
            </div>
          </div>

          {/* NOTAS PERSONALES */}
          {notasPersonales && (
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">NOTAS PERSONALES</span>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
                {notasPersonales}
              </div>
            </div>
          )}

          {/* Botón de edición rápida */}
          <div className="pt-2">
            <Link 
              href={`/admin?edit=${item.id}`}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              ✏️ Editar cubo en Admin
            </Link>
          </div>

        </div>

      </div>
    </div>
  )
}