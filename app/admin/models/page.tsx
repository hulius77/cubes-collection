'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import AdminHeader from '@/components/AdminHeader'

interface Brand {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

interface Model {
  id: string
  name: string
  brand_id?: string | null
  category_id?: string | null
  created_at?: string
}

export default function AdminModels() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [models, setModels] = useState<Model[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [name, setName] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const [resModels, resBrands, resCats] = await Promise.all([
      supabase.from('models').select('*').order('name'),
      supabase.from('brands').select('id, name').order('name'),
      supabase.from('categories').select('id, name').order('name')
    ])

    if (resModels.error) setFeedback({ type: 'error', message: resModels.error.message })
    if (resModels.data) setModels(resModels.data)
    if (resBrands.data) setBrands(resBrands.data)
    if (resCats.data) setCategories(resCats.data)
    setLoading(false)
  }


  useEffect(() => {
  // Capturar parámetro desde URL o desde localStorage
  const params = new URLSearchParams(window.location.search)
  const editIdFromUrl = params.get('edit')
  const editIdFromStorage = localStorage.getItem('editItemId')

  const targetId = editIdFromUrl || editIdFromStorage

  if (targetId) {
    // Limpiamos el storage para que no se repita
    localStorage.removeItem('editItemId')
    
    // Llama a la función que tengas en tu admin para cargar el ítem en edición
    // Ejemplo:
    // startEditingItem(targetId)
  }
}, [])

  const resetForm = () => {
    setEditingModel(null)
    setName('')
    setBrandId('')
    setCategoryId('')
  }

  const handleEdit = (model: Model) => {
    setEditingModel(model)
    setName(model.name)
    setBrandId(model.brand_id || '')
    setCategoryId(model.category_id || '')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    const payload = {
      name: name.trim(),
      brand_id: brandId || null,
      category_id: categoryId || null
    }

    const res = editingModel
      ? await supabase.from('models').update(payload).eq('id', editingModel.id)
      : await supabase.from('models').insert([payload])

    if (res.error) {
      setFeedback({ type: 'error', message: res.error.message })
    } else {
      setFeedback({ type: 'success', message: 'Modelo guardado con éxito.' })
      resetForm()
      fetchData()
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar este modelo?')) return
    setIsSubmitting(true)
    const { error } = await supabase.from('models').delete().eq('id', id)
    if (error) setFeedback({ type: 'error', message: error.message })
    else {
      setFeedback({ type: 'success', message: 'Modelo eliminado.' })
      fetchData()
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminHeader />
      <main className="max-w-4xl mx-auto px-4 pb-12 space-y-6">
        {feedback && (
          <div className={`p-4 rounded-xl text-sm font-medium shadow-sm ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800 border-b pb-2">
            {editingModel ? '✏️ Editar Modelo' : '➕ Añadir Nuevo Modelo'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombre del Modelo *</label>
              <input
                type="text"
                placeholder="Ej: RS3M 2020"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Marca</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sin Marca --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sin Categoría --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm"
            >
              {editingModel ? 'Guardar Cambios' : 'Crear Modelo'}
            </button>
            {editingModel && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b font-bold text-slate-800">
            Modelos ({models.length})
          </div>
          {loading ? (
            <div className="p-6 text-center text-slate-500">Cargando...</div>
          ) : models.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No hay modelos creados.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {models.map((m) => {
                const brandName = brands.find((b) => b.id === m.brand_id)?.name
                const catName = categories.find((c) => c.id === m.category_id)?.name
                return (
                  <li key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900">{m.name}</span>
                      <div className="text-xs text-slate-500 mt-0.5 space-x-2">
                        {brandName && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Marca: {brandName}</span>}
                        {catName && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Categoría: {catName}</span>}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(m)} className="text-xs text-blue-600 font-bold hover:underline">Editar</button>
                      <button onClick={() => handleDelete(m.id)} className="text-xs text-rose-600 font-bold hover:underline">Eliminar</button>
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