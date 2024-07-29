import { useNuiEvent } from '@/hooks/useNuiEvent.ts';
import Menu from './components/Menu';
import { useExitListener } from './hooks/useExitListener';
import { creationFrameState, setCreationFrameState } from './state/graffiti';

function App() {
  const visible = creationFrameState();
  const setVisible = setCreationFrameState();

  useNuiEvent('setVisible', setVisible);
  useExitListener(setVisible);

  if (!visible) return <></>;
  return (
    <>
      <Menu />
    </>
  );
}

export default App;
