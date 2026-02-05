import React from 'react';

/**
 * Componente visual para mostrar el historial de movimientos de un activo en modo oscuro.
 * @param {Object[]} history - Array de movimientos del activo
 */

const AssetTimeline = ({ history = [] }) => {
  return (
    <div className="bg-slate-900 rounded-2xl p-6 shadow-lg w-full max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">Historial del Activo</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700">
          <thead>
            <tr className="text-slate-300 text-xs uppercase bg-slate-800">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Diagnóstico</th>
              <th className="px-3 py-2">Reparación</th>
              <th className="px-3 py-2">Técnico</th>
              <th className="px-3 py-2">Sucursal</th>
              <th className="px-3 py-2">Comentario</th>
              <th className="px-3 py-2">Bodega</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {history.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 py-6">Sin movimientos registrados.</td>
              </tr>
            )}
            {history.map((item, idx) => {
              // Si no hay reparación, mostrar bodega
              const showBodega = !item.repair && item.bodega;
              // Mostrar todos los usuarios involucrados (usuarios array o fallback)
              let usuarios = [];
              if (Array.isArray(item.usuarios) && item.usuarios.length > 0) {
                usuarios = item.usuarios.filter(Boolean);
              } else if (item.technician) {
                usuarios = [item.technician];
              } else if (item.user_name) {
                usuarios = [item.user_name];
              }
              return (
                <tr key={idx} className="text-slate-200 text-sm">
                  <td className="px-3 py-2">{item.timestamp ? new Date(item.timestamp).toLocaleString('es-GT') : 'Sin fecha'}</td>
                  <td className="px-3 py-2">{item.status || item.action || ''}</td>
                  <td className="px-3 py-2">{item.diagnosis || ''}</td>
                  <td className="px-3 py-2">{item.repair || ''}</td>
                  <td className="px-3 py-2">{usuarios.length > 0 ? usuarios.join(', ') : ''}</td>
                  <td className="px-3 py-2">{item.branch || ''}</td>
                  <td className="px-3 py-2">{item.comment || item.comments || ''}</td>
                  <td className="px-3 py-2">{showBodega ? item.bodega : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssetTimeline;
