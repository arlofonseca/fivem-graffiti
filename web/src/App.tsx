import { useNuiEvent } from '@/hooks/useNuiEvent.ts';
import { useExitListener } from './hooks/useExitListener';
import { creationFrameState, setCreationFrameState } from './state/graffiti';
import React from 'react';

const MenuComponent = React.lazy(() => import('./components/Menu'));

function App() {
  const visible = creationFrameState();
  const setVisible = setCreationFrameState();

  useNuiEvent('setVisible', setVisible);
  useExitListener(setVisible);

  if (!visible) return <></>;

  return (
    <>
      <React.Suspense fallback={<></>}>
        <MenuComponent />
      </React.Suspense>
    </>
  );
}

export default App;
