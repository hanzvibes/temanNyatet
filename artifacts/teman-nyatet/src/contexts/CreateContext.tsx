import React, { createContext, useContext, useState, useCallback } from 'react';

export type CreateSection = 'note' | 'keuangan' | 'todo' | 'link' | null;

type CreateContextType = {
  pendingCreate: CreateSection;
  triggerCreate: (section: CreateSection) => void;
  clearCreate: () => void;
};

const CreateContext = createContext<CreateContextType>({
  pendingCreate: null,
  triggerCreate: () => {},
  clearCreate: () => {},
});

export function CreateProvider({ children }: { children: React.ReactNode }) {
  const [pendingCreate, setPendingCreate] = useState<CreateSection>(null);

  const triggerCreate = useCallback((section: CreateSection) => {
    setPendingCreate(section);
  }, []);

  const clearCreate = useCallback(() => {
    setPendingCreate(null);
  }, []);

  return (
    <CreateContext.Provider value={{ pendingCreate, triggerCreate, clearCreate }}>
      {children}
    </CreateContext.Provider>
  );
}

export const useCreate = () => useContext(CreateContext);
