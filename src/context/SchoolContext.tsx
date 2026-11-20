import { createContext, useContext } from 'react';
import { SchoolRole } from '../types';

export interface SchoolContextValue {
  schoolId: string;
  role: SchoolRole;
  readOnly: boolean;
}

export const SchoolContext = createContext<SchoolContextValue | null>(null);

export function useSchool(): SchoolContextValue {
  const ctx = useContext(SchoolContext);
  if (!ctx) {
    throw new Error('useSchool must be used within a SchoolContext.Provider');
  }
  return ctx;
}
