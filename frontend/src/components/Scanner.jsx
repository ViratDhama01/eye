import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';

const Scanner = ({ onResult }) => {
    const [file, setFile] = useState(null);
    const [stage, setStage] = useState('idle'); // idle, uploading, processing, done
    const [progressMsg, setProgressMsg] = useState('');

    const handleFile = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            startAnalysis(selected);
        }
    };

    const startAnalysis = async (selectedFile) => {
        setStage('uploading');
        const formData = new FormData();
        formData.append('file', selectedFile);

        const steps = [
            "Verifying image ocular integrity...",
            "Analyzing retinal vascular structures...",
            "Detecting microaneurysms and hemorrhages...",
            "Consulting Specialist Brain (EfficientNet)...",
            "Generating clinical findings..."
        ];

        try {
            // Start processing simulation while uploading/requesting
            setStage('processing');
            let stepIdx = 0;
            const interval = setInterval(() => {
                if (stepIdx < steps.length) {
                    setProgressMsg(steps[stepIdx]);
                    stepIdx++;
                }
            }, 1000);

            const response = await axios.post('http://localhost:8000/predict', formData);

            clearInterval(interval);
            setStage('done');
            setTimeout(() => onResult(response.data, selectedFile), 500);
        } catch (error) {
            console.error(error);
            setStage('idle');
            alert("Analysis failed. Please check backend connection.");
        }
    };

    return (
        <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center bg-background px-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-3xl w-full"
            >
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-extrabold text-white mb-4 italic tracking-tight underline decoration-accent-blue/30 underline-offset-8">
                        Diagnostic Scanner
                    </h2>
                    <p className="text-text-secondary">Upload a high-resolution retinal fundus scan for instant AI assessment.</p>
                </div>

                <AnimatePresence mode="wait">
                    {stage === 'idle' ? (
                        <motion.label
                            key="idle"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="group relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-white/10 rounded-[32px] bg-surface hover:bg-card hover:border-accent-blue/40 transition-all cursor-pointer overflow-hidden shadow-2xl"
                        >
                            <div className="absolute inset-0 bg-accent-blue/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="mb-6 p-6 bg-accent-blue/10 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                                    <Upload className="w-10 h-10 text-accent-blue" />
                                </div>
                                <p className="text-xl font-bold text-white mb-2">Upload Retina Scan</p>
                                <p className="text-text-secondary text-sm">Drag & drop image or browse files</p>
                            </div>
                            <input type="file" className="hidden" onChange={handleFile} accept="image/*" />
                        </motion.label>
                    ) : (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="w-full h-80 bg-card rounded-[32px] border border-white/5 flex flex-col items-center justify-center p-12 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
                                <motion.div
                                    className="h-full bg-accent-blue"
                                    initial={{ x: '-100%' }}
                                    animate={{ x: stage === 'done' ? '0%' : '50%' }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                />
                            </div>

                            <div className="mb-8 relative">
                                <Loader2 className="w-16 h-16 text-accent-blue animate-spin" />
                                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-accent-teal animate-pulse" />
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-4 italic tracking-wider">
                                {stage === 'done' ? 'Analysis Complete' : 'AI Brain Processing'}
                            </h3>
                            <p className="text-accent-teal font-medium tracking-wide animate-pulse h-6">
                                {progressMsg || 'Initializing secure connection...'}
                            </p>

                            <div className="mt-10 flex gap-1 justify-center">
                                {[...Array(5)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-2 h-2 rounded-full bg-accent-blue/20"
                                        animate={{ backgroundColor: ['rgba(77,163,255,0.2)', 'rgba(77,163,255,1)', 'rgba(77,163,255,0.2)'] }}
                                        transition={{ duration: 1, delay: i * 0.1, repeat: Infinity }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default Scanner;
