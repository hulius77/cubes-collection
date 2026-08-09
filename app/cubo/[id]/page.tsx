'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase/client'

export default function CuboDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const supabase = createClient()

  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchItemDetail()
    }
  }, [id])

  async function fetchItemDetail() {
    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        models (
          name,
          release_year,
          brands ( name, country ),
          categories ( name )
        )
      `)
      .eq('id', id)
      .single()

    if (!error && data) {
      setItem(data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-xs">Cargando detalles...</div>
  }

  if (!item) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-xl font-bold text-white mb-2">Cubo no encontrado</h1>
        <p className="text-xs text-zinc-400 mb-6">El ejemplar que buscas no existe o ha sido eliminado.</p>
        <Link href="/" className="px-4 py-2 bg-zinc-800 text-white text-xs rounded-lg">← Volver al inicio</Link>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Botón para volver */}
      <div className="mb-8">
        <Link href="/" className="text-xs text-zinc-400 hover:text-white transition">
          ← Volver al catálogo
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl">
        {/* Imagen en grande */}
        <div className="w-full aspect-square bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
          {item.image_url ? (
            <img src={item.image_url} alt={item.models?.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl opacity-20">🧊</span>
          )}
        </div>

        {/* Datos detallados */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-4 mb-2">
              <div>
                <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  {item.models?.brands?.name} {item.models?.brands?.country ? `(${item.models.brands.country})` : ''}
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{item.models?.name}</h1>
              </div>
              <div className="bg-zinc-950 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/30 text-sm font-bold shadow-md shrink-0">
                ★ {item.rating}/10
              </div>
            </div>

            <div className="inline-block bg-zinc-800/60 text-zinc-300 text-xs px-2.5 py-1 rounded-md mb-6">
              Categoría: {item.models?.categories?.name || 'General'}
            </div>

            <div className="space-y-4 border-t border-zinc-800 pt-6 text-xs text-zinc-300">
              <div className="flex justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-500">Estado del ejemplar</span>
                <span className="font-medium text-white">{item.condition || 'No especificado'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-500">Precio estimado / compra</span>
                <span className="font-medium text-emerald-400">{item.price ? `${item.price} €` : 'No indicado'}</span>
              </div>
{item.purchase_year && (
  <div className="flex justify-between py-1 border-b border-zinc-800/40">
    <span className="text-zinc-500">Año de compra</span>
    <span className="font-medium text-white">{item.purchase_year}</span>
  </div>
)}
              <div className="flex justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-500">Año de lanzamiento</span>
                <span className="font-medium text-white">{item.models?.release_year || 'Desconocido'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-500">Añadido a la colección</span>
                <span className="font-medium text-white">{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {item.notes && (
              <div className="mt-6 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-400 uppercase mb-1">Notas personales</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">{item.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}