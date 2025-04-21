"use client"

import * as React from "react"

export interface ChartItem {
  label: string
  color: string
}

export interface ChartConfig {
  [key: string]: ChartItem
}

export interface ChartContextProps {
  config: ChartConfig
}

export const ChartContext = React.createContext<ChartContextProps | undefined>(undefined)

export function useChartContext() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChartContext must be used within a ChartProvider")
  }

  return context
}
