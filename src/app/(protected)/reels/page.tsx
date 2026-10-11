"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { deleteReel, getReelsAdmin, moveReel } from "@/src/actions/reels"
import { Button } from "@/src/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"
import { ArrowDown, ArrowUp, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useCan } from "@/src/components/auth/permissions-provider"

type ReelRow = {
  id: string
  title: string
  youtubeUrl: string
  videoId: string
  kurtiCodes: string[]
  categoryCodes: string[]
  order: number
  isActive: boolean
}

type CategoryOption = { code: string | null; name: string }

export default function ReelsPage() {
  const canCreate = useCan("reels.create")
  const canEdit = useCan("reels.edit")
  const canDelete = useCan("reels.delete")
  const [reels, setReels] = useState<ReelRow[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [reelToDelete, setReelToDelete] = useState<ReelRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getReelsAdmin()
      setReels(data.reels as ReelRow[])
      setCategories(data.categories as CategoryOption[])
    } catch (e) {
      console.error(e)
      alert("Failed to load reels.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const categoryName = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach((c) => c.code && map.set(c.code, c.name))
    return (code: string) => map.get(code) || code
  }, [categories])

  const handleDelete = async () => {
    if (!reelToDelete) return
    setDeleting(true)
    const res = await deleteReel(reelToDelete.id)
    setDeleting(false)
    setReelToDelete(null)
    if (!res.success) alert(res.error || "Failed to delete.")
    loadData()
  }

  const handleMove = async (reel: ReelRow, direction: "up" | "down") => {
    const res = await moveReel(reel.id, direction)
    if (!res.success) alert(res.error || "Failed to reorder.")
    loadData()
  }

  const showActions = canEdit || canDelete

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reels</h1>
          <p className="text-sm text-gray-500 mt-1">
            YouTube Shorts shown in the &ldquo;Watch &amp; Shop&rdquo; section of the customer website. Reels are
            shown in the order listed here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
          {canCreate && (
            <Button asChild className="bg-pink-600 hover:bg-pink-700">
              <Link href="/reels/new" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Reel
              </Link>
            </Button>
          )}
        </div>
      </div>

      {loading && reels.length === 0 ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto" />
        </div>
      ) : reels.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">
          No reels yet. The &ldquo;Watch &amp; Shop&rdquo; section stays hidden until you add one.
        </p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead className="w-20">Video</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Kurtis</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Status</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reels.map((reel, index) => (
                <TableRow key={reel.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="w-5 text-sm text-gray-500">{index + 1}</span>
                      {canEdit && (
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(reel, "up")}
                            className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-30"
                            aria-label="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === reels.length - 1}
                            onClick={() => handleMove(reel, "down")}
                            className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-30"
                            aria-label="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <a href={reel.youtubeUrl} target="_blank" rel="noreferrer">
                      <img
                        src={`https://img.youtube.com/vi/${reel.videoId}/mqdefault.jpg`}
                        alt=""
                        className="h-16 w-12 rounded object-cover bg-gray-100"
                      />
                    </a>
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">{reel.title}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {reel.kurtiCodes.length === 0 ? "—" : `${reel.kurtiCodes.length} kurti(s)`}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {reel.categoryCodes.length === 0 ? "—" : reel.categoryCodes.map(categoryName).join(", ")}
                  </TableCell>
                  <TableCell>
                    {reel.isActive ? (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                        VISIBLE
                      </span>
                    ) : (
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                        HIDDEN
                      </span>
                    )}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {canEdit && (
                        <Button asChild variant="ghost" size="icon" aria-label="Edit">
                          <Link href={`/reels/${reel.id}/edit`}>
                            <Pencil className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setReelToDelete(reel)}
                          className="text-red-500 hover:text-red-600"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={!!reelToDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setReelToDelete(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete reel?</DialogTitle>
            <DialogDescription>
              &ldquo;{reelToDelete?.title}&rdquo; will be removed from the website. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setReelToDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
