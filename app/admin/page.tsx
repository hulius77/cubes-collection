'use client'

import { useState, useEffect, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useSearchParams } from 'next/navigation'

type Tab = 'Cubos' | 'Modelos' | 'Categorías' | 'Marcas' | 'Tutoriales'

interface Brand { id: string; name: string; country?: string | null }
interface Category { id: string; name: string; description?: string | null }
interface Model { id: string; name: string; brand_id?: string | null; category_id?: string | null }
interface Item {
  id: string
  model_id: string
  condition?: string | null
  base_color?: string | null
  rating?: number | null
  price?: number | null
  currency?: string
  notes?: string | null
  image_url?: string | null
  images?: string[] | null
  purchase_year?: number | null
  created_at?: string
}

// 1. Componente envuelto que contiene toda la lógica original
function AdminContent() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [activeTab, setActiveTab] = useState<Tab>('Cubos')
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Datos globales
  const [items, setItems] = useState<Item[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [tutorials, setTutorials] = useState<any[]>([])

  // Estados Formulario de Cubos
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [modelId, setModelId] = useState('')
  const [condition, setCondition] = useState('')
  const [baseColor, setBaseColor] = useState('stickerless')
  const [customBaseColor, setCustomBaseColor] = useState('')
  const [rating, setRating] = useState<number | ''>('')
  const [price, setPrice] = useState<number | ''>('')
  const [purchaseYear, setPurchaseYear] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagesList, setImagesList] = useState<string[]>([])
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados Formulario de Tutoriales
  const [tutorialTitle, setTutorialTitle] = useState('')
  const [tutorialUrl, setTutorialUrl] = useState('')
  const [tutorialCategory, setTutorialCategory] = useState('')
  const [editingTutorialId, setEditingTutorialId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const [resItems, resModels, resCategories, resBrands, resTutorials] = await Promise.all([
      supabase.from('items').select('*').order('created_at', { ascending: false }),
      supabase.from('models').select('*, brands(name), categories(name)').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('brands').select('*').order('name'),
      supabase.from('tutorials').select('*, categories(*)').order('created_at', { ascending: false })
    ])

    if (resItems.data) setItems(resItems.data)
    if (resModels.data) setModels(resModels.data)
    if (resCategories.data) setCategories(resCategories.data)
    if (resBrands.data) setBrands(resBrands.data)
    if (resTutorials.data) setTutorials(resTutorials.data)

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Detectar parámetro de edición en la URL
  useEffect(() => {
    if (editId && items.length > 0) {
      const itemToEdit = items.find((i) => i.id === editId)
      if (itemToEdit) {
        handleEditItem(itemToEdit)
        setActiveTab('Cubos')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }, [editId, items])

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  const resetCubeForm = () => {
    setEditingItem(null)
    setModelId('')
    setCondition('')
    setBaseColor('stickerless')
    setCustomBaseColor('')
    setRating('')
    setPrice('')
    setPurchaseYear('')
    setNotes('')
    setImageUrl('')
    setImagesList([])
    setNewImageFile(null)
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    setModelId(item.model_id)
    setCondition(item.condition || '')
    const standardColors = ['negro', 'blanco', 'stickerless', 'transparente']
    if (item.base_color && !standardColors.includes(item.base_color.toLowerCase())) {
      setBaseColor('otro')
      setCustomBaseColor(item.base_color)
    } else {
      setBaseColor(item.base_color || 'stickerless')
      setCustomBaseColor('')
    }
    setRating(item.rating ?? '')
    setPrice(item.price ?? '')
    setPurchaseYear(item.purchase_year ?? '')
    setNotes(item.notes || '')
    setImageUrl(item.image_url || '')
    setImagesList(item.images || [])
    setNewImageFile(null)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `cubes/${fileName}`
    const { error } = await supabase.storage.from('item-images').upload(filePath, file)
    if (error) {
      showFeedback('error', 'Error al subir la imagen: ' + error.message)
      return null
    }
    const { data } = supabase.storage.from('item-images').getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleAddImage = async () => {
    if (!newImageFile) return
    setIsSubmitting(true)
    const uploadedUrl = await uploadImage(newImageFile)
    if (uploadedUrl) {
      const updatedList = [...imagesList, uploadedUrl]
      setImagesList(updatedList)
      if (!imageUrl) setImageUrl(uploadedUrl)
      setNewImageFile(null)
      showFeedback('success', 'Imagen añadida a la galería.')
    }
    setIsSubmitting(false)
  }

  const handleRemoveImageFromList = (urlToRemove: string) => {
    const updatedList = imagesList.filter((url) => url !== urlToRemove)
    setImagesList(updatedList)
    if (imageUrl === urlToRemove) {
      setImageUrl(updatedList[0] || '')
    }
  }

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modelId) {
      showFeedback('error', 'Debes seleccionar un modelo.')
      return
    }
    setIsSubmitting(true)
    let finalImages = [...imagesList]
    let finalImageUrl = imageUrl

    if (newImageFile) {
      const uploadedUrl = await uploadImage(newImageFile)
      if (uploadedUrl) {
        finalImages.push(uploadedUrl)
        if (!finalImageUrl) finalImageUrl = uploadedUrl
      }
    }

    const finalBaseColor = baseColor === 'otro' ? customBaseColor : baseColor
    const payload = {
      model_id: modelId,
      condition: condition || null,
      base_color: finalBaseColor || null,
      rating: rating !== '' ? Number(rating) : null,
      price: price !== '' ? Number(price) : null,
      purchase_year: purchaseYear !== '' ? Number(purchaseYear) : null,
      notes: notes || null,
      image_url: finalImageUrl || null,
      images: finalImages.length > 0 ? finalImages : null
    }

    const res = editingItem
      ? await supabase.from('items').update(payload).eq('id', editingItem.id)
      : await supabase.from('items').insert([payload])

    if (res.error) {
      showFeedback('error', res.error.message)
    } else {
      showFeedback('success', 'Cubo guardado correctamente.')
      resetCubeForm()
      fetchData()
    }
    setIsSubmitting(false)
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este cubo?')) return
    setIsSubmitting(true)
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) showFeedback('error', error.message)
    else {
      showFeedback('success', 'Cubo eliminado correctamente.')
      fetchData()
    }
    setIsSubmitting(false)
  }

  const handleSaveTutorial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tutorialTitle || !tutorialUrl) return

    if (editingTutorialId) {
      const { error } = await supabase.from('tutorials').update({
        title: tutorialTitle,
        youtube_url: tutorialUrl,
        category_id: tutorialCategory || null
      }).eq('id', editingTutorialId)
      if (error) showFeedback('error', error.message)
      else showFeedback('success', 'Tutorial actualizado correctamente.')
      setEditingTutorialId(null)
    } else {
      const { error } = await supabase.from('tutorials').insert([{
        title: tutorialTitle,
        youtube_url: tutorialUrl,
        category_id: tutorialCategory || null
      }])
      if (error) showFeedback('error', error.message)
      else showFeedback('success', 'Tutorial añadido correctamente.')
    }
    setTutorialTitle('')
    setTutorialUrl('')
    setTutorialCategory('')
    fetchData()
  }

  const startEditTutorial = (t: any) => {
    setEditingTutorialId(t.id)
    setTutorialTitle(t.title)
    setTutorialUrl(t.youtube_url)
    setTutorialCategory(t.category_id || '')
  }

  const handleDeleteTutorial = async (id: string) => {
    if (confirm('¿Seguro que quieres borrar este tutorial?')) {
      const { error } = await supabase.from('tutorials').delete().eq('id', id)
      if (error) showFeedback('error', error.message)
      else {
        showFeedback('success', 'Tutorial eliminado.')
        fetchData()
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🧩</span>
            <h1 className="font-black text-slate-900 tracking-tight text-lg">Panel de Administración</h1>
          </div>
          <a href="/" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition">
            Ver Sitio Público →
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-12 pt-6 space-y-6">
        {feedback && (
          <div className={`p-4 rounded-xl text-sm font-medium shadow-sm ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {feedback.message}
          </div>
        )}

        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200 pb-4">
          {(['Cubos', 'Modelos', 'Categorías', 'Marcas', 'Tutoriales'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${
                activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">Cargando panel de administración...</div>
        ) : (
          <div>
            {activeTab === 'Cubos' && (
              <div className="space-y-8">
                <form onSubmit={handleSaveItem} className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
                  <div className="border-b pb-3 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">
                      {editingItem ? '✏️ Editar Cubo' : '➕ Registrar Nuevo Cubo'}
                    </h2>
                    {editingItem && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-semibold">
                        Modo Edición
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Modelo *</label>
                      <select
                        value={modelId}
                        onChange={(e) => setModelId(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">-- Seleccionar Modelo --</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Color de Base</label>
                      <select
                        value={baseColor}
                        onChange={(e) => setBaseColor(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium capitalize focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="stickerless">Stickerless</option>
                        <option value="negro">Negro</option>
                        <option value="blanco">Blanco</option>
                        <option value="transparente">Transparente</option>
                        <option value="otro">Otro / Específico...</option>
                      </select>

                      {baseColor === 'otro' && (
                        <input
                          type="text"
                          placeholder="Escribe el color"
                          value={customBaseColor}
                          onChange={(e) => setCustomBaseColor(e.target.value)}
                          className="w-full mt-2 px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Valoración (1 al 10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        step="1"
                        placeholder="Ej: 9"
                        value={rating}
                        onChange={(e) => setRating(e.target.value ? parseInt(e.target.value) : '')}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Estado / Conservación</label>
                      <input
                        type="text"
                        placeholder="Ej: Nuevo en caja, Usado..."
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Precio (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ej: 24.90"
                        value={price}
                        onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : '')}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Año de Adquisición</label>
                      <input
                        type="number"
                        placeholder="Ej: 2024"
                        value={purchaseYear}
                        onChange={(e) => setPurchaseYear(e.target.value ? parseInt(e.target.value) : '')}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notas Adicionales</label>
                    <textarea
                      rows={2}
                      placeholder="Detalles sobre lubricado, ajuste de tensiones..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                      Galería de Fotos del Cubo
                    </label>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setNewImageFile(e.target.files[0])
                          }
                        }}
                        className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {newImageFile && (
                        <button
                          type="button"
                          onClick={handleAddImage}
                          disabled={isSubmitting}
                          className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shadow-sm"
                        >
                          Subir Foto
                        </button>
                      )}
                    </div>

                    {imagesList.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-2">
                        {imagesList.map((url, idx) => (
                          <div key={idx} className="relative group w-20 h-20 border rounded-xl overflow-hidden bg-slate-100 shadow-xs">
                            <img src={url} alt={`Imagen ${idx}`} className="w-full h-full object-cover" />
                            
                            {url === imageUrl && (
                              <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                Portada
                              </span>
                            )}

                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1.5">
                              {url !== imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => setImageUrl(url)}
                                  className="text-[10px] bg-white text-slate-800 px-2 py-0.5 rounded font-bold shadow"
                                >
                                  Portada
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveImageFromList(url)}
                                className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold shadow"
                              >
                                Borrar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-sm"
                    >
                      {editingItem ? 'Actualizar Cubo' : 'Guardar Cubo'}
                    </button>
                    {editingItem && (
                      <button
                        type="button"
                        onClick={resetCubeForm}
                        className="px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b font-bold text-slate-800 flex justify-between items-center">
                    <span>Cubos Registrados ({items.length})</span>
                  </div>

                  {items.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No hay cubos registrados aún.</div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const modelName = models.find((m) => m.id === item.model_id)?.name || 'Modelo Desconocido'
                        const mainImg = item.image_url || (item.images && item.images[0])

                        return (
                          <li key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition">
                            <div className="flex items-center gap-4">
                              {mainImg ? (
                                <img src={mainImg} alt={modelName} className="w-14 h-14 object-cover rounded-xl border shadow-xs flex-shrink-0" />
                              ) : (
                                <div className="w-14 h-14 bg-slate-100 border rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-bold flex-shrink-0">
                                  SIN FOTO
                                </div>
                              )}

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900">{modelName}</span>
                                  
                                  {item.base_color && (
                                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 font-medium border rounded-md capitalize">
                                      Base: {item.base_color}
                                    </span>
                                  )}

                                  {item.rating && (
                                    <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-md">
                                      ⭐ {item.rating}/10
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-500">
                                  Estado: <span className="text-slate-700">{item.condition || 'N/A'}</span> | 
                                  Precio: <span className="text-slate-700">{item.price ? `${item.price} ${item.currency || 'EUR'}` : 'N/A'}</span> | 
                                  Año: <span className="text-slate-700">{item.purchase_year || 'N/A'}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-4 items-center">
                              <button onClick={() => handleEditItem(item)} className="text-xs text-blue-600 font-bold hover:underline">
                                Editar
                              </button>
                              <button onClick={() => handleDeleteItem(item.id)} className="text-xs text-rose-600 font-bold hover:underline">
                                Eliminar
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'Modelos' && (
              <ModelsManager models={models} brands={brands} categories={categories} refresh={fetchData} supabase={supabase} showFeedback={showFeedback} />
            )}

            {activeTab === 'Categorías' && (
              <CategoriesManager categories={categories} refresh={fetchData} supabase={supabase} showFeedback={showFeedback} />
            )}

            {activeTab === 'Marcas' && (
              <BrandsManager brands={brands} refresh={fetchData} supabase={supabase} showFeedback={showFeedback} />
            )}

            {activeTab === 'Tutoriales' && (
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-bold text-slate-800">📺 Gestionar Tutoriales</h2>

                <form onSubmit={handleSaveTutorial} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border">
                  <input 
                    type="text" 
                    placeholder="Título del tutorial" 
                    value={tutorialTitle} 
                    onChange={e => setTutorialTitle(e.target.value)}
                    className="bg-white border p-2.5 rounded-xl text-sm text-slate-900"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="URL de YouTube" 
                    value={tutorialUrl} 
                    onChange={e => setTutorialUrl(e.target.value)}
                    className="bg-white border p-2.5 rounded-xl text-sm text-slate-900"
                    required
                  />
                  <select 
                    value={tutorialCategory} 
                    onChange={e => setTutorialCategory(e.target.value)}
                    className="bg-white border p-2.5 rounded-xl text-sm text-slate-900"
                  >
                    <option value="">Sin categoría (General)</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-sm">
                    {editingTutorialId ? 'Actualizar' : 'Añadir Tutorial'}
                  </button>
                </form>

                <div className="space-y-2">
                  {tutorials.map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-white border p-4 rounded-xl shadow-xs">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{t.title}</h4>
                        <span className="text-xs text-blue-600 font-semibold">{t.categories?.name || 'General'}</span>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => startEditTutorial(t)} className="text-xs text-blue-600 font-bold hover:underline">Editar</button>
                        <button onClick={() => handleDeleteTutorial(t.id)} className="text-xs text-rose-600 font-bold hover:underline">Borrar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// 2. Componente Principal que envuelve el contenido en un Suspense boundary (Requerido por Next.js)
export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">Cargando panel...</div>}>
      <AdminContent />
    </Suspense>
  )
}

// --- GESTORES AUXILIARES ---

function BrandsManager({ brands, refresh, supabase, showFeedback }: any) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (editingId) {
      const { error } = await supabase.from('brands').update({ name, country }).eq('id', editingId)
      if (error) showFeedback('error', error.message)
      else showFeedback('success', 'Marca actualizada correctamente.')
      setEditingId(null)
    } else {
      const { error } = await supabase.from('brands').insert([{ name, country }])
      if (error) showFeedback('error', error.message)
      else showFeedback('success', 'Marca añadida correctamente.')
    }
    setName(''); setCountry('')
    refresh()
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Seguro que deseas eliminar esta marca?')) {
      const { error } = await supabase.from('brands').delete().eq('id', id)
      if (error) showFeedback('error', error.message)
      else { showFeedback('success', 'Marca eliminada.'); refresh() }
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
        <input 
          type="text"
          className="px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium" 
          placeholder="Nombre de la Marca" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required 
        />
        <input 
          type="text"
          className="px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium" 
          placeholder="País (ej. China, Alemania)" 
          value={country} 
          onChange={e => setCountry(e.target.value)} 
        />
        <div className="flex gap-2">
          <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition">
            {editingId ? 'Actualizar' : 'Añadir Marca'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setName(''); setCountry('') }} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b font-bold text-slate-800">Listado de Marcas ({brands.length})</div>
        <ul className="divide-y divide-slate-100">
          {brands.map((b: any) => (
            <li key={b.id} className="p-4 flex justify-between items-center text-sm hover:bg-slate-50/80 transition">
              <div>
                <span className="font-bold text-slate-900">{b.name}</span>
                {b.country && <span className="ml-2 text-xs text-slate-500">({b.country})</span>}
              </div>
              <div className="flex gap-4">
                <button onClick={() => { setName(b.name); setCountry(b.country || ''); setEditingId(b.id) }} className="text-blue-600 font-bold hover:underline">Editar</button>
                <button onClick={() => handleDelete(b.id)} className="text-rose-600 font-bold hover:underline">Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CategoriesManager({ categories, refresh, supabase, showFeedback }: any) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (editingId) {
      const { error } = await supabase.from('categories').update({ name, description }).eq('id', editingId)
      if (error) showFeedback('error', error.message)
      else showFeedback('success', 'Categoría actualizada correctamente.')
      setEditingId(null)
    } else {
      const { error } = await supabase.from('categories').insert([{ name, description }])
      if (error) showFeedback('error', error.message)
      else showFeedback('success', 'Categoría añadida correctamente.')
    }
    setName(''); setDescription('')
    refresh()
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Seguro que deseas eliminar esta categoría?')) {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) showFeedback('error', error.message)
      else { showFeedback('success', 'Categoría eliminada.'); refresh() }
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input 
            type="text"
            className="px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium" 
            placeholder="Nombre de la Categoría" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
          />
          <input 
            type="text"
            className="px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium" 
            placeholder="Descripción breve" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition">
            {editingId ? 'Actualizar' : 'Añadir Categoría'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setName(''); setDescription('') }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b font-bold text-slate-800">Listado de Categorías ({categories.length})</div>
        <ul className="divide-y divide-slate-100">
          {categories.map((c: any) => (
            <li key={c.id} className="p-4 flex justify-between items-center text-sm hover:bg-slate-50/80 transition">
              <div>
                <span className="font-bold text-slate-900">{c.name}</span>
                {c.description && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
              </div>
              <div className="flex gap-4">
                <button onClick={() => { setName(c.name); setDescription(c.description || ''); setEditingId(c.id) }} className="text-blue-600 font-bold hover:underline">Editar</button>
                <button onClick={() => handleDelete(c.id)} className="text-rose-600 font-bold hover:underline">Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ModelsManager({ models, brands, categories, refresh, supabase, showFeedback }: any) {
  const [name, setName] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const payload = {
      name,
      brand_id: brandId || null,
      category_id: categoryId || null
    }

    if (editingId) {
      const { error } = await supabase.from('models').update(payload).eq('id', editingId)
      if (error) showFeedback('error', error.message)
      else showFeedback('success', 'Modelo actualizado correctamente.')
      setEditingId(null)
    } else {
      const { error } = await supabase.from('models').insert([payload])
      if (error) showFeedback('error', error.message)
      else showFeedback('success', 'Modelo añadido correctamente.')
    }
    setName(''); setBrandId(''); setCategoryId('')
    refresh()
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Seguro que deseas eliminar este modelo?')) {
      const { error } = await supabase.from('models').delete().eq('id', id)
      if (error) showFeedback('error', error.message)
      else { showFeedback('success', 'Modelo eliminado.'); refresh() }
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input 
            type="text"
            className="px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium" 
            placeholder="Nombre del Modelo (ej. Gan 12 M Pro)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
          />
          <select 
            value={brandId} 
            onChange={e => setBrandId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium"
          >
            <option value="">-- Seleccionar Marca --</option>
            {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select 
            value={categoryId} 
            onChange={e => setCategoryId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium"
          >
            <option value="">-- Seleccionar Categoría --</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition">
            {editingId ? 'Actualizar' : 'Añadir Modelo'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setName(''); setBrandId(''); setCategoryId('') }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b font-bold text-slate-800">Listado de Modelos ({models.length})</div>
        <ul className="divide-y divide-slate-100">
          {models.map((m: any) => (
            <li key={m.id} className="p-4 flex justify-between items-center text-sm hover:bg-slate-50/80 transition">
              <div>
                <span className="font-bold text-slate-900">{m.name}</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Marca: <span className="font-medium text-slate-700">{m.brands?.name || 'N/A'}</span> | 
                  Categoría: <span className="font-medium text-slate-700">{m.categories?.name || 'N/A'}</span>
                </p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => { setName(m.name); setBrandId(m.brand_id || ''); setCategoryId(m.category_id || ''); setEditingId(m.id) }} className="text-blue-600 font-bold hover:underline">Editar</button>
                <button onClick={() => handleDelete(m.id)} className="text-rose-600 font-bold hover:underline">Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}