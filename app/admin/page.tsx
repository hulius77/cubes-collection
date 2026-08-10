'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import AdminHeader from '@/components/AdminHeader'

interface Model {
  id: string
  name: string
}

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

export default function AdminItems() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [items, setItems] = useState<Item[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Estado del formulario
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

  const fetchData = async () => {
    setLoading(true)
    const [resItems, resModels] = await Promise.all([
      supabase.from('items').select('*').order('created_at', { ascending: false }),
      supabase.from('models').select('id, name').order('name')
    ])

    if (resItems.error) setFeedback({ type: 'error', message: resItems.error.message })
    if (resModels.error) setFeedback({ type: 'error', message: resModels.error.message })

    if (resItems.data) setItems(resItems.data)
    if (resModels.data) setModels(resModels.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // NUEVO: Detectar si se pasó un parámetro ?edit=ID en la URL al cargar los datos
  useEffect(() => {
    if (!loading && items.length > 0) {
      const params = new URLSearchParams(window.location.search)
      const editId = params.get('edit')
      
      if (editId) {
        const itemToEdit = items.find((i) => i.id === editId)
        if (itemToEdit) {
          handleEdit(itemToEdit)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
    }
  }, [loading, items])

  const resetForm = () => {
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
    
    // Limpiar la URL para quitar el ?edit=ID si el usuario cancela o termina
    if (typeof window !== 'undefined' && window.location.search.includes('edit=')) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  const handleEdit = (item: Item) => {
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

    const { error } = await supabase.storage
      .from('item-images')
      .upload(filePath, file)

    if (error) {
      setFeedback({ type: 'error', message: 'Error al subir la imagen: ' + error.message })
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
      setFeedback({ type: 'success', message: 'Imagen añadida a la galería.' })
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
      setFeedback({ type: 'error', message: 'Debes seleccionar un modelo.' })
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
      setFeedback({ type: 'error', message: res.error.message })
    } else {
      setFeedback({ type: 'success', message: 'Cubo guardado correctamente.' })
      resetForm()
      fetchData()
    }
    setIsSubmitting(false)
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este cubo?')) return
    setIsSubmitting(true)

    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) setFeedback({ type: 'error', message: error.message })
    else {
      setFeedback({ type: 'success', message: 'Cubo eliminado correctamente.' })
      fetchData()
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminHeader />

      <main className="max-w-5xl mx-auto px-4 pb-12 space-y-8">
        {feedback && (
          <div className={`p-4 rounded-xl text-sm font-medium shadow-sm ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {feedback.message}
          </div>
        )}

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
                onClick={resetForm}
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

          {loading ? (
            <div className="p-8 text-center text-slate-500 font-medium">Cargando colección...</div>
          ) : items.length === 0 ? (
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
                      <button onClick={() => handleEdit(item)} className="text-xs text-blue-600 font-bold hover:underline">
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
      </main>
    </div>
  )
}