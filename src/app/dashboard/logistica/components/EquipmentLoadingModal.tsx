'use client'

import React, { useState } from 'react'

interface EquipmentLoadingModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string
  clientName: string
  location: string
  currentBoxNumber: number
  totalBoxes: number
  totalUnits: number
  responsibleName: string
  responsibleType: string
  vehicleModel: string
  vehiclePlate: string
  onFinalizeLogistics: (equipmentData: any[]) => void
}

export const EquipmentLoadingModal: React.FC<EquipmentLoadingModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  clientName,
  location,
  currentBoxNumber,
  totalBoxes,
  totalUnits,
  responsibleName,
  responsibleType,
  vehicleModel,
  vehiclePlate,
  onFinalizeLogistics
}) => {
  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [formData, setFormData] = useState({
    productType: '',
    brand: '',
    model: '',
    quantity: 1
  })

  console.log('EquipmentLoadingModal render - isOpen:', isOpen, 'ticketId:', ticketId)

  if (!isOpen) {
    console.log('Modal cerrado, no renderizando...')
    return null
  }
  
  console.log('Modal ABIERTO, renderizando...')

  const handleAddEquipment = () => {
    if (!formData.productType || !formData.brand || !formData.model) {
      alert('Completa todos los campos')
      return
    }
    setEquipmentList([...equipmentList, { ...formData, id: Date.now() }])
    setFormData({ productType: '', brand: '', model: '', quantity: 1 })
  }

  const handleFinalize = () => {
    if (equipmentList.length === 0) {
      alert('Agrega al menos un equipo')
      return
    }
    onFinalizeLogistics(equipmentList)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#1a1a2e',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '85vh',
        overflow: 'auto',
        border: '3px solid #4ade80',
        padding: '32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: '#4ade80', fontSize: '32px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{ticketId}</h1>
            <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>{clientName}</p>
          </div>
          <button onClick={onClose} style={{
            backgroundColor: '#dc2626',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            ✕ CERRAR
          </button>
        </div>

        {/* Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#0f3460', padding: '12px', borderRadius: '8px', border: '1px solid #4ade80' }}>
            <p style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', margin: '0 0 6px 0' }}>UBICACIÓN</p>
            <p style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{location}</p>
          </div>
          <div style={{ backgroundColor: '#0f3460', padding: '12px', borderRadius: '8px', border: '1px solid #4ade80' }}>
            <p style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', margin: '0 0 6px 0' }}>CAJA #</p>
            <p style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{String(currentBoxNumber).padStart(5, '0')}</p>
          </div>
        </div>

        {/* Form */}
        <div style={{ backgroundColor: '#0f3460', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #4ade80' }}>
          <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px' }}>➕ Agregar Equipo</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#aaa', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>TIPO *</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#1a1a2e',
                  color: '#fff',
                  border: '1px solid #4ade80',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Selecciona...</option>
                <option value="Desktop">Desktop</option>
                <option value="Laptop">Laptop</option>
                <option value="Monitor">Monitor</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#aaa', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>MARCA *</label>
              <select
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#1a1a2e',
                  color: '#fff',
                  border: '1px solid #4ade80',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Selecciona...</option>
                <option value="Dell">Dell</option>
                <option value="HP">HP</option>
                <option value="Lenovo">Lenovo</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#aaa', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>MODELO *</label>
              <select
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#1a1a2e',
                  color: '#fff',
                  border: '1px solid #4ade80',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Selecciona...</option>
                <option value="OptiPlex">OptiPlex</option>
                <option value="EliteBook">EliteBook</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#aaa', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>CANTIDAD</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#1a1a2e',
                  color: '#fff',
                  border: '1px solid #4ade80',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <button
            onClick={handleAddEquipment}
            style={{
              width: '100%',
              backgroundColor: '#4ade80',
              color: '#000',
              border: 'none',
              padding: '12px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            ✓ Agregar Equipo
          </button>
        </div>

        {/* Equipment List */}
        {equipmentList.length > 0 && (
          <div style={{ backgroundColor: '#0f3460', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #4ade80' }}>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '12px' }}>📦 Equipos ({equipmentList.length})</h3>
            {equipmentList.map((eq) => (
              <div
                key={eq.id}
                style={{
                  backgroundColor: '#1a1a2e',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <p style={{ color: '#4ade80', fontWeight: 'bold', margin: '0 0 4px 0' }}>{eq.brand} {eq.model}</p>
                  <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>{eq.productType} • x{eq.quantity}</p>
                </div>
                <button
                  onClick={() => setEquipmentList(prev => prev.filter(e => e.id !== eq.id))}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              backgroundColor: '#444',
              color: '#fff',
              border: 'none',
              padding: '14px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            ✕ Cancelar
          </button>
          <button
            onClick={handleFinalize}
            disabled={equipmentList.length === 0}
            style={{
              flex: 1,
              backgroundColor: equipmentList.length > 0 ? '#10b981' : '#666',
              color: '#fff',
              border: 'none',
              padding: '14px 16px',
              borderRadius: '8px',
              cursor: equipmentList.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              fontSize: '16px',
              opacity: equipmentList.length > 0 ? 1 : 0.5
            }}
          >
            ✓ Finalizar ({equipmentList.length})
          </button>
        </div>
      </div>
    </div>
  )
}
