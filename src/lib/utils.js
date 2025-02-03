import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  const merged = twMerge(clsx(inputs));
  
  // Debug in development mode
  if (process.env.NODE_ENV === "development") {
    console.debug("Merged Classes:", merged);
  }
  
  return merged;
}