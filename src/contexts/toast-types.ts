export interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning'
  duration?: number
}

export interface Toast extends Required<Omit<ToastOptions, 'duration'>> {
  id: string
  duration: number
}
