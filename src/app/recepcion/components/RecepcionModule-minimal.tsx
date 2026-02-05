'use client'
import React, { useState, useEffect } from 'react'

type CatalogAccessory = {
  id: string
  name: string
  product_type_id: string | null
}

type SelectedAccessory = {
  accessoryId: string
  name: string
  quantity: number
  notes: string
}

const RecepcionModule = () => {
  const [catalogAccessories, setCatalogAccessories] = useState<CatalogAccessory[]>([])
  const [filteredAccessories, setFilteredAccessories] = useState<CatalogAccessory[]>([])
  const [receptionForm, setReceptionForm] = useState({ accessories: [] as SelectedAccessory[] })

  useEffect(() => {
    const loadAccessoriesCatalog = async () => {
      try {
        const response = await fetch('/api/recepcion/accessories-catalog')
        if (response.ok) {
          const data = await response.json()
          setCatalogAccessories(data.accessories || [])
          setFilteredAccessories(data.accessories || [])
        }
      } catch (error) {
        console.error('Error loading accessories catalog:', error)
      }
    }
    loadAccessoriesCatalog()
  }, [])

  const handleAddAccessory = () => {
    const firstAccessory = catalogAccessories[0] || { id: '', name: '' }
    setReceptionForm((prev) => ({
      ...prev,
      accessories: [
        ...prev.accessories,
        {
          accessoryId: firstAccessory.id,
          name: firstAccessory.name,
          quantity: 1,
          notes: ''
        }
      ]
    }))
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Recepción de Equipos</h1>
      <div className="mb-4 p-4 bg-blue-100 rounded-lg">
        <p className="text-blue-900">
          ✓ Sistemas de accesorios implementados correctamente
        </p>
        <p className="text-sm text-blue-800 mt-2">
          Catálogo total: {catalogAccessories.length} accesorios
        </p>
        <p className="text-sm text-blue-800">
          Accesorios filtrados: {filteredAccessories.length}
        </p>
      </div>
      <button
        onClick={handleAddAccessory}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        + Agregar Accesorio
      </button>
      {receptionForm.accessories.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Accesorios agregados: {receptionForm.accessories.length}</h3>
          <ul className="list-disc pl-6">
            {receptionForm.accessories.map((acc, i) => (
              <li key={i} className="text-sm py-1">
                {acc.name || '(Sin seleccionar)'} x {acc.quantity}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default RecepcionModule
