'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()

  const [brands, setBrands] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const [brandName, setBrandName] = useState('')
  const [brandSuccessMsg, setBrandSuccessMsg] = useState('')

  const [modelBrandId, setModelBrandId] = useState('')
  const [modelName, setModelName] = useState('')
  const [modelCategory, setModelCategory] = useState('3x3')
  const [modelSuccessMsg, setModelSuccessMsg] = useState('')

  const [editModelTargetId, setEditModelTargetId] = useState('')
  const [editModelBrandId, setEditModelBrandId] = useState('')
  const [editModelNameInput, setEditModelNameInput] = useState('')
  const [editModelCategoryInput, setEditModelCategoryInput] = useState('3x3')
  const [modelUpdateSuccessMsg, setModelUpdateSuccessMsg] = useState('')

  const [selectedModel, setSelectedModel] = useState('')
  const [condition, setCondition] = useState('Nuevo')
  const [rating, setRating] = useState('8')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [purchaseYear, setPurchaseYear] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [selectedItemId, setSelectedItemId] = useState('')
  const [editModelId, setEditModelId] = useState('')
  const [editCondition, setEditCondition] = useState('')
  const [editRating, setEditRating] = useState('8')
  const [editPrice, setEditPrice] = useState('')
  const [editPurchaseYear, setEditPurchaseYear] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [itemSuccessMsg, setItemSuccessMsg] = useState('')

  useEffect(() => {
    checkUserAndLoad()
  }, [])

  async function checkUserAndLoad() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setCheckingAuth(false)
    loadData()
  }

  async function loadData() {
    const { data: brandsData } = await supabase.from('brands').select('*').order('name')
    if (brandsData) setBrands(brandsData)

    const { data: modelsData } = await supabase
      .from('models')
      .select('id, brand_id, name, category, brands(id, name)')
      .order('name')
    if (modelsData) setModels(modelsData)

    const { data: itemsData } = await supabase
      .from('items')
      .select('id, model_id, condition, rating, price, notes, purchase_year, image_url, images, models(name, brands(name))')
      .order('created_at', { ascending: false })
    if (itemsData) setItems(itemsData)
  }

  useEffect(() => {
    if (editModelTargetId) {
      const found = models.find((m) => m.id === editModelTargetId)
      if (found) {
        setEditModelBrandId(found.brand_id || found.brands?.id || '')
        setEditModelNameInput(found.name || '')
        setEditModelCategoryInput(found.category || '3x3')
      }
    }
  }, [editModelTargetId, models])

  useEffect(() => {
    if (selectedItemId) {
      const found = items.find((i) => i.id === selectedItemId)
      if (found) {
        setEditModelId(found.model_id || '')
        setEditCondition(found.condition || '')
        setEditRating(found.rating?.toString() || '8')
        setEditPrice(found.price?.toString() || '')
        setEditPurchaseYear(found.purchase_year?.toString() || '')
        setEditNotes(found.notes || '')
        if (editFileInputRef.current) editFileInputRef.current.value = ''
      }
    }
  }, [selectedItemId, items])

  async function handleCreateBrand(e: React.FormEvent) {
    e.preventDefault()
    if (!brandName.trim()) return

    const { error } = await supabase.from('brands').insert([{ name: brandName.trim() }])
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setBrandSuccessMsg(`¡Marca "${brandName}" creada!`)
      setBrandName('')
      loadData()
    }
  }

  async function handleCreateModel(e: React.FormEvent) {
    e.preventDefault()
    if (!modelBrandId || !modelName.trim()) return

    const { error } = await supabase.from('models').insert([
      { brand_id: modelBrandId, name: modelName.trim(), category: modelCategory || '3x3' },
    ])
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setModelSuccessMsg(`¡Modelo "${modelName}" creado!`)
      setModelName('')
      loadData()
    }
  }

  async function handleUpdateModel(e: React.FormEvent) {
    e.preventDefault()
    if (!editModelTargetId) return

    const { error } = await supabase
      .from('models')
      .update({ brand_id: editModelBrandId, name: editModelNameInput.trim(), category: editModelCategoryInput || '3x3' })
      .eq('id', editModelTargetId)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setModelUpdateSuccessMsg('¡Modelo actualizado!')
      setEditModelTargetId('')
      loadData()
    }
  }

  // 3. Crear Cubo (Múltiples Fotos)
  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedModel) return

    setUploading(true)
    try {
      const files = fileInputRef.current?.files
      const uploadedUrls: string[] = []
      let mainImageUrl = ''

      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const fileName = `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
          const fileBuffer = await file.arrayBuffer()

          const { error: uploadError } = await supabase.storage
            .from('cubes')
            .upload(fileName, fileBuffer, { contentType: file.type, upsert: false })

          if (uploadError) throw uploadError

          const { data: publicUrlData } = supabase.storage.from('cubes').getPublicUrl(fileName)
          uploadedUrls.push(publicUrlData.publicUrl)
        }
        mainImageUrl = uploadedUrls[0] // La primera foto sirve como miniatura principal
      }

      const { error } = await supabase.from('items').insert([
        {
          model_id: selectedModel,
          condition,
          rating: parseFloat(rating),
          price: price ? parseFloat(price) : null,
          notes,
          image_url: mainImageUrl || null,
          images: uploadedUrls.length > 0 ? uploadedUrls : null,
          purchase_year: purchaseYear ? parseInt(purchaseYear) : null,
        },
      ])

      if (error) throw error

      setSuccessMsg('¡Cubo añadido correctamente!')
      setSelectedModel('')
      setPrice('')
      setNotes('')
      setPurchaseYear('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // 4. Actualizar Cubo (Múltiples Fotos)
  async function handleUpdateItem(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItemId) return

    setUploading(true)
    try {
      const files = editFileInputRef.current?.files
      const newUploadedUrls: string[] = []
      let mainImageUrlUpdate = undefined

      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const fileName = `update-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
          const fileBuffer = await file.arrayBuffer()

          const { error: uploadError } = await supabase.storage
            .from('cubes')
            .upload(fileName, fileBuffer, { contentType: file.type, upsert: false })

          if (uploadError) throw uploadError

          const { data: publicUrlData } = supabase.storage.from('cubes').getPublicUrl(fileName)
          newUploadedUrls.push(publicUrlData.publicUrl)
        }
        mainImageUrlUpdate = newUploadedUrls[0]
      }

      const updateData: any = {
        model_id: editModelId,
        condition: editCondition,
        rating: parseFloat(editRating),
        price: editPrice ? parseFloat(editPrice) : null,
        notes: editNotes,
        purchase_year: editPurchaseYear ? parseInt(editPurchaseYear) : null,
      }

      if (mainImageUrlUpdate) {
        updateData.image_url = mainImageUrlUpdate
      }
      if (newUploadedUrls.length > 0) {
        updateData.images = newUploadedUrls
      }

      const { error: updateError } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', selectedItemId)

      if (updateError) throw updateError

      setItemSuccessMsg('¡Cubo modificado correctamente!')
      setSelectedItemId('')
      if (editFileInputRef.current) editFileInputRef.current.value = ''
      loadData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (checkingAuth) {
    return <div className="text-center py-20 text-zinc-500 text-sm">Comprobando sesión...</div>
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
          <p className="text-xs text-zinc-400 mt-1">Gestión completa de tu colección</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition">
            Ver Web
          </Link>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-950/60 border border-red-500/30 hover:bg-red-900 text-red-300 text-xs font-semibold rounded-xl transition">
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {/* SECCIÓN 1: MARCA */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">1. Añadir Nueva Marca</h2>
          {brandSuccessMsg && <div className="mb-4 bg-emerald-950/50 text-emerald-400 p-3 rounded-xl text-xs font-semibold">{brandSuccessMsg}</div>}
          <form onSubmit={handleCreateBrand} className="flex gap-4">
            <input
              type="text"
              placeholder="Ej: GAN, MoYu..."
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              required
            />
            <button type="submit" className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl transition">Crear</button>
          </form>
        </section>

        {/* SECCIÓN 2: MODELO */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">2. Añadir Nuevo Modelo</h2>
          {modelSuccessMsg && <div className="mb-4 bg-emerald-950/50 text-emerald-400 p-3 rounded-xl text-xs font-semibold">{modelSuccessMsg}</div>}
          <form onSubmit={handleCreateModel} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select value={modelBrandId} onChange={(e) => setModelBrandId(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" required>
                <option value="">Selecciona marca...</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input type="text" placeholder="Nombre modelo" value={modelName} onChange={(e) => setModelName(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" required />
              <select value={modelCategory} onChange={(e) => setModelCategory(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white">
                <option value="3x3">3x3</option>
                <option value="2x2">2x2</option>
                <option value="4x4">4x4</option>
                <option value="5x5">5x5</option>
                <option value="Pyraminx">Pyraminx</option>
                <option value="Megaminx">Megaminx</option>
                <option value="Skewb">Skewb</option>
                <option value="Other">Otro</option>
              </select>
            </div>
            <button type="submit" className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl transition">Guardar Modelo</button>
          </form>
        </section>

        {/* SECCIÓN 5: EDITAR MODELO */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6">5. Editar Modelo Existente</h2>
          {modelUpdateSuccessMsg && <div className="mb-6 bg-emerald-950/50 text-emerald-400 p-4 rounded-xl text-xs font-semibold">{modelUpdateSuccessMsg}</div>}
          <form onSubmit={handleUpdateModel} className="space-y-4">
            <select value={editModelTargetId} onChange={(e) => setEditModelTargetId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" required>
              <option value="">Elige un modelo a modificar...</option>
              {models.map((m) => <option key={m.id} value={m.id}>{m.brands?.name} - {m.name} ({m.category || 'Sin cat'})</option>)}
            </select>
            {editModelTargetId && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select value={editModelBrandId} onChange={(e) => setEditModelBrandId(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" required>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <input type="text" value={editModelNameInput} onChange={(e) => setEditModelNameInput(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" required />
                  <select value={editModelCategoryInput} onChange={(e) => setEditModelCategoryInput(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white">
                    <option value="3x3">3x3</option>
                    <option value="2x2">2x2</option>
                    <option value="4x4">4x4</option>
                    <option value="5x5">5x5</option>
                    <option value="Pyraminx">Pyraminx</option>
                    <option value="Megaminx">Megaminx</option>
                    <option value="Skewb">Skewb</option>
                    <option value="Other">Otro</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-sm">Actualizar Modelo</button>
              </div>
            )}
          </form>
        </section>

        {/* SECCIÓN 3: AÑADIR CUBO (MÚLTIPLES FOTOS) */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6">3. Añadir Nuevo Cubo a la Colección</h2>
          {successMsg && <div className="mb-6 bg-emerald-950/50 text-emerald-400 p-4 rounded-xl text-xs font-semibold">{successMsg}</div>}
          <form onSubmit={handleCreateItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" required>
                <option value="">Selecciona un modelo...</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.brands?.name} - {m.name} ({m.category})</option>)}
              </select>
              <input type="text" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Estado (Ej: Nuevo)" className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="number" min="1" max="10" step="0.5" value={rating} onChange={(e) => setRating(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" required />
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Precio (€)" className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" />
              <input type="number" value={purchaseYear} onChange={(e) => setPurchaseYear(e.target.value)} placeholder="Año compra" className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" />
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas personales..." rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" />
            
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Fotos del cubo (puedes seleccionar varias a la vez)</label>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:text-white" />
            </div>

            <button type="submit" disabled={uploading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm disabled:opacity-50">
              {uploading ? 'Subiendo imágenes...' : 'Guardar Cubo'}
            </button>
          </form>
        </section>

        {/* SECCIÓN 4: EDITAR CUBO */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6">4. Editar Cubo Existente</h2>
          {itemSuccessMsg && <div className="mb-6 bg-emerald-950/50 text-emerald-400 p-4 rounded-xl text-xs font-semibold">{itemSuccessMsg}</div>}
          <form onSubmit={handleUpdateItem} className="space-y-4">
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" required>
              <option value="">Elige un cubo de tu colección...</option>
              {items.map((it) => <option key={it.id} value={it.id}>{it.models?.brands?.name} - {it.models?.name}</option>)}
            </select>
            {selectedItemId && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select value={editModelId} onChange={(e) => setEditModelId(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" required>
                    {models.map((m) => <option key={m.id} value={m.id}>{m.brands?.name} - {m.name}</option>)}
                  </select>
                  <input type="text" value={editCondition} onChange={(e) => setEditCondition(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="number" min="1" max="10" step="0.5" value={editRating} onChange={(e) => setEditRating(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" required />
                  <input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" />
                  <input type="number" value={editPurchaseYear} onChange={(e) => setEditPurchaseYear(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white" />
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Reemplazar fotos (opcional)</label>
                  <input ref={editFileInputRef} type="file" accept="image/*" multiple className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:text-white" />
                </div>
                <button type="submit" disabled={uploading} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-sm">{uploading ? 'Actualizando...' : 'Actualizar Cubo'}</button>
              </div>
            )}
          </form>
        </section>
      </div>
    </main>
  )
}