import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, ClipboardList, TrendingUp } from 'lucide-react';

const History = () => {
    const scans = [
        { id: 'P001', name: 'John Doe', date: '2026-03-09', diagnosis: 'Moderate DR', risk: 'Moderate', trend: '+2%' },
        { id: 'P002', name: 'Jane Smith', date: '2026-03-08', diagnosis: 'Healthy', risk: 'Low', trend: '0%' },
        { id: 'P003', name: 'Robert Brown', date: '2026-03-07', diagnosis: 'Mild DR', risk: 'Low', trend: '+1%' },
        { id: 'P004', name: 'Emily Davis', date: '2026-03-05', diagnosis: 'Severe DR', risk: 'High', trend: '+5%' },
    ];

    return (
        <div className="min-h-screen pt-32 pb-20 px-[5%] bg-background">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-4xl font-extrabold text-white mb-2 italic tracking-tight">Patient History</h2>
                        <p className="text-text-secondary">Historical diagnostic data and progression tracking.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="p-4 bg-card border border-white/5 rounded-2xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-accent-blue/10 rounded-xl flex items-center justify-center">
                                <ClipboardList className="w-5 h-5 text-accent-blue" />
                            </div>
                            <div>
                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Total Scans</p>
                                <p className="text-xl font-bold text-white leading-none">1,284</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card-premium overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-surface/50 border-b border-white/5 text-text-muted uppercase text-[10px] font-bold tracking-widest">
                            <tr>
                                <th className="px-8 py-6">Patient ID</th>
                                <th className="px-8 py-6">Scan Date</th>
                                <th className="px-8 py-6">Diagnosis</th>
                                <th className="px-8 py-6">Risk Level</th>
                                <th className="px-8 py-6">Trend</th>
                                <th className="px-8 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {scans.map((scan) => (
                                <tr key={scan.id} className="hover:bg-card-hover transition-colors group">
                                    <td className="px-8 py-6 font-bold text-white flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-[10px] text-accent-blue border border-white/10">
                                            <User className="w-4 h-4" />
                                        </div>
                                        {scan.name}
                                    </td>
                                    <td className="px-8 py-6 text-text-secondary">{scan.date}</td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-accent-blue/10 text-accent-blue rounded-full text-[10px] font-bold uppercase">
                                            {scan.diagnosis}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${scan.risk === 'High' ? 'bg-accent-red' : scan.risk === 'Moderate' ? 'bg-yellow-400' : 'bg-accent-teal'}`} />
                                            <span className="text-text-secondary">{scan.risk}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-accent-teal flex items-center gap-1 font-bold italic">
                                        <TrendingUp className="w-4 h-4" />
                                        {scan.trend}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="text-text-muted hover:text-white transition-colors underline decoration-accent-blue/0 hover:decoration-accent-blue font-bold italic">
                                            View Report
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default History;
