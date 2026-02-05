#!/usr/bin/env python3
"""
Fix handleDownloadPDF function in LogisticaModule.tsx
"""

import re

file_path = r'src\app\dashboard\logistica\components\LogisticaModule.tsx'

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the function
pattern = r'  const handleDownloadPDF = async \(\) => \{[\s\S]*?^\  \}\n'
match = re.search(pattern, content, re.MULTILINE)

if not match:
    print("❌ Could not find handleDownloadPDF function")
    exit(1)

print(f"✓ Found function at position {match.start()}-{match.end()}")
print(f"Original length: {len(match.group(0))} chars")

# New function implementation
new_function = """  const handleDownloadPDF = async () => {
    try {
      if (!generatedTemplateHtml) {
        alert('No hay una plantilla generada. Abre "Generar Guías y Manifiesto" primero.')
        return
      }

      // Crear contenedor temporal
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-10000px'
      container.style.top = '0'
      container.style.width = '210mm'
      container.style.padding = '20mm'
      container.style.backgroundColor = 'white'
      container.innerHTML = generatedTemplateHtml
      document.body.appendChild(container)

      // Esperar que se renderice
      await new Promise(resolve => setTimeout(resolve, 500))

      const filename = `Manifiesto-${manifestNumber || 'sin-numero'}-${new Date().toISOString().split('T')[0]}.pdf`
      
      // Importar html2canvas dinámicamente
      const html2canvas = (await import('html2canvas')).default
      
      // Capturar el HTML como imagen
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight,
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight
      })

      const imgData = canvas.toDataURL('image/png')
      
      // Crear PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      // Primera página
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Páginas adicionales si es necesario
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(filename)
      document.body.removeChild(container)
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      alert('Error al descargar el PDF. Intenta con Imprimir.')
    }
  }
"""

# Replace
new_content = content[:match.start()] + new_function + content[match.end():]

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"✅ Function replaced successfully")
print(f"New length: {len(new_function)} chars")
