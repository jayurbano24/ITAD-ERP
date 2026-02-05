'use client'
import React from 'react'

const DebugModule = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <div className="rounded-[2.25rem] border border-[#2a2d36] bg-[#14161b]/90 px-6 py-8 shadow-2xl backdrop-blur space-y-6 sticky top-6">
                    <div className="pb-6 border-b border-[#2a2d36]">
                        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gray-400 mb-3">Ticket</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DebugModule
