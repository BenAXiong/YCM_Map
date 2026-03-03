import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ReloadPrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered');
            if (r) {
                // Check for updates every hour
                setInterval(() => {
                    r.update();
                }, 60 * 60 * 1000);

                // Also check when the app/tab gains focus
                window.addEventListener('focus', () => {
                    r.update();
                });
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setNeedRefresh(false);
    };

    return (
        <AnimatePresence>
            {needRefresh && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm pointer-events-none"
                >
                    <div className="bg-white/95 backdrop-blur-xl border border-stone-200 shadow-2xl rounded-3xl p-4 flex items-center gap-4 pointer-events-auto">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin-slow" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-stone-800 leading-tight">
                                New Update Available
                            </p>
                            <p className="text-[11px] text-stone-500 font-medium">
                                Tap to refresh and see latest changes
                            </p>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => updateServiceWorker(true)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-colors shadow-lg shadow-emerald-200 active:scale-95"
                            >
                                UPDATE
                            </button>
                            <button
                                onClick={() => close()}
                                className="p-2 hover:bg-stone-50 rounded-xl transition-colors text-stone-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ReloadPrompt;
