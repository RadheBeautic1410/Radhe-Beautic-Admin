"use client";
import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/src/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { toast } from "sonner";
import { useCurrentRole } from "@/src/hooks/use-currrent-role";
import { UserRole } from "@prisma/client";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

interface WalletRequestItem {
  id: string;
  resellerId: string;
  amount: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  reseller?: {
    id: string;
    name: string | null;
    phoneNumber: string;
    role: UserRole;
    balance: number;
  };
  // Optional known image fields if backend provides them
  image?: string | null;
  imageUrl?: string | null;
  proofImage?: string | null;
  screenshotUrl?: string | null;
}

interface WalletRequestListResponse {
  data: {
    items: WalletRequestItem[];
    total: number;
    page: number;
    limit: number;
  };
}

const WalletRequest = () => {
  const role = useCurrentRole();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState<
    "ALL" | "PENDING" | "ACCEPTED" | "REJECTED"
  >("PENDING");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const openPreview = (url?: string | null) => {
    if (!url) return;
    setPreviewUrl(url);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewUrl(null);
  };

  const getItemImageUrl = (req: WalletRequestItem): string | undefined => {
    return req.image || undefined || undefined;
  };

  const queryKey = useMemo(
    () => ["wallet-requests", { page, limit, status }],
    [page, limit, status]
  );

  const { data, isLoading, isFetching } = useQuery<WalletRequestListResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (status !== "ALL") params.set("status", status);
      const res = await fetch(`/api/wallet-request?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load wallet requests");
      return res.json();
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const approveRejectMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "approve" | "reject";
    }) => {
      const res = await fetch("/api/wallet-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update request");
      return json;
    },
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<WalletRequestListResponse>(queryKey);
      if (previous) {
        const next: WalletRequestListResponse = {
          data: {
            ...previous.data,
            items: previous.data.items.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status: action === "approve" ? "ACCEPTED" : "REJECTED",
                  }
                : i
            ),
          },
        };
        queryClient.setQueryData(queryKey, next);
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error("Failed to update request");
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.action === "approve" ? "Request approved" : "Request rejected"
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const items = data?.data.items || [];
  const total = data?.data.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "secondary" as const;
      case "ACCEPTED":
        return "default" as const;
      case "REJECTED":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  const handleAction = (id: string, action: "approve" | "reject") => {
    approveRejectMutation.mutate({ id, action });
  };

  return (
    <div className="p-4 space-y-4 bg-white">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black">Wallet Requests</h1>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="rounded-md border border-white/20 bg-white/10 backdrop-blur">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-black/80 font-medium">
                  Reseller
                </TableHead>
                <TableHead className="text-black/80 font-medium">
                  Phone
                </TableHead>
                <TableHead className="text-black/80 font-medium">
                  Amount
                </TableHead>
                <TableHead className="text-black/80 font-medium">
                  Status
                </TableHead>
                <TableHead className="text-right text-black/80 font-medium">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading || isFetching) && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-4 text-black/70"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-4 text-black/70"
                  >
                    No requests found.
                  </TableCell>
                </TableRow>
              )}
              {items.map((req) => {
                const imgUrl = getItemImageUrl(req);
                return (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="text-black/90">
                        <div className="font-medium">
                          {req.reseller?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-black/60">
                          ID: {req.reseller?.id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-black/90">
                      {req.reseller?.phoneNumber || "-"}
                    </TableCell>
                    <TableCell className="text-black/90">
                      ₹ {req.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(req.status)}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {imgUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            title="View Image"
                            onClick={() => openPreview(imgUrl)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {req.status === "PENDING" &&
                          (role === "ADMIN" || role === "MOD") && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={approveRejectMutation.isPending}
                                onClick={() => handleAction(req.id, "approve")}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={approveRejectMutation.isPending}
                                onClick={() => handleAction(req.id, "reject")}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {(isLoading || isFetching) && (
          <div className="text-center py-4 text-white/70">Loading...</div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-4 text-white/70">
            No requests found.
          </div>
        )}
        {items.map((req) => {
          const imgUrl = getItemImageUrl(req);
          return (
            <Card
              key={req.id}
              className="bg-white/10 backdrop-blur border-white/20"
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base text-white/90">
                  <div>
                    <div className="font-medium">
                      {req.reseller?.name || "Unknown"}
                    </div>
                    <div className="text-xs text-white/60 font-normal">
                      ID: {req.reseller?.id}
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(req.status)}>
                    {req.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">Phone</span>
                  <span className="text-sm text-white/90 font-medium">
                    {req.reseller?.phoneNumber || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">Amount</span>
                  <span className="text-sm text-white/90 font-medium">
                    ₹ {req.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-white/10">
                  {imgUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPreview(imgUrl)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                  )}
                  {req.status === "PENDING" &&
                    (role === "ADMIN" || role === "MOD") && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={approveRejectMutation.isPending}
                          onClick={() => handleAction(req.id, "approve")}
                          className="flex-1"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={approveRejectMutation.isPending}
                          onClick={() => handleAction(req.id, "reject")}
                          className="flex-1"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-white/80 text-sm">
          Page {page} of {totalPages} ({total} total)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) =>
          open ? setIsPreviewOpen(true) : closePreview()
        }
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Wallet Request Image</DialogTitle>
          </DialogHeader>
          {previewUrl ? (
            <div className="w-full">
              <img
                src={previewUrl}
                alt="Wallet Request"
                className="w-full h-auto rounded-md"
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No image to display.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletRequest;
