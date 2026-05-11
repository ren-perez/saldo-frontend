"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

// ── Interaction context ────────────────────────────────────────────────────────
// Separated from layout context so hover changes don't re-render panel sizing logic

interface MoneyFlowInteractionContextValue {
  focusedFlowKey: string | null
  hoveredFlowKey: string | null
  openNodes: Record<string, boolean>
  focusFlow: (key: string | null) => void
  sankeyFocus: (key: string | null) => void
  hoverFlow: (key: string | null) => void
  toggleNode: (key: string) => void
}

const MoneyFlowInteractionContext = createContext<MoneyFlowInteractionContextValue | null>(null)

// ── Layout context ─────────────────────────────────────────────────────────────

interface MoneyFlowLayoutContextValue {
  moneyFlowSplit: number
  setMoneyFlowSplit: (v: number) => void
}

const MoneyFlowLayoutContext = createContext<MoneyFlowLayoutContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────────

export function MoneyFlowProvider({ children }: { children: ReactNode }) {
  const [focusedFlowKey, setFocusedFlowKey] = useState<string | null>(null)
  const [hoveredFlowKey, setHoveredFlowKey] = useState<string | null>(null)
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({})
  const [moneyFlowSplit, setMoneyFlowSplit] = useState(60)

  const focusFlow = useCallback((key: string | null) => {
    setFocusedFlowKey((prev) => (prev === key ? null : key))
  }, [])

  const sankeyFocus = useCallback((key: string | null) => {
    setFocusedFlowKey((prev) => (prev === key ? null : key))
    if (key) {
      setOpenNodes((prev) => ({ ...prev, [key]: true }))
    }
  }, [])

  const hoverFlow = useCallback((key: string | null) => {
    setHoveredFlowKey(key)
  }, [])

  const toggleNode = useCallback((key: string) => {
    setOpenNodes((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return (
    <MoneyFlowLayoutContext.Provider value={{ moneyFlowSplit, setMoneyFlowSplit }}>
      <MoneyFlowInteractionContext.Provider value={{ focusedFlowKey, hoveredFlowKey, openNodes, focusFlow, sankeyFocus, hoverFlow, toggleNode }}>
        {children}
      </MoneyFlowInteractionContext.Provider>
    </MoneyFlowLayoutContext.Provider>
  )
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useMoneyFlowInteraction(): MoneyFlowInteractionContextValue {
  const ctx = useContext(MoneyFlowInteractionContext)
  if (!ctx) throw new Error("useMoneyFlowInteraction must be used inside MoneyFlowProvider")
  return ctx
}

export function useMoneyFlowLayout(): MoneyFlowLayoutContextValue {
  const ctx = useContext(MoneyFlowLayoutContext)
  if (!ctx) throw new Error("useMoneyFlowLayout must be used inside MoneyFlowProvider")
  return ctx
}

// ── Resize helper hook ─────────────────────────────────────────────────────────

export function useResizeHandler(containerRef: React.RefObject<HTMLDivElement | null>) {
  const { setMoneyFlowSplit } = useMoneyFlowLayout()

  const beginResize = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const el = containerRef.current
    if (!el) return
    e.preventDefault()
    document.body.classList.add("is-resizing-flow")
    const handleMove = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const split = ((ev.clientX - rect.left) / rect.width) * 100
      setMoneyFlowSplit(Math.max(40, Math.min(75, split)))
    }
    const handleUp = () => {
      document.body.classList.remove("is-resizing-flow")
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }, [containerRef, setMoneyFlowSplit])

  return { beginResize }
}
