'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client' // Usar el alias '@/' previene errores de rutas relativas

const supabase = createClient()

export default function HomePage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [session, setSession] = useState<any>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [loading, setLoading] = useState(true)

  const [activeModalItem, setActiveModalItem] = useState<any | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    // Control de sesión robusto con onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      setSession(session)
    })

    // Comprobación inicial de sesión
    supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
      setSession(data.session)
    })

    loadData()

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  async function loadData() {
    setLoading(true)
    
    // Carga de marcas
    const { data: brandsData } = await supabase.from('brands').select('*').order('name')
    if (brandsData) setBrands(brandsData)

    // Carga de items con selector flexible (*)
    const { data: itemsData, error } = await supabase
      .from('items')
      .select(`
        *,
        models (
          *,
          brands (*)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando items:', error)
    } else if (itemsData) {
      const formatted = itemsData.map((item: any) => {
        let imgs: string[] = []
        
        // 1. Array 'images'
        if (Array.isArray(item.images) && item.images.length > 0) {
          imgs = item.images.filter(Boolean)
        }
        
        // 2. Campo 'image_url' (soporta saltos de línea o comas)
        if (item.image_url) {
          const extraImgs = item.image_url
            .split(/[\n,]+/)
            .map((u: string) => u.trim())
            .filter(Boolean)
          
          imgs = Array.from(new Set([...imgs, ...extraImgs]))
        }

        const categoryName = item.models?.category || item.models?.categories?.name || item.category || ''

        return {
          ...item,
          categoryName,
          images_list: imgs
        }
      })
      setItems(formatted)
      
      const uniqueCategories = Array.from(
        new Set(
          formatted
            .map((item: any) => item.categoryName?.trim())
            .filter(Boolean)
        )
      ) as string[]
      setCategories(uniqueCategories)
    }
    setLoading(false)
  }

  // ESTADÍSTICAS AMPLIADAS
  const totalCubes = items.length
  const totalInvestment = items.reduce((acc, item) => acc + (Number(item.price) || 0), 0)
  const averagePrice = totalCubes > 0 ? totalInvestment / totalCubes : 0
  const averageRating = totalCubes > 0 ? items.reduce((acc, item) => acc + (Number(item.rating) || 0), 0) / totalCubes : 0
  const mostValuableItem = [...items].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))[0]
  const topRatedItems = [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5)

  // FILTRADO
  const filteredItems = items.filter((item: any) => {
    const modelName = item.models?.name?.toLowerCase() || ''
    const brandName = item.models?.brands?.name?.toLowerCase() || ''
    const itemNotes = item.notes?.toLowerCase() || ''
    const baseColor = (item.base_color || item.plastic_color || '').toLowerCase()
    const query = searchQuery.toLowerCase()

    const matchesSearch = modelName.includes(query) || brandName.includes(query) || itemNotes.includes(query) || baseColor.includes(query)
    const matchesBrand = selectedBrand ? item.models?.brands?.name === selectedBrand : true
    const matchesCategory = selectedCategory 
      ? item.categoryName?.trim().toLowerCase() === selectedCategory.trim().toLowerCase() 
      : true

    return matchesSearch && matchesBrand && matchesCategory
  })

  // ORDENACIÓN
  const sortedAndFilteredItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    }
    if (sortBy === 'rating-desc') {
      return (b.rating || 0) - (a.rating || 0)
    }
    if (sortBy === 'price-desc') {
      return (Number(b.price) || 0) - (Number(a.price) || 0)
    }
    if (sortBy === 'price-asc') {
      return (Number(a.price) || 0) - (Number(b.price) || 0)
    }
    return 0
  })

  const openModal = (item: any) => {
    setActiveModalItem(item)
    setActiveImageIndex(0)
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 min-h-screen relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-zinc-800 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <img 
            src="/logo.png" 
            alt="Cubes&Stuff" 
            className="h-12 md:h-14 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const fallback = document.getElementById('title-fallback')
              if (fallback) fallback.style.display = 'block'
            }}
          />
          <div id="title-fallback" style={{ display: 'none' }}>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Cubes&Stuff</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Mi colección personal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <Link 
              href="/admin" 
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center gap-2"
            >
              <span>⚙️ Panel Admin</span>
            </Link>
          ) : (
            <Link 
              href="/login" 
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>

      {/* PANEL DE ESTADÍSTICAS AMPLIADAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs text-zinc-500 uppercase font-bold block mb-1">Resumen Colección</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{totalCubes}</span>
            <span className="text-xs text-zinc-400">cubos registrados</span>
          </div>
          <div className="text-xs text-emerald-400 font-semibold mt-1">
            Inversión: {totalInvestment.toFixed(2)} €
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs text-zinc-500 uppercase font-bold block mb-1">Medias Globales</span>
          <div className="text-sm font-bold text-zinc-200 mt-1">
            Precio medio: <span className="text-emerald-400">{averagePrice.toFixed(2)} €</span>
          </div>
          <div className="text-sm font-bold text-zinc-200 mt-1">
            Nota media: <span className="text-amber-400">{averageRating.toFixed(1)} / 10</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs text-zinc-500 uppercase font-bold block mb-1">Cubo Más Valioso</span>
          {mostValuableItem ? (
            <div className="truncate mt-1">
              <span className="text-xs font-bold text-white block truncate">{mostValuableItem.models?.name || 'Sin nombre'}</span>
              <span className="text-xs font-extrabold text-emerald-400">{mostValuableItem.price} €</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">Sin datos</span>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <span className="text-xs text-zinc-500 uppercase font-bold block mb-1">Top 5 Mejor Valorados</span>
          <div className="flex flex-wrap gap-1">
            {topRatedItems.length > 0 ? (
              topRatedItems.map((item, idx) => (
                <span 
                  key={item.id} 
                  onClick={() => openModal(item)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer transition truncate max-w-[130px]"
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

      {/* FILTROS Y ORDENACIÓN (4 Columnas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div>
          <input
            type="text"
            placeholder="Buscar por texto, modelo, color..."
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
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-600 shadow-inner"
          >
            <option value="newest">Más recientes primero</option>
            <option value="oldest">Más antiguos primero</option>
            <option value="rating-desc">Mejor valorados (★)</option>
            <option value="price-desc">Mayor precio</option>
            <option value="price-asc">Menor precio</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500 text-sm">Cargando colección...</div>
      ) : sortedAndFilteredItems.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-400 text-sm shadow-xl">
          No se ha encontrado ningún cubo con esos filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedAndFilteredItems.map((item) => {
            const mainImg = item.images_list[0] || null
            const colorBase = item.base_color || item.plastic_color

            return (
              <div 
                key={item.id} 
                onClick={() => openModal(item)}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-zinc-600 transition cursor-pointer group"
              >
                <div>
                  <div className="h-48 bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                    {mainImg ? (
                      <img 
                        src={mainImg} 
                        alt={item.models?.name || 'Cubo'} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <span className="text-zinc-700 text-xs font-semibold">Sin imagen</span>
                    )}
                    {item.categoryName && (
                      <span className="absolute top-3 right-3 bg-zinc-900/80 backdrop-blur-md text-zinc-200 text-[10px] font-bold px-2.5 py-1 rounded-full border border-zinc-700">
                        {item.categoryName}
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
                      {colorBase && (
                        <span className="bg-zinc-800/80 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-emerald-900/40">
                          🎨 {colorBase}
                        </span>
                      )}
                      {item.purchase_year && (
                        <span className="bg-zinc-800/80 text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                          {item.purchase_year}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 flex items-center justify-between border-t border-zinc-800/60 mt-auto pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 text-xs">★</span>
                    <span className="text-xs font-bold text-white">{item.rating || 0}/10</span>
                  </div>
                  {item.price !== null && item.price !== undefined && (
                    <span className="text-xs font-bold text-emerald-400">
                      {item.price} €
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL DETALLE / GALERÍA */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            <button 
              onClick={() => setActiveModalItem(null)}
              className="absolute top-3 right-3 z-20 bg-zinc-950/80 hover:bg-zinc-800 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border border-zinc-700 transition shadow-lg"
            >
              ✕
            </button>

            {/* ZONA DE FOTOS COMPACTA */}
            <div className="w-full h-56 sm:h-72 bg-zinc-950 relative flex items-center justify-center overflow-hidden flex-shrink-0 group">
              {activeModalItem.images_list && activeModalItem.images_list.length > 0 ? (
                <>
                  <img 
                    src={activeModalItem.images_list[activeImageIndex]} 
                    alt={activeModalItem.models?.name} 
                    className="w-full h-full object-contain p-2 transition-all duration-300"
                  />

                  {activeModalItem.images_list.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveImageIndex((prev) => (prev === 0 ? activeModalItem.images_list.length - 1 : prev - 1))
                        }}
                        className="absolute left-3 bg-zinc-900/90 hover:bg-zinc-800 text-white w-8 h-8 rounded-full flex items-center justify-center border border-zinc-700 transition shadow-lg text-base font-bold"
                      >
                        ‹
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveImageIndex((prev) => (prev === activeModalItem.images_list.length - 1 ? 0 : prev + 1))
                        }}
                        className="absolute right-3 bg-zinc-900/90 hover:bg-zinc-800 text-white w-8 h-8 rounded-full flex items-center justify-center border border-zinc-700 transition shadow-lg text-base font-bold"
                      >
                        ›
                      </button>
                      <span className="absolute bottom-2 bg-zinc-950/80 text-zinc-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-zinc-800">
                        {activeImageIndex + 1} / {activeModalItem.images_list.length}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-zinc-600 text-xs">Sin imagen disponible</span>
              )}

              {activeModalItem.categoryName && (
                <span className="absolute top-3 left-3 bg-zinc-900/90 text-zinc-200 text-xs font-bold px-2.5 py-1 rounded-full border border-zinc-700">
                  {activeModalItem.categoryName}
                </span>
              )}
            </div>

            {/* MINIATURAS DE NAVEGACIÓN */}
            {activeModalItem.images_list && activeModalItem.images_list.length > 1 && (
              <div className="flex gap-2 p-2 bg-zinc-950 border-b border-zinc-800 overflow-x-auto justify-center">
                {activeModalItem.images_list.map((imgUrl: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-10 h-10 rounded-lg overflow-hidden border flex-shrink-0 transition ${activeImageIndex === idx ? 'border-emerald-500 scale-105' : 'border-zinc-800 opacity-60 hover:opacity-100'}`}
                  >
                    <img src={imgUrl} alt="Miniatura" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* DETALLES DEL CUBO */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-0.5">
                    {activeModalItem.models?.brands?.name || 'Marca'}
                  </div>
                  <h2 className="text-xl font-extrabold text-white">
                    {activeModalItem.models?.name}
                  </h2>
                </div>

                {session && (
                  <a
                    href={`/admin?edit=${activeModalItem.id}`}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer"
                  >
                    ✏️ Editar cubo
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-zinc-950/50 p-3.5 rounded-2xl border border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Estado</span>
                  <span className="text-xs font-semibold text-zinc-200">{activeModalItem.condition || 'N/D'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Color Base</span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {activeModalItem.base_color || activeModalItem.plastic_color || 'N/D'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Valoración</span>
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                    ★ {activeModalItem.rating || 0}/10
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Precio</span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {activeModalItem.price !== null && activeModalItem.price !== undefined ? `${activeModalItem.price} €` : 'N/D'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Año Compra</span>
                  <span className="text-xs font-semibold text-zinc-200">{activeModalItem.purchase_year || 'N/D'}</span>
                </div>
              </div>

              {activeModalItem.notes && (
                <div>
                  <h4 className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Notas Personales</h4>
                  <p className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded-xl border border-zinc-800 leading-relaxed whitespace-pre-wrap">
                    {activeModalItem.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setActiveModalItem(null)}
                className="px-5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition"
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