'use client'

import { ExternalLink } from 'lucide-react'
import type { QuotationComment } from '../actions'

function isImageUrl(url: string, name?: string | null) {
  const n = (name || url).toLowerCase()
  return /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(n) || url.includes('/image')
}

export function QuotationAvanceListItem({ comment: c }: { comment: QuotationComment }) {
  const url = c.attachment_url
  const showImagenPlaceholder = c.body === 'Imagen adjunta' && url

  return (
    <li className="rounded-lg bg-white dark:bg-surface-900 border border-amber-100 dark:border-amber-500/20 px-3 py-2 text-sm">
      {!showImagenPlaceholder ? (
        <p className="text-gray-900 dark:text-surface-100 whitespace-pre-wrap">{c.body}</p>
      ) : null}
      {url ? (
        <div className={showImagenPlaceholder ? '' : 'mt-2'}>
          {isImageUrl(url, c.attachment_name) ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="block max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={c.attachment_name || 'Adjunto'}
                className="rounded-md border border-gray-200 max-h-40 w-auto object-contain"
              />
            </a>
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium"
            >
              {c.attachment_name || 'Ver adjunto'} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ) : null}
      <p className="text-[10px] text-gray-500 mt-1">
        {c.author?.full_name || 'Usuario'} · {new Date(c.created_at).toLocaleString('es-GT')}
      </p>
    </li>
  )
}
