import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_STAFFS, type StaffDefault } from "@/lib/ai/staff-defaults";

export interface AiStaff extends StaffDefault {
  id: string;
  name: string;
}

interface StaffStore {
  staffs: AiStaff[];
  addStaff: (staff: AiStaff) => void;
  updateStaff: (id: string, data: Partial<AiStaff>) => void;
  removeStaff: (id: string) => void;
  resetToDefaults: () => void;
}

export const useStaffStore = create<StaffStore>()(
  persist(
    (set) => ({
      staffs: DEFAULT_STAFFS.map((s, i) => ({
        ...s,
        id: `staff-${i}`,
        name: "",
      })),
      addStaff: (staff) =>
        set((state) => ({ staffs: [...state.staffs, staff] })),
      updateStaff: (id, data) =>
        set((state) => ({
          staffs: state.staffs.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        })),
      removeStaff: (id) =>
        set((state) => ({
          staffs: state.staffs.filter((s) => s.id !== id),
        })),
      resetToDefaults: () =>
        set({
          staffs: DEFAULT_STAFFS.map((s, i) => ({
            ...s,
            id: `staff-${i}`,
            name: "",
          })),
        }),
    }),
    { name: "telemon-staff" }
  )
);
