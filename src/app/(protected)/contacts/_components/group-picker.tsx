"use client"

import { useState } from "react"
import { Input } from "@/src/components/ui/input"

const NEW = "__new"

/**
 * A group dropdown (default + already used groups) with a "New group..." choice
 * that switches to a text box. `value` "" means no group.
 * With `commitOnDone` a typed name is only reported on Enter / leaving the box,
 * for pickers that save straight away (one per table row).
 */
export function GroupPicker({
  groups,
  value,
  onChange,
  noneLabel = "No group",
  commitOnDone = false,
  className = "",
  id,
}: {
  groups: string[]
  value: string
  onChange: (group: string) => void
  noneLabel?: string
  commitOnDone?: boolean
  className?: string
  id?: string
}) {
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState("")

  if (typing) {
    const text = commitOnDone ? draft : value
    const finish = () => {
      if (commitOnDone && draft.trim()) onChange(draft.trim())
      if (commitOnDone || !value.trim()) setTyping(false)
    }
    return (
      <Input
        id={id}
        autoFocus
        placeholder="Type new group name"
        value={text}
        onChange={(e) => (commitOnDone ? setDraft(e.target.value) : onChange(e.target.value))}
        onBlur={finish}
        onKeyDown={(e) => {
          if (e.key === "Enter") finish()
          if (e.key === "Escape") setTyping(false)
        }}
        className={className}
      />
    )
  }

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => {
        if (e.target.value !== NEW) onChange(e.target.value)
        else {
          setDraft("")
          setTyping(true)
          if (!commitOnDone) onChange("")
        }
      }}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${className}`}
    >
      <option value="">{noneLabel}</option>
      {groups.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
      {value && !groups.includes(value) && <option value={value}>{value}</option>}
      <option value={NEW}>+ New group...</option>
    </select>
  )
}
