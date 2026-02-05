import { useEffect, useState } from 'react'

export function usePDFTemplate() {
  const [templateContent, setTemplateContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setIsLoading(true)
        
        // Siempre trae desde la API (plantilla actual de BD)
        const response = await fetch('/api/logistica/pdf-template', {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          throw new Error('Error al cargar la plantilla')
        }

        const { content } = await response.json()
        setTemplateContent(content)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
        console.error('Error fetching PDF template:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplate()
  }, [])

  return { templateContent, isLoading, error }
}
