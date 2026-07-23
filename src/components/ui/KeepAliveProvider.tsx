"use client";

import { useEffect, useRef, createContext, useContext, type ReactNode } from "react";

interface KeepAliveContextType { register: (key: string, node: ReactNode) => void; unregister: (key: string) => void; get: (key: string) => ReactNode | null; }
const KeepAliveContext = createContext<KeepAliveContextType>({ register: () => {}, unregister: () => {}, get: () => null });
export const useKeepAlive = () => useContext(KeepAliveContext);

export function KeepAliveProvider({ children }: { children: ReactNode }) {
  const cache = useRef<Map<string, ReactNode>>(new Map());
  const register = (key: string, node: ReactNode) => cache.current.set(key, node);
  const unregister = (key: string) => cache.current.delete(key);
  const get = (key: string) => cache.current.get(key) || null;
  return <KeepAliveContext.Provider value={{ register, unregister, get }}>{children}</KeepAliveContext.Provider>;
}
