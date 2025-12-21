import { Board } from './components/board/Board';
import { ServicePalette } from './components/ui/ServicePalette';
import { Legend } from './components/ui/Legend';
import { TrafficControl } from './components/ui/TrafficControl';
import { StatsHUD } from './components/ui/StatsHUD';
import { Alerts } from './components/ui/Alerts';
import { Inspector } from './components/ui/Inspector';
import { StartScreen } from './components/ui/StartScreen';
import { MessageCenter } from './components/ui/MessageCenter';
import { StoryManager } from './engine/StoryManager';
import { MissionBriefing } from './components/ui/MissionBriefing';
import { GameOverOverlay } from './components/ui/GameOverOverlay';
import { useGameStore } from './store/gameStore';

function App() {
  const gameMode = useGameStore((state) => state.gameMode);

  return (
    <div className="h-screen w-screen bg-black text-white relative">
      <StoryManager />
      <MissionBriefing />
      <MessageCenter />
      <Alerts />
      <GameOverOverlay />

      <Board />

      {/* Game UI - Only show when playing */}
      {gameMode && (
        <>
          <Inspector />
          <div className="absolute top-4 left-4 z-50 flex flex-col gap-4 items-start pointer-events-none">
            <StatsHUD />
          </div>

          <div className="absolute top-4 right-4 z-50 flex flex-col gap-4 items-end pointer-events-none">
            {gameMode === 'sandbox' && <TrafficControl />}
            <Inspector />
          </div>
          <ServicePalette />
          <Legend />
        </>
      )}

      {/* Main Menu */}
      {!gameMode && <StartScreen />}
    </div>
  );
}

export default App;
