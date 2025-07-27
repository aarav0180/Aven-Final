export const getStoredTheme = (): boolean => {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem("aven-dark-mode")
  return stored ? JSON.parse(stored) : false
}

export const setStoredTheme = (isDark: boolean): void => {
  if (typeof window === "undefined") return
  localStorage.setItem("aven-dark-mode", JSON.stringify(isDark))
}
