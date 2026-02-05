'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, User, Clock, Filter, X, Plus } from 'lucide-react'

type AuditLog = {
  id: string
  action: string
  module: string
  description: string
  user_name: string | null
  user_email: string | null
  user_role: string | null
  entity_type: string
  entity_reference: string | null
  data_before: any
  data_after: any
  changes_summary: any
  created_at: string
}

type AuditTimelineProps = {
  entityType: 'TICKET' | 'BATCH' | 'ASSET'
  entityId: string
  entityReference: string
  module?: string
  showAddComment?: boolean
}

const actionColors: Record<string, { bg: string; text: string; icon: string }> = {
  CREATE: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '✨' },
  UPDATE: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '📝' },
  DELETE: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '🗑️' },
  STATUS_CHANGE: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '🔄' },
  ASSIGN: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', icon: '👤' },
  MOVE: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '📦' },
  TRANSFER: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', icon: '🚚' },
  COMMENT: { bg: 'bg-slate-500/20', text: 'text-slate-300', icon: '💬' },
  LIQUIDATE: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: '💰' },
  RECEIVE: { bg: 'bg-teal-500/20', text: 'text-teal-400', icon: '📥' },
  DISPATCH: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '📤' },
  CLASSIFY: { bg: 'bg-pink-500/20', text: 'text-pink-400', icon: '🏷️' }
}

export default function AuditTimeline({
  entityType,
  entityId,
  entityReference,
  module,
  showAddComment = true
}: AuditTimelineProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [comment, setComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  // Filtros
  const [filterAction, setFilterAction] = useState<string | null>(null)
  const [filterUser, setFilterUser] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        entityType,
        entityId
      })

      if (module) params.append('module', module)
      if (filterAction) params.append('action', filterAction)
      if (filterUser) params.append('userId', filterUser)

      const response = await fetch(`/api/audit/comments?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Error al cargar el historial')
      }

      const data = await response.json()
      setLogs(data.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId, module, filterAction, filterUser])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleAddComment = async () => {
    if (!comment.trim()) return

    try {
      setSavingComment(true)

      const response = await fetch('/api/audit/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          entityReference,
          comment: comment.trim(),
          module: module || entityType
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar el comentario')
      }

      setComment('')
      setShowCommentForm(false)
      await fetchLogs()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingComment(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const uniqueActions = Array.from(new Set(logs.map(log => log.action)))
  const uniqueUsers = Array.from(new Set(logs.map(log => log.user_name).filter((u): u is string => !!u)))

  return (
    <div className="space-y-4">
      {/* Header con filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-surface-400" />
          <h3 className="text-lg font-semibold text-white">
            Historial de Auditoría
          </h3>
          <span className="px-2 py-0.5 bg-surface-800 rounded-full text-xs text-surface-400">
            {logs.length} registros
          </span>
        </div>

        <div className="flex items-center gap-2">
          {showAddComment && (
            <button
              onClick={() => setShowCommentForm(!showCommentForm)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors"
            >
              <Plus size={16} />
              Agregar Comentario
            </button>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <Filter size={18} className="text-surface-400" />
          </button>
        </div>
      </div>

      {/* Formulario de comentario */}
      {showCommentForm && (
        <div className="p-4 bg-surface-900 rounded-xl border border-surface-800">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escribe tu comentario..."
            className="w-full px-3 py-2 bg-surface-950 border border-surface-800 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:border-indigo-500 resize-none"
            rows={3}
            maxLength={1000}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-surface-500">
              {comment.length}/1000 caracteres
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCommentForm(false)
                  setComment('')
                }}
                className="px-3 py-1.5 text-sm text-surface-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddComment}
                disabled={savingComment || comment.trim().length < 3}
                className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingComment ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 bg-surface-900 rounded-xl border border-surface-800">
          <select
            value={filterAction || ''}
            onChange={(e) => setFilterAction(e.target.value || null)}
            className="px-3 py-1.5 bg-surface-950 border border-surface-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todas las acciones</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          <select
            value={filterUser || ''}
            onChange={(e) => setFilterUser(e.target.value || null)}
            className="px-3 py-1.5 bg-surface-950 border border-surface-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todos los usuarios</option>
            {uniqueUsers.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>

          {(filterAction || filterUser) && (
            <button
              onClick={() => {
                setFilterAction(null)
                setFilterUser(null)
              }}
              className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-surface-400">Cargando historial...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Timeline */}
      {!loading && !error && logs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-surface-400">No hay registros en el historial</p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="relative">
          {/* Línea vertical del timeline */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-surface-800" />

          <div className="space-y-4">
            {logs.map((log, index) => {
              const style = actionColors[log.action] || actionColors.UPDATE
              const isComment = log.action === 'COMMENT'

              return (
                <div key={log.id} className="relative pl-16">
                  {/* Icono circular en la línea */}
                  <div className={`absolute left-2 w-8 h-8 rounded-full ${style.bg} flex items-center justify-center border-2 border-surface-950`}>
                    <span className="text-sm">{style.icon}</span>
                  </div>

                  {/* Contenido del log */}
                  <div className={`p-4 rounded-xl border ${isComment ? 'bg-surface-900/50 border-surface-800' : 'bg-surface-900 border-surface-800'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${style.bg} ${style.text}`}>
                            {log.action}
                          </span>
                          {log.module && (
                            <span className="px-2 py-0.5 bg-surface-800 rounded text-xs text-surface-400">
                              {log.module}
                            </span>
                          )}
                        </div>

                        <p className="text-white mb-2">{log.description}</p>

                        <div className="flex items-center gap-3 text-xs text-surface-400">
                          {log.user_name && (
                            <div className="flex items-center gap-1">
                              <User size={12} />
                              <span>{log.user_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{formatDate(log.created_at)}</span>
                          </div>
                        </div>

                        {/* Mostrar cambios si existen */}
                        {log.changes_summary && Object.keys(log.changes_summary).length > 0 && !isComment && (
                          <div className="mt-3 p-2 bg-surface-950 rounded text-xs">
                            <div className="text-surface-500 font-semibold mb-1">Cambios:</div>
                            <pre className="text-surface-400 whitespace-pre-wrap">
                              {JSON.stringify(log.changes_summary, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
