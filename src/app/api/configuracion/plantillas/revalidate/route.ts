import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST() {
    try {
        // Revalidar la página de plantillas
        revalidatePath('/dashboard/configuracion/plantillas', 'page')
        
        return NextResponse.json({
            message: 'Cache invalidado',
            success: true
        })
    } catch (error) {
        console.error('Error revalidating:', error)
        return NextResponse.json(
            { error: 'Error al invalidar cache' },
            { status: 500 }
        )
    }
}
