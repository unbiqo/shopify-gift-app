import { useEffect, useMemo, useState } from 'react'
import { Package, Search, X } from 'lucide-react'
import { env } from '../lib/env'

const MAX_SELECTION = null

const normalizeProducts = (items = []) =>
  items
    .map((product) => ({
      id: product?.id || '',
      title: product?.title || 'Untitled product',
      imageUrl: product?.image || product?.imageUrl || '',
      price: product?.price || null,
      variantId: product?.variantId || product?.variant_id || null,
      status: product?.status || product?.product_status || '',
      availableForSale: product?.availableForSale ?? product?.available_for_sale ?? null,
      inventoryQuantity: product?.inventoryQuantity ?? product?.inventory_quantity ?? null
    }))
    .filter((product) => product.id)

const getAuthQuery = () => {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search || '')
  const next = new URLSearchParams()
  const keys = ['shop', 'host', 'embedded', 'id_token']
  keys.forEach((key) => {
    const value = params.get(key)
    if (value) next.set(key, value)
  })
  if (!next.get('shop') && env.VITE_SHOPIFY_SHOP) {
    next.set('shop', env.VITE_SHOPIFY_SHOP)
  }
  return next.toString()
}

const fetchWithShopifyToken = async (input, init = {}) => {
  if (typeof window === 'undefined' || !window.shopify?.idToken) {
    return fetch(input, init)
  }
  const token = await window.shopify.idToken()
  const headers = { ...(init.headers || {}), Authorization: `Bearer ${token}` }
  return fetch(input, { ...init, headers })
}

export const CampaignProductPicker = ({
  selectedProducts = [],
  onProductsSelected,
  onRemoveProduct
}) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [draftSelection, setDraftSelection] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const hasSelection = selectedProducts.length > 0

  useEffect(() => {
    if (!pickerOpen) return
    setDraftSelection(selectedProducts)
  }, [pickerOpen, selectedProducts])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products
    return products.filter((product) =>
      product.title.toLowerCase().includes(term)
    )
  }, [products, search])

  const selectionIds = useMemo(
    () => new Set(draftSelection.map((product) => product.id)),
    [draftSelection]
  )

  const loadProducts = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const authQuery = getAuthQuery()
      const url = authQuery ? `/api/products?${authQuery}` : '/api/products'
      const response = await fetchWithShopifyToken(url)
      if (response.redirected) {
        throw new Error('Authentication required. Open the app from Shopify Admin.')
      }
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error('Unexpected response loading products.')
      }
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to load products.')
      }
      setProducts(normalizeProducts(payload.products || []))
    } catch (error) {
      setLoadError(error?.message || 'Unable to load products.')
    } finally {
      setLoading(false)
    }
  }

  const openPicker = () => {
    setPickerOpen(true)
    if (!products.length) {
      loadProducts()
    }
  }

  const toggleSelection = (product) => {
    if (selectionIds.has(product.id)) {
      setDraftSelection((prev) => prev.filter((item) => item.id !== product.id))
      return
    }
    if (MAX_SELECTION && draftSelection.length >= MAX_SELECTION) return
    setDraftSelection((prev) => [...prev, product])
  }

  const handleApply = () => {
    onProductsSelected?.(draftSelection)
    setPickerOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Selected products</h4>
          <p className="text-xs text-gray-500">Pick products from your catalog.</p>
        </div>
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Package size={16} />
          Select Products
        </button>
      </div>

      {!hasSelection && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
          No products selected yet.
        </div>
      )}

      {hasSelection && (
        <div className="space-y-3">
          {selectedProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-md bg-gray-100">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <Package size={18} />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{product.title}</h4>
                  <p className="text-xs text-gray-500">{product.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveProduct?.(product.id)}
                className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
              >
                <X size={14} />
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 sm:justify-start">
          <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:ml-6 sm:max-h-[70vh]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Select products</h3>
                <p className="text-xs text-gray-500">{draftSelection.length} selected</p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 min-h-0 px-6 py-4 flex flex-col gap-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products"
                  className="w-full rounded-lg border border-gray-200 px-9 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {loading && (
                <div className="text-sm text-gray-500">Loading products...</div>
              )}
              {loadError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                  {loadError}
                </div>
              )}

              {!loading && !loadError && (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {filteredProducts.map((product) => {
                    const selected = selectionIds.has(product.id)
                    const disabled = MAX_SELECTION && !selected && draftSelection.length >= MAX_SELECTION
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleSelection(product)}
                        disabled={disabled}
                        className={`w-full flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${
                          selected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-200'
                        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 overflow-hidden rounded-md bg-gray-100">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                <Package size={18} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{product.title}</p>
                            <p className="text-xs text-gray-500">{product.id}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-indigo-600">
                          {selected ? 'Selected' : 'Add'}
                        </span>
                      </button>
                    )
                  })}
                  {!filteredProducts.length && (
                    <div className="text-sm text-gray-500">No products match your search.</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Add selected products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
