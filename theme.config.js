/**
 * GUÍA DE DISEÑO Y CONTRASTE - ITAD ERP
 * 
 * Reglas mandatorias para mantener la consistencia visual y accesibilidad (WCAG AA).
 */

module.exports = {
    theme: {
        // 1. Colores de Texto (Siempre usar variante dark:)
        text: {
            primary: {
                light: 'text-gray-900',
                dark: 'dark:text-white',
                usage: 'Títulos H1, H2, H3 y énfasis principal'
            },
            secondary: {
                light: 'text-gray-700',
                dark: 'dark:text-gray-300',
                usage: 'Subtítulos y texto descriptivo secundario'
            },
            tertiary: {
                light: 'text-gray-600',
                dark: 'dark:text-gray-400',
                usage: 'Metadatos, fechas y texto de menor relevancia'
            },
            body: {
                light: 'text-gray-900',
                dark: 'dark:text-gray-200',
                usage: 'Texto de párrafos y contenido de tablas'
            },
            muted: {
                light: 'text-gray-500',
                dark: 'dark:text-gray-500',
                usage: 'Placeholders e iconos desactivados'
            }
        },

        // 2. Fondos (Siempre usar variante dark:)
        bg: {
            page: {
                light: 'bg-gray-50',
                dark: 'dark:bg-[#0f1419]', // Negro profundo para la página
            },
            card: {
                light: 'bg-white',
                dark: 'dark:bg-[#1a1f2e]', // Azul noche para tarjetas y modales
            },
            input: {
                light: 'bg-white',
                dark: 'dark:bg-[#0f1419]', // Fondo oscuro para inputs
            }
        },

        // 3. Bordes (Siempre usar variante dark:)
        border: {
            standard: {
                light: 'border-gray-200',
                dark: 'dark:border-gray-800',
            },
            subtle: {
                light: 'border-gray-100',
                dark: 'dark:border-gray-900',
            }
        }
    },

    accessibility: {
        minContrastRatio: '4.5:1 (WCAG AA)',
        notes: 'Nunca usar text-gray-400 o text-gray-500 en fondos blancos para contenido importante.'
    }
};
