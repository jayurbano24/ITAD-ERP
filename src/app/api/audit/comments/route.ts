import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type CommentPayload = {
  entityType: 'TICKET' | 'BATCH' | 'ASSET'
  entityId: string
  entityReference: string
  comment: string
  module: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload: CommentPayload = await request.json()
    const { entityType, entityId, entityReference, comment, module: moduleName } = payload

    // Validaciones
    if (!entityType || !entityId || !comment) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    if (comment.trim().length < 3) {
      return NextResponse.json(
        { error: 'El comentario debe tener al menos 3 caracteres' },
        { status: 400 }
      )
    }

    if (comment.length > 1000) {
      return NextResponse.json(
        { error: 'El comentario no puede exceder 1000 caracteres' },
        { status: 400 }
      )
    }

    // Obtener información del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    // Determinar IDs relacionados según el tipo de entidad
    let ticketId = null
    let batchId = null
    let assetId = null

    if (entityType === 'TICKET') {
      ticketId = entityId
    } else if (entityType === 'BATCH') {
      batchId = entityId
      // Obtener ticket_id del lote
      const { data: batch } = await supabase
        .from('batches')
        .select('ticket_id')
        .eq('id', entityId)
        .single()
      ticketId = batch?.ticket_id || null
    } else if (entityType === 'ASSET') {
      assetId = entityId
      // Obtener batch_id y ticket_id del asset
      const { data: asset } = await supabase
        .from('assets')
        .select('batch_id')
        .eq('id', entityId)
        .single()

      if (asset?.batch_id) {
        batchId = asset.batch_id
        const { data: batch } = await supabase
          .from('batches')
          .select('ticket_id')
          .eq('id', asset.batch_id)
          .single()
        ticketId = batch?.ticket_id || null
      }
    }

    // Insertar comentario en audit_logs
    const { data: auditLog, error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'COMMENT',
        module: moduleName.toUpperCase(),
        description: comment,
        user_id: user.id,
        user_name: profile?.full_name || user.email,
        user_email: user.email,
        user_role: profile?.role || 'user',
        entity_type: entityType,
        entity_id: entityId,
        entity_reference: entityReference,
        ticket_id: ticketId,
        batch_id: batchId,
        asset_id: assetId,
        changes_summary: {
          comment_length: comment.length,
          is_manual: true
        }
      })
      .select()
      .single()

    if (auditError) {
      console.error('Error inserting audit log:', auditError)
      return NextResponse.json(
        { error: 'Error al guardar el comentario' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      log: auditLog
    })
  } catch (error) {
    console.error('Error in add-comment:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Obtener historial de comentarios y logs para una entidad
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const moduleName = searchParams.get('module')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    // Filtros
    if (entityType && entityId) {
      query = query
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
    }

    if (moduleName) {
      query = query.eq('module', moduleName.toUpperCase())
    }

    if (action) {
      query = query.eq('action', action.toUpperCase())
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json(
        { error: 'Error al obtener el historial' },
        { status: 500 }
      )
    }

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error in get audit logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
