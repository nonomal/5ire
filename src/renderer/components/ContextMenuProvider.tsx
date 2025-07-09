import React, { createContext, useContext, useEffect, useRef } from 'react';

type ContextMenuHandler = (command: string, params: any) => void;

interface ContextMenuManager {
  registerHandler: (
    type: string,
    id: string,
    handler: ContextMenuHandler,
  ) => void;
  unregisterHandler: (type: string, id: string) => void;
}

const ContextMenuContext = createContext<ContextMenuManager>({
  registerHandler: () => {},
  unregisterHandler: () => {},
});

export function ContextMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const handlersRef = useRef<Map<string, ContextMenuHandler>>(new Map());

  useEffect(() => {
    const handleContextMenuCommand = (command: unknown, params: unknown) => {
      const { type, id } = params as { type: string; id: string };
      const key = `${type}:${id}`;
      const handler = handlersRef.current.get(key);

      if (handler) {
        handler(command as string, params);
      } else {
        console.warn(`No handler found for key: ${key}`);
      }
    };

    // 使用 on 方法返回的 unsubscribe 函数
    const unsubscribeContextMenu = window.electron.ipcRenderer.on(
      'context-menu-command',
      handleContextMenuCommand,
    );

    console.log('ContextMenuProvider: Listeners registered');

    return () => {
      console.log('ContextMenuProvider: Cleaning up listeners');
      unsubscribeContextMenu();
    };
  }, []);

  const registerHandler = (
    type: string,
    id: string,
    handler: ContextMenuHandler,
  ) => {
    const key = `${type}:${id}`;
    handlersRef.current.set(key, handler);
  };

  const unregisterHandler = (type: string, id: string) => {
    const key = `${type}:${id}`;
    handlersRef.current.delete(key);
  };

  return (
    <ContextMenuContext.Provider value={{ registerHandler, unregisterHandler }}>
      {children}
    </ContextMenuContext.Provider>
  );
}

export const useContextMenu = () => useContext(ContextMenuContext);
