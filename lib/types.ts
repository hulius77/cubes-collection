export interface Brand {
  id: string
  name: string
  country?: string
  logo_url?: string
}

export interface Category {
  id: string
  name: string
  slug: string
}

export interface Model {
  id: string
  name: string
  brand_id?: string
  category_id?: string
  release_year?: number
  layers?: string
  shape?: string
  brands?: Brand
  categories?: Category
}

export interface Item {
  id: string
  model_id: string
  condition?: string
  rating?: number
  price?: number
  currency?: string
  models?: Model
}