import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, Download, ExternalLink, Info, Image as ImageIcon, Map, Sparkles } from 'lucide-react';

const Dashboard = ({ result, originalImage }) => {
    const [view, setView] = useState('overlay'); // heatmap, original, overlay

    const originalUrl = originalImage ? URL.createObjectURL(originalImage) : '';

    return (
        <div className="min-h-screen pt-32 pb-20 px-[5%] bg-background">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">

                {/* Left Panel: Diagnosis Card */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex-1 space-y-6"
                >
                    <div className="card-premium p-8">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <p className="text-accent-blue font-bold text-sm tracking-widest uppercase mb-2">Diagnosis Result</p>
                                <h3 className="text-4xl font-extrabold text-white mb-2 italic tracking-tight">{result.diagnosis}</h3>
                                <p className="text-text-secondary font-medium">Stage Assessment: {result.diagnosis.split(' ')[0]}</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-3xl font-black text-accent-teal">+{result.confidence}%</span>
                                <span className="text-text-muted text-xs uppercase tracking-widest">Confidence</span>
                            </div>
                        </div>

                        {/* Risk Bar */}
                        <div className="space-y-4 mb-10">
                            <div className="flex justify-between text-xs font-bold text-text-secondary uppercase tracking-tighter">
                                <span>Risk Level</span>
                                <span>{result.confidence > 50 ? 'Moderate' : 'Low'} Severity</span>
                            </div>
                            <div className="h-4 bg-background rounded-full overflow-hidden border border-white/5 relative">
                                <div className="h-full bg-gradient-to-r from-accent-teal via-yellow-400 to-accent-red opacity-80" />
                                <motion.div
                                    initial={{ left: 0 }}
                                    animate={{ left: `${Math.min(result.confidence, 95)}%` }}
                                    className="absolute top-0 w-2 h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-text-muted font-bold">
                                <span>LOW</span>
                                <span>MODERATE</span>
                                <span>HIGH</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <ActionButton icon={<Download className="w-5 h-5" />} label="Export PDF" />
                            <ActionButton icon={<ExternalLink className="w-5 h-5" />} label="Consult Dr." primary />
                        </div>
                    </div>

                    {/* AI Clinical Report Panel */}
                    <div className="card-premium p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Info className="w-24 h-24" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2 italic">
                            <Activity className="w-5 h-5 text-accent-teal" />
                            Clinical Intelligence Brief
                        </h4>
                        <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap italic border-l-2 border-accent-teal/30 pl-4 py-2 bg-accent-teal/5 rounded-r-xl">
                            {result.report}
                        </p>
                    </div>
                </motion.div>

                {/* Right Panel: Retina Heatmap Viewer */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:w-1/2 flex flex-col gap-6"
                >
                    <div className="card-premium p-4 flex flex-col h-full min-h-[500px]">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <span className="text-sm font-bold text-white italic tracking-widest uppercase">Visualization Engine</span>
                            <div className="flex bg-background p-1 rounded-xl border border-white/5">
                                <ViewToggle active={view === 'original'} onClick={() => setView('original')} icon={<ImageIcon className="w-4 h-4" />} />
                                <ViewToggle active={view === 'heatmap'} onClick={() => setView('heatmap')} icon={<Map className="w-4 h-4" />} />
                                <ViewToggle active={view === 'overlay'} onClick={() => setView('overlay')} icon={<Sparkles className="w-4 h-4" />} />
                            </div>
                        </div>

                        <div className="relative flex-1 bg-background rounded-2xl overflow-hidden group border border-white/5">
                            <img
                                src={view === 'original' ? originalUrl : result.heatmap}
                                alt="Scan"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />

                            <div className="absolute bottom-4 left-4 flex gap-2">
                                <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white border border-white/10 uppercase tracking-tighter italic">
                                    {view} View
                                </span>
                                <span className="px-3 py-1 bg-accent-blue/20 backdrop-blur-md rounded-lg text-[10px] font-bold text-accent-blue border border-accent-blue/30 uppercase tracking-tighter italic">
                                    Grad-CAM Active
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

            </div>
        </div>
    );
};

const ActionButton = ({ icon, label, primary }) => (
    <button className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all active:scale-95 ${primary ? 'bg-accent-blue text-white shadow-lg' : 'bg-surface text-text-secondary border border-white/5 hover:bg-card-hover hover:text-white'}`}>
        {icon}
        <span className="text-sm italic">{label}</span>
    </button>
);

const ViewToggle = ({ active, onClick, icon }) => (
    <button
        onClick={onClick}
        className={`p-2 rounded-lg transition-all ${active ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20' : 'text-text-muted hover:text-white'}`}
    >
        {icon}
    </button>
);

export default Dashboard;
