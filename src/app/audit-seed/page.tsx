'use client';

import { useState } from 'react';

export default function AuditSeedPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [debug, setDebug] = useState<string>('');

  const seedTestData = async () => {
    setLoading(true);
    setDebug('Iniciando inserción de datos...');
    try {
      const response = await fetch('/api/audit/test-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();
      setDebug(JSON.stringify(data, null, 2));

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: `Error: ${data.error || 'Error desconocido'}`
        });
        return;
      }

      setMessage({
        type: 'success',
        text: `✓ ${data.count || 0} registros de auditoría insertados exitosamente. Redirigiendo...`
      });

      // Redirigir a auditoría después de 2 segundos
      setTimeout(() => {
        window.location.href = '/dashboard/auditoria';
      }, 2000);
    } catch (error: any) {
      setDebug(error.message);
      setMessage({
        type: 'error',
        text: `Error: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface-900 rounded-lg p-8 border border-surface-700">
          <h1 className="text-2xl font-bold text-white mb-4">Generar Datos de Prueba</h1>
          <p className="text-surface-300 mb-6 text-sm">
            Esto insertará registros de auditoría de ejemplo para que puedas ver cómo funciona el sistema.
          </p>

          <button
            onClick={seedTestData}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            {loading ? 'Insertando...' : 'Insertar Datos de Prueba'}
          </button>

          {message && (
            <div
              className={`mt-4 p-4 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-900/30 text-green-300 border border-green-700'
                  : 'bg-red-900/30 text-red-300 border border-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          {debug && (
            <div className="mt-4 p-4 bg-surface-800 rounded-lg border border-surface-600">
              <p className="text-surface-400 text-xs font-mono whitespace-pre-wrap break-words">
                {debug}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
