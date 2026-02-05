'use client'

import { useRef, useState, useEffect } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { Text } from '@/components/ui/Text'
import {
    Save,
    Printer,
    Loader2,
    Trash2,
    FileCode,
    Undo,
    Redo,
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Type
} from 'lucide-react'
import { DocumentTemplate, updateTemplate } from '../actions'
import { cn } from '@/lib/utils'

interface TemplateEditorProps {
    template: DocumentTemplate
    onSave: (id: string, content: string) => Promise<void>
    onDelete: (id: string) => Promise<void>
    insertTrigger?: { code: string; timestamp: number } | null
}

export function TemplateEditor({ template, onSave, onDelete, insertTrigger }: TemplateEditorProps) {
    const [content, setContent] = useState(template.content_html)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const editorRef = useRef<any>(null)

    useEffect(() => {
        setContent(template.content_html)
    }, [template.id, template.content_html])

    // Efecto para insertar variable cuando cambie el trigger
    useEffect(() => {
        if (insertTrigger && editorRef.current) {
            editorRef.current.insertContent(insertTrigger.code)
        }
    }, [insertTrigger])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await onSave(template.id, content)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) {
            setIsDeleting(true)
            try {
                await onDelete(template.id)
            } finally {
                setIsDeleting(false)
            }
        }
    }

    const insertVariable = (code: string) => {
        if (editorRef.current) {
            editorRef.current.insertContent(code)
        }
    }

    // Estilos personalizados para el editor para que se vea como una hoja
    const contentStyle = `
    body {
      background-color: #f3f4f6;
      display: flex;
      justify-content: center;
      padding: 2rem;
      font-family: 'Inter', sans-serif;
    }
    .mce-content-body {
      background-color: white;
      width: 8.5in;
      min-height: 11in;
      padding: 1in;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      margin: 0 auto;
    }
  `

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#0f1419]">
            {/* Toolbar superior (Estilo Zoho) */}
            <div className="h-14 bg-white dark:bg-[#1a1f2e] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-800 pr-4">
                        <Text variant="h3" className="text-sm font-black truncate max-w-[200px]">{template.name}</Text>
                        <Text variant="muted" className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded ml-2">
                            {template.category}
                        </Text>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => editorRef.current?.undo()}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
                            title="Deshacer"
                        >
                            <Undo className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => editorRef.current?.redo()}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
                            title="Rehacer"
                        >
                            <Redo className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-xs font-bold"
                    >
                        <Printer className="w-4 h-4" />
                        Vista previa
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all text-xs font-bold"
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Eliminar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md active:scale-95 text-xs font-bold disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Guardar Plantilla
                    </button>
                </div>
            </div>

            {/* Área del Editor */}
            <div className="flex-1 overflow-hidden relative">
                <Editor
                    tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@7/tinymce.min.js"
                    onInit={(_evt: any, editor: any) => editorRef.current = editor}
                    value={content}
                    onEditorChange={(newContent: string) => setContent(newContent)}
                    init={{
                        height: '100%',
                        menubar: false,
                        plugins: [
                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                        ],
                        toolbar: 'undo redo | blocks fontfamily fontsize | ' +
                            'bold italic underline strikethrough | alignleft aligncenter ' +
                            'alignright alignjustify | bullist numlist outdent indent | ' +
                            'image table | forecolor backcolor removeformat | code preview help',
                        content_style: contentStyle,
                        branding: false,
                        skin: 'oxide',
                        promotion: false,
                        license_key: 'gpl',
                        images_upload_handler: (blobInfo: any, progress: any) => new Promise((resolve, reject) => {
                            const formData = new FormData();
                            formData.append('file', blobInfo.blob(), blobInfo.filename());

                            fetch('/api/templates/upload', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => {
                                    if (!response.ok) {
                                        return response.json().then(err => {
                                            throw new Error(err.error || 'Upload failed');
                                        });
                                    }
                                    return response.json();
                                })
                                .then(json => {
                                    if (typeof json.location !== 'string') {
                                        throw new Error('Invalid JSON: ' + JSON.stringify(json));
                                    }
                                    resolve(json.location);
                                })
                                .catch(error => {
                                    reject('Error de subida: ' + error.message);
                                });
                        }),
                        setup: (editor: any) => {
                            editor.on('init', () => {
                                // Forzar la visibilidad del cuerpo si el cloud loader intentó ocultarlo
                                editor.getContainer().style.transition = 'opacity 0.5s';
                                editor.getContainer().style.opacity = '1';
                            });
                        }
                    }}
                />
            </div>

            {/* Mini footer de variables (opcional para feedback) */}
            <div className="h-8 bg-emerald-600/5 border-t border-emerald-500/10 px-4 flex items-center justify-between text-[10px] text-emerald-600/70 font-medium">
                <span>Diseñando plantilla: {template.slug}</span>
                <div className="flex items-center gap-3">
                    <span>{content.length} caracteres</span>
                    <span className="flex items-center gap-1">
                        <FileCode className="w-3 h-3" />
                        ITAD Document Engine v1.0
                    </span>
                </div>
            </div>
        </div>
    )
}
