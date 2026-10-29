"use client"

import { useState } from "react"
import { toast } from "sonner"
import { importContacts, type ImportRow } from "@/src/actions/phone-contact"
import { Button } from "@/src/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { Input } from "@/src/components/ui/input"
import ProgressBar from "@/src/components/ui/progress"
import { csvToContacts, tableToContacts } from "./csv"
import { readXlsx } from "./xlsx"

const BATCH = 1000

export function ImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean
  onClose: () => void
  onImported: () => void
}) {
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [fileError, setFileError] = useState("")
  const [done, setDone] = useState(0)
  const [running, setRunning] = useState(false)

  const reset = () => {
    setRows(null)
    setFileError("")
    setDone(0)
  }

  const handleFile = async (file?: File) => {
    reset()
    if (!file) return
    try {
      const parsed = /\.xls[xm]$/i.test(file.name)
        ? tableToContacts(await readXlsx(await file.arrayBuffer()))
        : csvToContacts(await file.text())
      if (parsed.error) setFileError(parsed.error)
      else setRows(parsed.rows)
    } catch (e) {
      console.error(e)
      setFileError("Could not read this file. Use a .csv, .xlsx or .xlsm file.")
    }
  }

  const withPhone = rows?.filter((r) => r.phones.length).length ?? 0

  const handleImport = async () => {
    if (!rows) return
    setRunning(true)
    const total = { added: 0, skipped: 0, invalid: 0 }
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const res = await importContacts(rows.slice(i, i + BATCH))
        if ("error" in res) {
          toast.error(res.error)
          break
        }
        total.added += res.added
        total.skipped += res.skipped
        total.invalid += res.invalid
        setDone(Math.min(i + BATCH, rows.length))
      }
      toast.success(
        `${total.added} added · ${total.skipped} already saved / repeated · ${total.invalid} without a number`
      )
      onImported()
      reset()
      onClose()
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o || running) return
        reset()
        onClose()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import contacts</DialogTitle>
          <DialogDescription>
            Choose the CSV exported from Google Contacts, or an Excel file (.xlsx / .xlsm) with Name, Mobile Number
            and Organization columns. Numbers already saved here are skipped, so their groups are kept.
          </DialogDescription>
        </DialogHeader>
        <Input type="file" accept=".csv,.xlsx,.xlsm,text/csv" disabled={running} onChange={(e) => handleFile(e.target.files?.[0])} />
        {fileError && <p className="text-sm text-red-600">{fileError}</p>}
        {rows && (
          <p className="text-sm text-gray-700">
            {rows.length.toLocaleString("en-IN")} rows found, {withPhone.toLocaleString("en-IN")} with a mobile number.
          </p>
        )}
        {running && rows && <ProgressBar progress={(done / rows.length) * 100} className="bg-pink-600" />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={running}>
            Cancel
          </Button>
          <Button className="bg-pink-600 hover:bg-pink-700" onClick={handleImport} disabled={!withPhone || running}>
            {running ? `Importing ${done}/${rows?.length}...` : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
