import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export const GameOverOverlay = () => {
    const isGameOver = useGameStore((state) => state.isGameOver);
    const gameOverReason = useGameStore((state) => state.gameOverReason);
    const resetToStoryState = useGameStore((state) => state.resetToStoryState);
    const gameMode = useGameStore((state) => state.gameMode);
    const setGameMode = useGameStore((state) => state.setGameMode);

    if (!isGameOver) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="max-w-md w-full p-8 rounded-2xl border border-red-500/50 bg-gray-900/90 shadow-2xl shadow-red-500/20 text-center"
                >
                    <div className="text-red-500 text-6xl mb-4 font-black tracking-tighter italic">GAME OVER</div>

                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8">
                        <p className="text-red-200 text-sm font-medium leading-relaxed">
                            {gameOverReason || "The system has encountered a critical failure."}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                if (gameMode === 'story') {
                                    resetToStoryState();
                                } else {
                                    // Handle sandbox reset if needed
                                    useGameStore.setState({ isGameOver: false, gameOverReason: null, isPaused: false, money: 10000 });
                                }
                            }}
                            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/40 active:scale-95"
                        >
                            RETRY MISSION
                        </button>

                        <button
                            onClick={() => {
                                setGameMode(null);
                                useGameStore.setState({ isGameOver: false, gameOverReason: null });
                            }}
                            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl transition-all active:scale-95"
                        >
                            QUIT TO MENU
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
