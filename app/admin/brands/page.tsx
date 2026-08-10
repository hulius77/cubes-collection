'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import AdminHeader from '@/components/AdminHeader'

interface Brand {
  id: string
  name: string
  country?: string | null
}

export default function AdminBrands() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('brands').select('*').order('name')
    if (error) setFeedback({ type: 'error', message: error.message })
    if (data) setBrands(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const resetForm = () => {
    setEditingBrand(null)
    setName('')
    setCountry('')
  }

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand)
    setName(brand.name)
    setCountry(brand.country || '')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    const payload = { name: name.trim(), country: country.trim() || null }

    const res = editingBrand
      ? await supabase.from('brands').update(payload).eq('id', editingBrand.id)
      : await supabase.from('brands').insert([payload])

    if (res.error) {
      setFeedback({ type: 'error', message: res.error.message })
    } else {
      setFeedback({ type: 'success', message: 'Marca guardada.' })
      resetForm()
      fetchData()
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta marca?')) return
    setIsSubmitting(true)
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) setFeedback({ type: 'error', message: error.message })
    else {
      setFeedback({ type: 'success', message: 'Marca eliminada.' })
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
            {editingBrand ? '✏️ Editar Marca' : '➕ Añadir Nueva Marca'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombre de la Marca (ej: GAN, Moyu) *</label>
              <input
                type="text"
                placeholder="Ej: MoYu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">País de origen</label>
              <input
                type="text"
                placeholder="Ej: China"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm"
            >
              {editingBrand ? 'Guardar Cambios' : 'Crear Marca'}
            </button>
            {editingBrand && (
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
            Marcas ({brands.length})
          </div>
          {loading ? (
            <div className="p-6 text-center text-slate-500">Cargando...</div>
          ) : brands.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No hay marcas registradas.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {brands.map((b) => (
                <li key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-slate-900">{b.name}</span>
                    {b.country && <span className="ml-2 text-xs text-slate-500">({b.country})</span>}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(b)} className="text-xs text-blue-600 font-bold hover:underline">Editar</button>
                    <button onClick={() => handleDelete(b.id)} className="text-xs text-rose-600 font-bold hover:underline">Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}