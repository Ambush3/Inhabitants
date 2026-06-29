import React from 'react';
import * as Burnt from 'burnt';

type ToastOptions = { duration?: number };

function show(
  title: string,
  preset: 'done' | 'error' | 'none',
  haptic: 'success' | 'error' | 'warning' | 'none',
  opts?: ToastOptions
) {
  Burnt.toast({
    title,
    preset,
    haptic,
    duration: opts?.duration ?? 2.5,
    from: 'top',
  });
}

const api = {
  show: (message: string, opts?: ToastOptions) => show(message, 'none', 'none', opts),
  success: (message: string, opts?: ToastOptions) => show(message, 'done', 'success', opts),
  error: (message: string, opts?: ToastOptions) => show(message, 'error', 'error', opts),
  info: (message: string, opts?: ToastOptions) => show(message, 'none', 'none', opts),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useToast() {
  return api;
}
