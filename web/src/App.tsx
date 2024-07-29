import { useNuiEvent } from '@/hooks/useNuiEvent.ts';
import Menu from './components/Menu';
import { useExitListener } from './hooks/useExitListener';
import { setCreationFrameState } from './state/graffiti';

function App() {
  const visible = setCreationFrameState();

  useNuiEvent('setVisible', visible);
  useExitListener(visible);

  return (
    <>
      <Menu />
    </>
  );
}

export default App;
