"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { saveContact } from "@/src/actions/phone-contact"
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
import { Label } from "@/src/components/ui/label"
import { Textarea } from "@/src/components/ui/textarea"
import { splitPhones } from "@/src/lib/phone-contacts"
import { GroupPicker } from "./group-picker"

export type Contact = {
  id: string
  name: string
  phone: string
  otherPhones: string[]
  organization: string
  group: string | null
  notes: string | null
}

const EMPTY = { name: "", phone: "", otherPhones: "", organization: "", group: "", notes: "" }

/** Add (contact = "new") or edit a single contact. */
export function ContactDialog({
  contact,
  groups,
  onClose,
  onSaved,
}: {
  contact: Contact | "new" | null
  groups: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const editing = contact && contact !== "new" ? contact : null

  useEffect(() => {
    if (!contact) return
    setForm(
      contact === "new"
        ? EMPTY
        : {
            name: contact.name,
            phone: contact.phone,
            otherPhones: contact.otherPhones.join(", "),
            organization: contact.organization,
            group: contact.group ?? "",
            notes: contact.notes ?? "",
          }
    )
  }, [contact])

  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    const res = await saveContact(editing?.id ?? null, {
      name: form.name,
      phone: form.phone,
      otherPhones: splitPhones(form.otherPhones),
      organization: form.organization,
      group: form.group,
      notes: form.notes,
    })
    setSaving(false)
    if ("error" in res) {
      toast.error(res.error)
      return
    }
    toast.success(res.success)
    onSaved()
    onClose()
  }

  return (
    <Dialog open={!!contact} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit contact" : "Add contact"}</DialogTitle>
          <DialogDescription>The mobile number is what identifies a contact; it cannot be saved twice.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name" id="c-name">
            <Input id="c-name" value={form.name} onChange={(e) => set("name")(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile number" id="c-phone">
              <Input id="c-phone" inputMode="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
            </Field>
            <Field label="Group" id="c-group">
              <GroupPicker id="c-group" groups={groups} value={form.group} onChange={set("group")} />
            </Field>
          </div>
          <Field label="Other numbers (comma separated)" id="c-other">
            <Input id="c-other" value={form.otherPhones} onChange={(e) => set("otherPhones")(e.target.value)} />
          </Field>
          <Field label="Organization" id="c-org">
            <Input id="c-org" value={form.organization} onChange={(e) => set("organization")(e.target.value)} />
          </Field>
          <Field label="Notes" id="c-notes">
            <Textarea id="c-notes" rows={2} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="bg-pink-600 hover:bg-pink-700" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
