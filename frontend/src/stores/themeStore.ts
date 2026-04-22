import { create } from "zustand";

interface ThemeState {
  dark: boolean;
  toggle: () => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  dark: localStorage.getItem("theme") === "dark" || (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches),
  toggle: () => {
    const next = !get().dark;
    localStorage.setItem("theme", next ? "dark" : "light");
    set({ dark: next });
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  },
  init: () => {
    if (get().dark) {
      document.documentElement.classList.add("dark");
    }
  },
}));
