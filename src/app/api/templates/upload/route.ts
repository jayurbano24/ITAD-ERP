import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            )
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'Only image files are allowed' },
                { status: 400 }
            )
        }

        const bucket = 'template_assets'
        const timestamp = Date.now()
        const randomToken = Math.random().toString(36).slice(2, 8)
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath = `images/${timestamp}-${randomToken}-${safeName}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            })

        if (uploadError) {
            console.error('Error uploading template image:', uploadError)
            return NextResponse.json(
                { error: `Error uploading image: ${uploadError.message}` },
                { status: 500 }
            )
        }

        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath)

        return NextResponse.json({ location: urlData.publicUrl })
    } catch (error: any) {
        console.error('Error in /api/templates/upload:', error)
        return NextResponse.json(
            { error: error.message || 'Unknown error' },
            { status: 500 }
        )
    }
}
