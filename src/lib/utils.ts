import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFirstName(user: { name?: string } | null): string {
  return user?.name?.split(' ')[0] ?? '';
}

export function computePartialPoints(pointsYes: number): number {
  return Math.floor(pointsYes / 2);
}
