import { Board } from './components/board/Board';
import { ServicePalette } from './components/ui/ServicePalette';
import { Legend } from './components/ui/Legend';
import { TrafficControl } from './components/ui/TrafficControl';
import { StatsHUD } from './components/ui/StatsHUD';
import { Alerts } from './components/ui/Alerts';
import { Inspector } from './components/ui/Inspector';

function App() {
  return (
    <div className="h-screen w-screen bg-black text-white relative">
      <Alerts />
      <Board />
      <Inspector />

      {/* Sidebar Layout */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-4 items-start pointer-events-none">
        <StatsHUD />
        <TrafficControl />
      </div>

      <ServicePalette />
      <Legend />
    </div>
  );
}

export default App;
