import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Brain, FileText, ArrowRight } from 'lucide-react';

const Landing = ({ onStart }) => {
    return (
        <div className="relative min-h-screen pt-32 pb-20 overflow-hidden bg-background">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent-blue/10 rounded-full blur-[120px] -mr-40 -mt-40" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-teal/5 rounded-full blur-[100px] -ml-20 -mb-20" />

            <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter text-white mb-6">
                        AI Eye <span className="text-accent-blue">Diagnostic</span> System
                    </h1>
                    <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
                        Advanced medical-grade retinal disease detection powered by custom-trained deep learning models.
                        Trusted by professionals for precision diagnostics.
                    </p>

                    <button
                        onClick={onStart}
                        className="group relative px-8 py-4 bg-accent-blue rounded-2xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(77,163,255,0.3)]"
                    >
                        <div className="flex items-center gap-2">
                            Start AI Scan
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                </motion.div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 px-4">
                    <FeatureCard
                        icon={<Shield className="w-8 h-8 text-accent-blue" />}
                        title="Smart Eye Detection"
                        description="Automatic orientation and eye-type detection powered by specialized routing algorithms."
                    />
                    <FeatureCard
                        icon={<Brain className="w-8 h-8 text-accent-teal" />}
                        title="Deep Learning"
                        description="High-precision EfficientNet architecture trained on 100k+ clinical images."
                    />
                    <FeatureCard
                        icon={<FileText className="w-8 h-8 text-orange-400" />}
                        title="Clinical Reports"
                        description="Auto-generated medical records with disease severity scoring and LLM explanations."
                    />
                </div>
            </div>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <motion.div
        whileHover={{ y: -5, borderColor: 'rgba(77, 163, 255, 0.4)' }}
        className="p-8 rounded-3xl bg-card border border-white/5 text-left transition-all duration-500 hover:bg-card-hover"
    >
        <div className="mb-6 bg-background/40 w-16 h-16 flex items-center justify-center rounded-2xl border border-white/10 shadow-inner">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-text-secondary leading-relaxed text-sm">
            {description}
        </p>
    </motion.div>
);

export default Landing;
