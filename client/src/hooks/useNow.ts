import { useEffect, useState } from 'react'

// The current time, refreshed every `intervalMs`. Used so "5 min ago" labels
// and cooldowns update on screen without any other state changing.
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
