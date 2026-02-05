'use client'

import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

/**
 * Hook para detectar el tipo de dispositivo basado en el ancho de la pantalla
 * - Mobile: < 768px
 * - Tablet: 768px - 1279px  
 * - Desktop: >= 1280px
 */
export function useDevice(): DeviceType {
    const [device, setDevice] = useState<DeviceType>('desktop')

    useEffect(() => {
        const detectDevice = () => {
            const width = window.innerWidth

            if (width < 768) {
                setDevice('mobile')
            } else if (width >= 768 && width < 1280) {
                setDevice('tablet')
            } else {
                setDevice('desktop')
            }
        }

        // Detectar al montar
        detectDevice()

        // Escuchar cambios de tamaño
        window.addEventListener('resize', detectDevice)

        return () => window.removeEventListener('resize', detectDevice)
    }, [])

    return device
}
