'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../lib/supabase/client'

export default function HomePage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)

  const [activeModalItem, setActiveModalItem] = useState<any | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    
    const { data: brandsData } = await supabase.from('brands').select('*').order('name')
    if (brandsData) setBrands(brandsData)

    const { data: itemsData, error } = await supabase
      .from('items')
      .select(`
        id,
        condition,
        rating,
        price,
        notes,
        purchase_year,
        image_url,
        images,
        models (
          name,
          category,
          brands (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando items:', error)
    } else if (itemsData) {
      setItems(itemsData)
      
      const uniqueCategories = Array.from(
        new Set(
          itemsData
            .map((item: any) => item.models?.category?.trim())
            .filter(Boolean)
        )
      ) as string[]
      setCategories(uniqueCategories)
    }
    setLoading(false)
  }

  // Cálculos estadísticos
  const totalCubes = items.length
  const totalInvestment = items.reduce((acc, item) => acc + (Number(item.price) || 0), 0)
  const topRatedItems = [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5)

  const filteredItems = items.filter((item: any) => {
    const modelName = item.models?.name?.toLowerCase() || ''
    const brandName = item.models?.brands?.name?.toLowerCase() || ''
    const itemNotes = item.notes?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()

    const matchesSearch = modelName.includes(query) || brandName.includes(query) || itemNotes.includes(query)
    const matchesBrand = selectedBrand ? item.models?.brands?.name === selectedBrand : true
    const matchesCategory = selectedCategory ? item.models?.category?.trim() === selectedCategory.trim() : true

    return matchesSearch && matchesBrand && matchesCategory
  })

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 min-h-screen relative">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-zinc-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Cubes&Stuff</h1>
          <p className="text-xs text-zinc-400 mt-1">Explora todos tus ejemplares guardados</p>
        </div>
        <Link 
          href="/admin" 
          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition shadow-lg"
        >
          ⚙️ Panel de Administración
        </Link>
      </div>

      {/* --- ESTADÍSTICAS BÁSICAS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs text-zinc-500 uppercase font-bold block mb-1">Total de Cubos</span>
          <span className="text-2xl font-extrabold text-white">{totalCubes}</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs text-zinc-500 uppercase font-bold block mb-1">Inversión Total</span>
          <span className="text-2xl font-extrabold text-emerald-400">{totalInvestment.toFixed(2)} €</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <span className="text-xs text-zinc-500 uppercase font-bold block mb-1">Top 5 Mejor Valorados</span>
          <div className="flex flex-wrap gap-1">
            {topRatedItems.length > 0 ? (
              topRatedItems.map((item, idx) => (
                <span 
                  key={item.id} 
                  onClick={() => { setActiveModalItem(item); setActiveImageIndex(0); }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer transition truncate max-w-[140px]"
                  title={`${item.models?.brands?.name} ${item.models?.name}`}
                >
                  {idx + 1}. {item.models?.name} ({item.rating}★)
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-500">Sin datos</span>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div>
          <input
            type="text"
            placeholder="Buscar por texto, notas, modelo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-600 shadow-inner"
          />
        </div>
        <div>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-600 shadow-inner"
          >
            <option value="">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-600 shadow-inner"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Listado */}
      {loading ? (
        <div className="text-center py-20 text-zinc-500 text-sm">Cargando colección...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-400 text-sm shadow-xl">
          No se ha encontrado ningún cubo con esos filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => { setActiveModalItem(item); setActiveImageIndex(0); }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-zinc-600 transition cursor-pointer group"
            >
              <div>
                <div className="h-48 bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.models?.name || 'Cubo'} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <span className="text-zinc-700 text-xs font-semibold">Sin imagen</span>
                  )}
                  {item.models?.category && (
                    <span className="absolute top-3 right-3 bg-zinc-900/80 backdrop-blur-md text-zinc-200 text-[10px] font-bold px-2.5 py-1 rounded-full border border-zinc-700">
                      {item.models.category}
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <div className="text-xs text-zinc-400 font-medium mb-1">
                    {item.models?.brands?.name || 'Marca desconocida'}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 leading-snug">
                    {item.models?.name || 'Modelo sin nombre'}
                  </h3>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {item.condition && (
                      <span className="bg-zinc-800/80 text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        {item.condition}
                      </span>
                    )}
                    {item.purchase_year && (
                      <span className="bg-zinc-800/80 text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        {item.purchase_year}
                      </span>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-3 bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/50">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-5 pb-5 pt-0 flex items-center justify-between border-t border-zinc-800/60 mt-auto pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400 text-xs">★</span>
                  <span className="text-xs font-bold text-white">{item.rating}/10</span>
                </div>
                {item.price !== null && item.price !== undefined && (
                  <span className="text-xs font-bold text-emerald-400">
                    {item.price} €
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL CON GALERÍA DE MÚLTIPLES FOTOS --- */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            <button 
              onClick={() => setActiveModalItem(null)}
              className="absolute top-4 right-4 z-10 bg-zinc-950/80 hover:bg-zinc-800 text-white w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border border-zinc-700 transition"
            >
              ✕
            </button>

            {/* Visualizador de Fotos Múltiples */}
            <div className="w-full h-72 sm:h-80 bg-zinc-950 relative flex items-center justify-center overflow-hidden flex-shrink-0">
              {(() => {
                const photos = activeModalItem.images && activeModalItem.images.length > 0 
                  ? activeModalItem.images 
                  : (activeModalItem.image_url ? [activeModalItem.image_url] : [])

                const currentPhoto = photos[activeImageIndex] || photos[0]

                return (
                  <>
                    {currentPhoto ? (
                      <img 
                        src={currentPhoto} 
                        alt={activeModalItem.models?.name} 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-zinc-600 text-sm">Sin imagen disponible</span>
                    )}

                    {photos.length > 1 && (
                      <div className="absolute bottom-4 flex gap-2 bg-zinc-950/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800">
                        {photos.map((_: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            className={`w-2.5 h-2.5 rounded-full transition ${activeImageIndex === idx ? 'bg-white scale-125' : 'bg-zinc-600'}`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}

              {activeModalItem.models?.category && (
                <span className="absolute top-4 left-4 bg-zinc-900/90 text-zinc-200 text-xs font-bold px-3 py-1 rounded-full border border-zinc-700">
                  {activeModalItem.models.category}
                </span>
              )}
            </div>

            {/* Detalles */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              <div>
                <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-1">
                  {activeModalItem.models?.brands?.name || 'Marca'}
                </div>
                <h2 className="text-2xl font-extrabold text-white">
                  {activeModalItem.models?.name}
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Estado</span>
                  <span className="text-sm font-semibold text-zinc-200">{activeModalItem.condition || 'N/D'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Valoración</span>
                  <span className="text-sm font-semibold text-amber-400 flex items-center gap-1">
                    ★ {activeModalItem.rating}/10
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Precio</span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {activeModalItem.price !== null ? `${activeModalItem.price} €` : 'N/D'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Año Compra</span>
                  <span className="text-sm font-semibold text-zinc-200">{activeModalItem.purchase_year || 'N/D'}</span>
                </div>
              </div>

              {activeModalItem.notes && (
                <div>
                  <h4 className="text-xs text-zinc-400 uppercase font-bold mb-2">Notas Personales</h4>
                  <p className="text-sm text-zinc-300 bg-zinc-950 p-4 rounded-xl border border-zinc-800 leading-relaxed whitespace-pre-wrap">
                    {activeModalItem.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setActiveModalItem(null)}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  )
}