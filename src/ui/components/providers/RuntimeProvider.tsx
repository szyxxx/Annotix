import React, { createContext, useContext, ReactNode } from 'react';
import { ApplicationRuntime, appRuntime } from '../../../core/runtime';

const RuntimeContext = createContext<ApplicationRuntime | null>(null);

interface RuntimeProviderProps {
  children: ReactNode;
}

export const RuntimeProvider: React.FC<RuntimeProviderProps> = ({ children }) => {
  return (
    <RuntimeContext.Provider value={appRuntime}>
      {children}
    </RuntimeContext.Provider>
  );
};

export const useRuntimeInternal = () => useContext(RuntimeContext);
