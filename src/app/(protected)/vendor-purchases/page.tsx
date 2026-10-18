"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { deleteVendorPurchase, getVendorParties, getVendorPurchases } from "@/src/actions/vendor-purchase"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent } from "@/src/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"
import { Eye, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useCan } from "@/src/components/auth/permissions-provider"
import { removeImage } from "@/src/lib/upload"
import { formatDateIST, formatRupees, todayIST } from "./_components/format"

type PurchaseItem = {
  design: string
  kurtiType: string | null
  pieces: number
  price: number
  imageUrl: string | null
}

type Purchase = {
  id: string
  partyName: string
  date: Date
  items: PurchaseItem[]
  totalPieces: number
  totalAmount: number
  createdByName: string | null
}

const monthStartIST = () => `${todayIST().slice(0, 8)}01`

export default function VendorPurchasesPage() {
  const canCreate = useCan("vendorPurchases.create")
  const canEdit = useCan("vendorPurchases.edit")
  const canDelete = useCan("vendorPurchases.delete")

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [parties, setParties] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(monthStartIST())
  const [to, setTo] = useState(todayIST())
  const [partyId, setPartyId] = useState("")
  const [viewing, setViewing] = useState<Purchase | null>(null)
  const [toDelete, setToDelete] = useState<Purchase | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getVendorPurchases({ from, to, partyId: partyId || undefined })
      if ("error" in res) alert(res.error)
      else setPurchases(res.purchases as Purchase[])
    } catch (e) {
      console.error(e)
      alert("Failed to load purchases.")
    } finally {
      setLoading(false)
    }
  }, [from, to, partyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    getVendorParties()
      .then((res) => setParties(res.parties))
      .catch(console.error)
  }, [])

  const summary = useMemo(
    () => ({
      count: purchases.length,
      pieces: purchases.reduce((s, p) => s + p.totalPieces, 0),
      amount: purchases.reduce((s, p) => s + p.totalAmount, 0),
    }),
    [purchases]
  )

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    const res = await deleteVendorPurchase(toDelete.id)
    setDeleting(false)
    setToDelete(null)
    if ("error" in res) {
      alert(res.error || "Failed to delete.")
      return
    }
    res.imagePaths.forEach((p) => removeImage(p).catch(() => {}))
    loadData()
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 p-4 pt-16 md:p-6 lg:pt-6 space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Vendor Purchases</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kurtis bought from vendors: pieces and price for each design, and the total amount.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
          {canCreate && (
            <Button asChild className="bg-pink-600 hover:bg-pink-700">
              <Link href="/vendor-purchases/new" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Purchase
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[repeat(3,minmax(0,200px))_auto] items-end">
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="party">Vendor</Label>
          <select
            id="party"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All vendors</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="ghost"
          className="justify-self-start"
          onClick={() => {
            setFrom("")
            setTo("")
            setPartyId("")
          }}
        >
          Show all
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Purchases" value={String(summary.count)} />
        <SummaryCard label="Pieces" value={summary.pieces.toLocaleString("en-IN")} />
        <SummaryCard label="Total amount" value={formatRupees(summary.amount)} />
      </div>

      {loading && purchases.length === 0 ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto" />
        </div>
      ) : purchases.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">No purchases in this period.</p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Designs</TableHead>
                <TableHead className="text-right">Pieces</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setViewing(p)}>
                  <TableCell className="whitespace-nowrap">{formatDateIST(p.date)}</TableCell>
                  <TableCell className="font-medium">{p.partyName}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.items.length}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.totalPieces}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatRupees(p.totalAmount)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => setViewing(p)} aria-label="View">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canEdit && (
                      <Button asChild variant="ghost" size="icon" aria-label="Edit">
                        <Link href={`/vendor-purchases/${p.id}/edit`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setToDelete(p)}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PurchaseDetails purchase={viewing} canEdit={canEdit} onClose={() => setViewing(null)} />

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete purchase?</DialogTitle>
            <DialogDescription>
              {toDelete &&
                `${toDelete.partyName}, ${formatDateIST(toDelete.date)}: ${toDelete.totalPieces} pieces, ${formatRupees(
                  toDelete.totalAmount
                )}. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-lg md:text-2xl font-bold text-gray-900 tabular-nums break-words">{value}</p>
      </CardContent>
    </Card>
  )
}

function PurchaseDetails({
  purchase,
  canEdit,
  onClose,
}: {
  purchase: Purchase | null
  canEdit: boolean
  onClose: () => void
}) {
  const byType = useMemo(() => {
    const map = new Map<string, { pieces: number; amount: number }>()
    purchase?.items.forEach((it) => {
      const key = it.kurtiType || "Not set"
      const t = map.get(key) ?? { pieces: 0, amount: 0 }
      t.pieces += it.pieces
      t.amount += it.pieces * it.price
      map.set(key, t)
    })
    return Array.from(map.entries())
  }, [purchase])

  return (
    <Dialog open={!!purchase} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {purchase && (
          <>
            <DialogHeader>
              <DialogTitle>{purchase.partyName}</DialogTitle>
              <DialogDescription>
                {formatDateIST(purchase.date)}
                {purchase.createdByName ? ` · entered by ${purchase.createdByName}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="divide-y">
              {purchase.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="h-14 w-14 shrink-0 rounded-md border bg-gray-50 overflow-hidden">
                    {it.imageUrl && (
                      <a href={it.imageUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.imageUrl} alt={it.design} className="h-full w-full object-cover" />
                      </a>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{it.design}</p>
                    <p className="text-xs text-gray-500">{it.kurtiType || "Kurti type not set"}</p>
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    <p className="text-gray-600">
                      {it.pieces} × {formatRupees(it.price)}
                    </p>
                    <p className="font-semibold text-gray-900">{formatRupees(it.pieces * it.price)}</p>
                  </div>
                </div>
              ))}
            </div>

            {byType.length > 1 && (
              <div className="rounded-md bg-gray-50 p-3 text-sm space-y-1">
                {byType.map(([type, t]) => (
                  <div key={type} className="flex justify-between">
                    <span className="text-gray-600">{type}</span>
                    <span className="tabular-nums">
                      {t.pieces} pcs · {formatRupees(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between border-t pt-3 font-semibold">
              <span>
                {purchase.items.length} designs · {purchase.totalPieces} pieces
              </span>
              <span className="tabular-nums">{formatRupees(purchase.totalAmount)}</span>
            </div>

            {canEdit && (
              <DialogFooter>
                <Button asChild variant="outline">
                  <Link href={`/vendor-purchases/${purchase.id}/edit`}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Link>
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
