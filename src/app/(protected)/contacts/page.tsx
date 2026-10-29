"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  deleteContacts,
  exportContacts,
  getContacts,
  setContactsGroup,
  type ContactTarget,
} from "@/src/actions/phone-contact"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"
import { ChevronLeft, ChevronRight, Download, Pencil, Plus, RefreshCw, Search, Trash2, Upload, X } from "lucide-react"
import { useCan } from "@/src/components/auth/permissions-provider"
import { DEFAULT_CONTACT_GROUPS, NO_GROUP } from "@/src/lib/phone-contacts"
import { ContactDialog, type Contact } from "./_components/contact-dialog"
import { ImportDialog } from "./_components/import-dialog"
import { GroupPicker } from "./_components/group-picker"
import { downloadText, toCsv } from "./_components/csv"

const PAGE_SIZE = 50

/** "+919316805311" -> "+91 93168 05311": readable, and Excel keeps it as text. */
const spacedPhone = (p: string) => (/^\+91\d{10}$/.test(p) ? `+91 ${p.slice(3, 8)} ${p.slice(8)}` : p)

export default function PhoneContactsPage() {
  const canCreate = useCan("contacts.create")
  const canEdit = useCan("contacts.edit")
  const canDelete = useCan("contacts.delete")
  const canExport = useCan("contacts.export")

  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [all, setAll] = useState(0)
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [group, setGroup] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  // Ticked rows; `allMatching` means every contact the current filter shows, on every page.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [allMatching, setAllMatching] = useState(false)
  const [bulkGroup, setBulkGroup] = useState("")
  const [working, setWorking] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState<Contact | "new" | null>(null)
  const [importing, setImporting] = useState(false)

  const filter = useMemo(() => ({ search, group }), [search, group])
  const lastRequest = useRef(0)

  // A new filter starts from page 1 with nothing ticked.
  const changeFilter = useCallback((next: { search?: string; group?: string }) => {
    if (next.search !== undefined) setSearch(next.search)
    if (next.group !== undefined) setGroup(next.group)
    setPage(1)
    setSelected(new Set())
    setAllMatching(false)
  }, [])

  useEffect(() => {
    const text = searchInput.trim()
    if (text === search) return
    const t = setTimeout(() => changeFilter({ search: text }), 350)
    return () => clearTimeout(t)
  }, [searchInput, search, changeFilter])

  const loadData = useCallback(async () => {
    const request = ++lastRequest.current
    setLoading(true)
    try {
      const res = await getContacts(filter, page, PAGE_SIZE)
      if (request !== lastRequest.current) return
      if ("error" in res) toast.error(res.error)
      else {
        setContacts(res.contacts as Contact[])
        setTotal(res.total)
        setAll(res.all)
        setGroupCounts(res.groupCounts)
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to load contacts.")
    } finally {
      if (request === lastRequest.current) setLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  const groups = useMemo(() => {
    const used = Object.keys(groupCounts).filter((g) => g !== NO_GROUP && !DEFAULT_CONTACT_GROUPS.includes(g))
    return [...DEFAULT_CONTACT_GROUPS, ...used.sort()]
  }, [groupCounts])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageAllTicked = contacts.length > 0 && contacts.every((c) => selected.has(c.id))
  const selectedCount = allMatching ? total : selected.size
  const target: ContactTarget = allMatching ? { filter } : { ids: Array.from(selected) }

  const toggle = (id: string) => {
    setAllMatching(false)
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePage = () => {
    setAllMatching(false)
    setSelected((s) => {
      const next = new Set(s)
      contacts.forEach((c) => (pageAllTicked ? next.delete(c.id) : next.add(c.id)))
      return next
    })
  }

  const clearSelection = () => {
    setSelected(new Set())
    setAllMatching(false)
  }

  const runBulk = async (action: () => Promise<{ error?: string; success?: string }>) => {
    setWorking(true)
    try {
      const res = await action()
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(res.success)
      clearSelection()
      loadData()
    } finally {
      setWorking(false)
    }
  }

  const applyGroup = () => runBulk(() => setContactsGroup(target, bulkGroup || null))

  const handleDelete = async () => {
    await runBulk(() => deleteContacts(target))
    setConfirmDelete(false)
  }

  const setOneGroup = async (c: Contact, g: string) => {
    const res = await setContactsGroup({ ids: [c.id] }, g || null)
    if ("error" in res) toast.error(res.error)
    else loadData()
  }

  const handleExport = async () => {
    const res = await exportContacts(filter)
    if ("error" in res) {
      toast.error(res.error)
      return
    }
    const rows = res.contacts.map((c) => [
      c.name,
      spacedPhone(c.phone),
      c.otherPhones.map(spacedPhone).join(", "),
      c.organization,
      c.group ?? "",
      c.notes ?? "",
    ])
    const name = group === NO_GROUP ? "no-group" : group || "all"
    downloadText(
      `contacts-${name.toLowerCase().replace(/\s+/g, "-")}.csv`,
      toCsv([["Name", "Mobile Number", "Other Numbers", "Organization", "Group", "Notes"], ...rows])
    )
  }

  const chips = [
    { value: "", label: "All", count: all },
    ...groups.map((g) => ({ value: g, label: g, count: groupCounts[g] ?? 0 })),
    { value: NO_GROUP, label: "No group", count: groupCounts[NO_GROUP] ?? 0 },
  ]

  return (
    <div className="min-h-screen w-full bg-gray-50 p-4 pt-16 md:p-6 lg:pt-6 space-y-5 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Phone Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your phone book: tick contacts and put them in a group (customer, friend, relative...), then filter by group.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
          {canExport && (
            <Button variant="outline" onClick={handleExport} disabled={!total} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download CSV
            </Button>
          )}
          {canCreate && (
            <>
              <Button variant="outline" onClick={() => setImporting(true)} className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import
              </Button>
              <Button className="bg-pink-600 hover:bg-pink-700 flex items-center gap-2" onClick={() => setEditing("new")}>
                <Plus className="w-4 h-4" />
                Add Contact
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.value || "all"}
            onClick={() => changeFilter({ group: c.value })}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              group === c.value
                ? "border-pink-600 bg-pink-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-pink-400"
            }`}
          >
            {c.label} <span className="tabular-nums opacity-75">({c.count.toLocaleString("en-IN")})</span>
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search name, number or organization"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {selectedCount > 0 && (canEdit || canDelete) && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-pink-200 bg-pink-50 p-3 shadow-sm">
          <span className="font-medium text-gray-900">{selectedCount.toLocaleString("en-IN")} selected</span>
          {canEdit && (
            <div className="flex items-center gap-2">
              <GroupPicker groups={groups} value={bulkGroup} onChange={setBulkGroup} noneLabel="Remove group" className="h-9 w-44" />
              <Button size="sm" onClick={applyGroup} disabled={working}>
                {bulkGroup ? `Move to ${bulkGroup}` : "Remove group"}
              </Button>
            </div>
          )}
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={working} className="flex items-center gap-1">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={clearSelection} className="flex items-center gap-1">
            <X className="w-4 h-4" />
            Clear
          </Button>
        </div>
      )}

      {pageAllTicked && !allMatching && total > contacts.length && (
        <p className="text-sm text-gray-700">
          All {contacts.length} on this page are ticked.{" "}
          <button className="font-medium text-pink-700 underline" onClick={() => setAllMatching(true)}>
            Select all {total.toLocaleString("en-IN")} {group || search ? "matching " : ""}contacts
          </button>
        </p>
      )}

      {loading && contacts.length === 0 ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto" />
        </div>
      ) : contacts.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">
          {all === 0 ? "No contacts yet. Use Import to load your Google Contacts CSV." : "No contacts match this filter."}
        </p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Tick all on this page"
                    className="h-4 w-4 accent-pink-600"
                    checked={pageAllTicked}
                    onChange={togglePage}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Mobile Number</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Group</TableHead>
                {canEdit && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => {
                const ticked = allMatching || selected.has(c.id)
                return (
                  <TableRow key={c.id} className={ticked ? "bg-pink-50/60" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Tick ${c.name || c.phone}`}
                        className="h-4 w-4 accent-pink-600"
                        checked={ticked}
                        onChange={() => toggle(c.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{c.name || <span className="text-gray-400">No name</span>}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {spacedPhone(c.phone)}
                      {c.otherPhones.length > 0 && (
                        <span className="block text-xs text-gray-500">{c.otherPhones.map(spacedPhone).join(", ")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700">{c.organization}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <GroupPicker groups={groups} value={c.group ?? ""} onChange={(g) => setOneGroup(c, g)} commitOnDone className="h-8 w-36 text-xs" />
                      ) : (
                        c.group ?? <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setEditing(c)} aria-label="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {((page - 1) * PAGE_SIZE + 1).toLocaleString("en-IN")}-
            {Math.min(page * PAGE_SIZE, total).toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || loading}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="tabular-nums">
              Page {page} / {pages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pages || loading}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <ContactDialog contact={editing} groups={groups} onClose={() => setEditing(null)} onSaved={loadData} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} onImported={loadData} />

      <Dialog open={confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedCount.toLocaleString("en-IN")} contact(s)?</DialogTitle>
            <DialogDescription>They are removed from this phone book. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={working}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={working}>
              {working ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
