"use client"

import * as React from "react"

import { useAccessibility } from "@/lib/accessibility-context"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AccessibilityToggle() {
  const { highContrastMode, simpleMode, setHighContrastMode, setSimpleMode } = useAccessibility()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aksesibilitas</CardTitle>
        <CardDescription>
          Sesuaikan tampilan sesuai kebutuhan Anda
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="high-contrast-mode" className="flex flex-col space-y-1">
            <span className="font-medium">Mode Kontras Tinggi</span>
            <span className="font-normal text-sm text-muted-foreground">
              Tingkatkan kontras warna untuk visibilitas yang lebih baik
            </span>
          </Label>
          <Switch
            id="high-contrast-mode"
            checked={highContrastMode}
            onCheckedChange={setHighContrastMode}
          />
        </div>
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="simple-mode" className="flex flex-col space-y-1">
            <span className="font-medium">Mode Sederhana</span>
            <span className="font-normal text-sm text-muted-foreground">
              Sembunyikan fitur lanjutan untuk tampilan yang lebih bersih
            </span>
          </Label>
          <Switch
            id="simple-mode"
            checked={simpleMode}
            onCheckedChange={setSimpleMode}
          />
        </div>
      </CardContent>
    </Card>
  )
}
