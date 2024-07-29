import { useNuiEvent } from '@/hooks/useNuiEvent.ts';
import React from 'react';
import Menu from './components/Menu';
import { useExitListener } from './hooks/useExitListener';
import { isEnvBrowser } from './utils/misc';

function App() {
  const [visible, setVisible] = React.useState(isEnvBrowser());
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
