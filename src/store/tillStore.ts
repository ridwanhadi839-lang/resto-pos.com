import { create } from 'zustand';
import { OpenTillEntry } from '../types';

interface OpenTillState {
  openTillEntry: OpenTillEntry | null;
  setOpenTill: (payload: {
    amount: number;
    cashierName?: string;
    cashierUserId?: string;
  }) => OpenTillEntry;
  resetTillState: () => void;
}

export const useTillStore = create<OpenTillState>((set) => ({
  openTillEntry: null,

  setOpenTill: ({ amount, cashierName, cashierUserId }) => {
    const entry: OpenTillEntry = {
      id: `open-till-${Date.now()}`,
      amount,
      createdAt: new Date().toISOString(),
      cashierName,
      cashierUserId,
    };

    set(() => ({ openTillEntry: entry }));
    return entry;
  },

  resetTillState: () => set(() => ({ openTillEntry: null })),
}));
