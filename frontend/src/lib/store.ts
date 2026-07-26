import { create } from "zustand";
import type { User } from "./api";

const USER_KEY = "annotix.user";

function loadUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? "null");
  } catch {
    return null;
  }
}

interface SessionState {
  user: User | null;
  setUser: (user: User) => void;
}

export const useSession = create<SessionState>((set) => ({
  user: loadUser(),
  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));
