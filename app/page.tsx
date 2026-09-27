'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function PublicPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    loadPublicData()
  }, [])

  async function loadPublicData() {
    setLoading(true)
    const [bRes, cRes, iRes] = await Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('items').select('*, models(*, brands(*), categories(*))').order('created_at', { ascending: false })
    ])

    setBrands(bRes.data || [])
    setCategories(cRes.data || [])
    setItems(iRes.data || [])
    setLoading(false)
  }

  // CÁLCULOS ESTADÍSTICOS
  const totalCubos = items.length
  const inversionTotal = items.reduce((acc, item) => acc + (Number(item.price) || 0), 0)
  const precioMedio = totalCubos > 0 ? (inversionTotal / totalCubos).toFixed(2) : '0.00'
  const itemsWithRating = items.filter(i => i.rating > 0)
  const notaMedia = itemsWithRating.length > 0 ? (itemsWithRating.reduce((acc, i) => acc + Number(i.rating), 0) / itemsWithRating.length).toFixed(1) : '0.0'
  
  const top5 = [...items].filter(i => i.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 5)

  // FILTRADO Y ORDENACIÓN
  const filteredItems = items.filter(item => {
    const matchesSearch = item.models?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.models?.brands?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesBrand = selectedBrand ? item.models?.brand_id === selectedBrand : true
    const matchesCategory = selectedCategory ? item.models?.category_id === selectedCategory : true
    return matchesSearch && matchesBrand && matchesCategory
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price
    if (sortBy === 'price-desc') return b.price - a.price
    if (sortBy === 'rating') return b.rating - a.rating
    return 0 // Default 'newest'
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      
      {/* HEADER CON LOGO GRANDE */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-6 flex items-center justify-between">
        <Link href="/">
           <img src="/logo.png" alt="Cubes & Stuff" className="h-16 w-auto object-contain" />
        </Link>
<div className="flex items-center gap-3">
  <Link href="/tutorials" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-blue-900/20">
    📺 Tutoriales
  </Link>
  <Link href="/admin" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-900/20">
    ⚙️ Panel Admin
  </Link>
</div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* PANEL ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-bold uppercase text-slate-400">Resumen</span>
            <div className="text-2xl font-black mt-2">{totalCubos} <span className="text-xs font-normal text-slate-400">cubos</span></div>
            <div className="text-emerald-400 text-xs font-bold mt-1">Inv: {inversionTotal.toFixed(2)} €</div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-bold uppercase text-slate-400">Medias</span>
            <div className="text-sm mt-2">Precio: {precioMedio} €</div>
            <div className="text-sm">Nota: {notaMedia} / 10</div>
          </div>
          
          {/* Top 5 Ancho */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 lg:col-span-2 shadow-sm">
            <span className="text-xs font-bold uppercase text-slate-400">Top 5 Mejor Valorados</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {top5.map((item, idx) => (
                    <div key={item.id} className="text-xs truncate text-slate-300">
                        {idx + 1}. {item.models?.name} <span className="text-amber-500 font-bold">({item.rating}★)</span>
                    </div>
                ))}
            </div>
          </div>

          {/* Categorías Interactivas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 lg:col-span-4 shadow-sm flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold uppercase text-slate-400 mr-2">Categorías:</span>
            <button 
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition ${selectedCategory === '' ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700'}`}
            >Todas ({items.length})</button>
            {categories.map(c => {
                const count = items.filter(i => i.models?.category_id === c.id).length
                return (
                    <button 
                        key={c.id} 
                        onClick={() => setSelectedCategory(c.id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition ${selectedCategory === c.id ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700'}`}
                    >{c.name} ({count})</button>
                )
            })}
          </div>
        </div>

        {/* FILTROS SECUNDARIOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input 
            type="text" 
            placeholder="Buscar..." 
            onChange={e => setSearchQuery(e.target.value)} 
            className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-sm focus:ring-1 focus:ring-blue-500" 
          />
          <select onChange={e => setSelectedBrand(e.target.value)} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-sm">
            <option value="">Todas las marcas</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select onChange={e => setSortBy(e.target.value)} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-sm">
            <option value="newest">Más recientes</option>
            <option value="price-desc">Mayor precio</option>
            <option value="rating">Mejor nota</option>
          </select>
        </div>

        {/* CUADRÍCULA DE CUBOS */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-500">Cargando colección...</div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500">No se encontraron cubos.</div>
          ) : (
            filteredItems.map(item => (
              <Link 
                key={item.id} 
                href={`/cubo/${item.id}`} 
                className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500 transition-all shadow-sm hover:shadow-lg hover:shadow-blue-900/10"
              >
                <div className="aspect-square bg-slate-800">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.models?.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">Sin imagen</div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm truncate">{item.models?.name}</h3>
                  <p className="text-[10px] text-slate-400 mb-2">{item.models?.brands?.name}</p>
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                    <span>{item.price} €</span>
                    <span className="text-amber-500">⭐ {item.rating}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}