import React from 'react';
import { Eye, Shield, Activity, FileText } from 'lucide-react';

const Navbar = ({ setPage }) => {
    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-[5%] py-4 flex justify-between items-center">
            <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setPage('landing')}
            >
                <div className="p-2 bg-accent-blue/10 rounded-lg group-hover:bg-accent-blue/20 transition-colors">
                    <Eye className="text-accent-blue w-6 h-6" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">Eye AI</span>
            </div>

            <div className="flex items-center gap-8 text-sm font-medium text-text-secondary">
                {['Dashboard', 'Patients', 'Reports', 'About'].map((item) => (
                    <button
                        key={item}
                        className="hover:text-white transition-colors"
                        onClick={() => setPage(item.toLowerCase() === 'dashboard' ? 'scanner' : item.toLowerCase())}
                    >
                        {item}
                    </button>
                ))}
            </div>

            <div className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center hover:bg-card transition-colors cursor-pointer">
                <span className="text-xs font-bold text-accent-blue">JD</span>
            </div>
        </nav>
    );
};

export default Navbar;
