"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useTransition, useEffect, useState } from "react";
import {
  createExpense,
  getAllExpenses,
  deleteExpense,
  updateExpense,
  createExpenseReason,
  getAllExpenseReasons,
  updateExpenseReason,
  deleteExpenseReason,
  createExpenseSubReason,
  updateExpenseSubReason,
  deleteExpenseSubReason,
  getSubReasonsByReasonId,
  getExpenseStats,
} from "@/src/actions/expense";
import { Trash2, Pencil, Plus, DollarSign, TrendingUp } from "lucide-react";
import { DeleteConfirmationDialog } from "@/src/components/delete-confirmation-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Badge } from "@/src/components/ui/badge";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { UserRole } from "@prisma/client";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/src/components/ui/pagination";

// ========== Schemas ==========

const expenseSchema = z.object({
  reasonId: z.string().min(1, "Reason is required"),
  subReasonId: z.string().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  date: z.date(),
  paymentMethod: z.string().default("CASH"),
  isPaid: z.boolean().default(false),
  paidDate: z.date().optional().nullable(),
});

const reasonSchema = z.object({
  name: z.string().min(1, "Reason name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

const subReasonSchema = z.object({
  reasonId: z.string().min(1, "Reason is required"),
  name: z.string().min(1, "SubReason name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;
type ReasonFormValues = z.infer<typeof reasonSchema>;
type SubReasonFormValues = z.infer<typeof subReasonSchema>;

// ========== Interfaces ==========

interface Expense {
  id: string;
  reasonId: string;
  subReasonId: string | null;
  amount: number;
  description: string | null;
  date: Date;
  paymentMethod: string;
  isPaid: boolean;
  paidDate: Date | null;
  createdAt: Date;
  reason: { id: string; name: string };
  subReason: { id: string; name: string } | null;
  createdBy: { id: string; name: string | null };
}

interface ExpenseReason {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  subReasons: ExpenseSubReason[];
  _count: { expenses: number };
}

interface ExpenseSubReason {
  id: string;
  reasonId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  reason?: { id: string; name: string };
}

const ExpensesPage = () => {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("expenses");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reasons, setReasons] = useState<ExpenseReason[]>([]);
  const [subReasons, setSubReasons] = useState<ExpenseSubReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [selectedReasonFilter, setSelectedReasonFilter] = useState<string>("all");

  // Dialog states
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [subReasonDialogOpen, setSubReasonDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: "expense" | "reason" | "subreason";
    id: string;
    name: string;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<
    Expense | ExpenseReason | ExpenseSubReason | null
  >(null);

  // Forms
  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      reasonId: "",
      subReasonId: "",
      amount: 0,
      description: "",
      date: new Date(),
      paymentMethod: "CASH",
      isPaid: false,
      paidDate: null,
    },
  });

  const reasonForm = useForm<ReasonFormValues>({
    resolver: zodResolver(reasonSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const subReasonForm = useForm<SubReasonFormValues>({
    resolver: zodResolver(subReasonSchema),
    defaultValues: {
      reasonId: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const selectedReasonId = expenseForm.watch("reasonId");
  const selectedReasonIdForSub = subReasonForm.watch("reasonId");

  // Fetch data
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const reasonId = selectedReasonFilter === "all" ? undefined : selectedReasonFilter;
      const result = await getAllExpenses(currentPage, pageSize, reasonId);
      if (result.success && result.data) {
        setExpenses(result.data as Expense[]);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalExpenses(result.pagination.total);
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  const fetchReasons = async () => {
    try {
      const result = await getAllExpenseReasons(false);
      if (result.success && result.data) {
        setReasons(result.data as ExpenseReason[]);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error fetching reasons:", error);
      toast.error("Failed to fetch reasons");
    }
  };

  const fetchSubReasons = async (reasonId?: string) => {
    if (!reasonId) {
      setSubReasons([]);
      return;
    }
    try {
      const result = await getSubReasonsByReasonId(reasonId);
      if (result.success && result.data) {
        setSubReasons(result.data as ExpenseSubReason[]);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error fetching subreasons:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await getExpenseStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchReasons();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [currentPage, selectedReasonFilter]);

  useEffect(() => {
    if (selectedReasonId) {
      fetchSubReasons(selectedReasonId);
      expenseForm.setValue("subReasonId", "");
    } else {
      setSubReasons([]);
      expenseForm.setValue("subReasonId", "");
    }
  }, [selectedReasonId]);

  // Expense handlers
  const onExpenseSubmit = async (values: ExpenseFormValues) => {
    startTransition(async () => {
      try {
        let result;
        if (editingItem && "amount" in editingItem) {
          result = await updateExpense(editingItem.id, values);
        } else {
          result = await createExpense(values);
        }

        if (result.success) {
          toast.success(result.success);
          expenseForm.reset();
          setExpenseDialogOpen(false);
          setEditingItem(null);
          setCurrentPage(1); // Reset to first page after adding/editing
          fetchExpenses();
          fetchStats();
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error saving expense:", error);
        toast.error("Failed to save expense");
      }
    });
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingItem(expense);
    expenseForm.reset({
      reasonId: expense.reasonId,
      subReasonId: expense.subReasonId || "",
      amount: expense.amount,
      description: expense.description || "",
      date: new Date(expense.date),
      paymentMethod: expense.paymentMethod || "CASH",
      isPaid: expense.isPaid ?? false,
      paidDate: expense.paidDate ? new Date(expense.paidDate) : null,
    });
    setExpenseDialogOpen(true);
  };

  // Reason handlers
  const onReasonSubmit = async (values: ReasonFormValues) => {
    startTransition(async () => {
      try {
        let result;
        if (editingItem && "name" in editingItem && !("reasonId" in editingItem)) {
          result = await updateExpenseReason(editingItem.id, values);
        } else {
          result = await createExpenseReason(values);
        }

        if (result.success) {
          toast.success(result.success);
          reasonForm.reset();
          setReasonDialogOpen(false);
          setEditingItem(null);
          fetchReasons();
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error saving reason:", error);
        toast.error("Failed to save reason");
      }
    });
  };

  const handleEditReason = (reason: ExpenseReason) => {
    setEditingItem(reason);
    reasonForm.reset({
      name: reason.name,
      description: reason.description || "",
      isActive: reason.isActive,
    });
    setReasonDialogOpen(true);
  };

  // SubReason handlers
  const onSubReasonSubmit = async (values: SubReasonFormValues) => {
    startTransition(async () => {
      try {
        let result;
        if (editingItem && "reasonId" in editingItem) {
          result = await updateExpenseSubReason(editingItem.id, values);
        } else {
          result = await createExpenseSubReason(values);
        }

        if (result.success) {
          toast.success(result.success);
          subReasonForm.reset();
          setSubReasonDialogOpen(false);
          setEditingItem(null);
          fetchReasons();
          if (selectedReasonId) {
            fetchSubReasons(selectedReasonId);
          }
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error saving subreason:", error);
        toast.error("Failed to save subreason");
      }
    });
  };

  const handleEditSubReason = (subReason: ExpenseSubReason) => {
    setEditingItem(subReason);
    subReasonForm.reset({
      reasonId: subReason.reasonId,
      name: subReason.name,
      description: subReason.description || "",
      isActive: subReason.isActive,
    });
    setSubReasonDialogOpen(true);
  };

  // Delete handler
  const handleDelete = async () => {
    if (!itemToDelete) return;

    startTransition(async () => {
      try {
        let result;
        if (itemToDelete.type === "expense") {
          result = await deleteExpense(itemToDelete.id);
        } else if (itemToDelete.type === "reason") {
          result = await deleteExpenseReason(itemToDelete.id);
        } else {
          result = await deleteExpenseSubReason(itemToDelete.id);
        }

        if (result.success) {
          toast.success(result.success);
          setDeleteDialogOpen(false);
          setItemToDelete(null);
          fetchExpenses();
          fetchReasons();
          fetchStats();
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error deleting:", error);
        toast.error("Failed to delete");
      }
    });
  };

  const openDeleteDialog = (
    type: "expense" | "reason" | "subreason",
    id: string,
    name: string
  ) => {
    setItemToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const resetForms = () => {
    expenseForm.reset();
    reasonForm.reset();
    subReasonForm.reset();
    setEditingItem(null);
  };

  return (
    <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
      <Card className="rounded-none w-full h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-center w-full">Expense Management</h1>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="shadow-sm border bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalExpenses}</div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹{stats.totalAmount.toLocaleString("en-IN")}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="reasons">Reasons</TabsTrigger>
              <TabsTrigger value="subreasons">SubReasons</TabsTrigger>
            </TabsList>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="space-y-4">
              <Card className="shadow-sm border bg-white">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CardTitle>Expenses</CardTitle>
                    <Select
                      value={selectedReasonFilter}
                      onValueChange={(value) => {
                        setSelectedReasonFilter(value);
                        setCurrentPage(1); // Reset to first page when filter changes
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Reasons</SelectItem>
                        {reasons
                          .filter((r) => r.isActive)
                          .map((reason) => (
                            <SelectItem key={reason.id} value={reason.id}>
                              {reason.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Dialog
                  open={expenseDialogOpen}
                  onOpenChange={(open) => {
                    setExpenseDialogOpen(open);
                    if (!open) resetForms();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] !flex !flex-col">
                    <DialogHeader className="flex-shrink-0">
                      <DialogTitle>
                        {editingItem && "amount" in editingItem
                          ? "Edit Expense"
                          : "Add Expense"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingItem && "amount" in editingItem
                          ? "Update expense details"
                          : "Add a new expense to the system"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                      <Form {...expenseForm}>
                        <form
                          onSubmit={expenseForm.handleSubmit(onExpenseSubmit)}
                          className="space-y-4"
                        >
                        <FormField
                          control={expenseForm.control}
                          name="reasonId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason *</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a reason" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {reasons
                                    .filter((r) => r.isActive)
                                    .map((reason) => (
                                      <SelectItem key={reason.id} value={reason.id}>
                                        {reason.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={expenseForm.control}
                          name="subReasonId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SubReason (Optional)</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || ""}
                                disabled={!selectedReasonId}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a subreason" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {subReasons
                                    .filter((sr) => sr.isActive)
                                    .map((subReason) => (
                                      <SelectItem
                                        key={subReason.id}
                                        value={subReason.id}
                                      >
                                        {subReason.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={expenseForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(parseFloat(e.target.value) || 0)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                                                <FormField
                          control={expenseForm.control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Method *</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select payment method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="CASH">Cash</SelectItem>
                                  <SelectItem value="GPAY">GPay</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={expenseForm.control}
                          name="isPaid"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Is Paid</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  Check if payment has been made
                                </div>
                              </div>
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={expenseForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date *</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  value={
                                    field.value
                                      ? new Date(field.value).toISOString().split("T")[0]
                                      : ""
                                  }
                                  onChange={(e) =>
                                    field.onChange(new Date(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={expenseForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Add description (optional)"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {expenseForm.watch("isPaid") && (
                          <FormField
                            control={expenseForm.control}
                            name="paidDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Paid Date</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    value={
                                      field.value
                                        ? new Date(field.value).toISOString().split("T")[0]
                                        : ""
                                    }
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value ? new Date(e.target.value) : null
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        </form>
                      </Form>
                    </div>
                    <DialogFooter className="flex-shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setExpenseDialogOpen(false);
                          resetForms();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button"
                        disabled={isPending}
                        onClick={expenseForm.handleSubmit(onExpenseSubmit)}
                      >
                        {isPending ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No expenses found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>SubReason</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Is Paid</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {new Date(expense.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{expense.reason.name}</TableCell>
                          <TableCell>
                            {expense.subReason ? (
                              <Badge variant="secondary">{expense.subReason.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>₹{expense.amount.toLocaleString("en-IN")}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {expense.paymentMethod === "GPAY" ? "GPay" : "Cash"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={expense.isPaid ? "default" : "secondary"}>
                              {expense.isPaid ? "Paid" : "Unpaid"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {expense.paidDate ? (
                              new Date(expense.paidDate).toLocaleDateString()
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {expense.description || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{expense.createdBy.name || "Unknown"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditExpense(expense)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  openDeleteDialog(
                                    "expense",
                                    expense.id,
                                    `Expense of ₹${expense.amount}`
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) {
                                setCurrentPage(currentPage - 1);
                              }
                            }}
                            className={
                              currentPage === 1 ? "pointer-events-none opacity-50" : ""
                            }
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                          (page) => {
                            // Show first page, last page, current page, and pages around current
                            if (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setCurrentPage(page);
                                    }}
                                    isActive={currentPage === page}
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            } else if (
                              page === currentPage - 2 ||
                              page === currentPage + 2
                            ) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return null;
                          }
                        )}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) {
                                setCurrentPage(currentPage + 1);
                              }
                            }}
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
                {!loading && expenses.length > 0 && (
                  <div className="text-center text-sm text-muted-foreground mt-2">
                    Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                    {Math.min(currentPage * pageSize, totalExpenses)} of {totalExpenses}{" "}
                    expenses
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reasons Tab */}
          <TabsContent value="reasons" className="space-y-4">
            <Card className="shadow-sm border bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Expense Reasons</CardTitle>
                <Dialog
                  open={reasonDialogOpen}
                  onOpenChange={(open) => {
                    setReasonDialogOpen(open);
                    if (!open) resetForms();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Reason
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem && "name" in editingItem && !("reasonId" in editingItem)
                          ? "Edit Reason"
                          : "Add Reason"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingItem && "name" in editingItem && !("reasonId" in editingItem)
                          ? "Update reason details"
                          : "Create a new expense reason"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...reasonForm}>
                      <form
                        onSubmit={reasonForm.handleSubmit(onReasonSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={reasonForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Salary" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={reasonForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Add description (optional)"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={reasonForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Active</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  Inactive reasons won't appear in dropdowns
                                </div>
                              </div>
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setReasonDialogOpen(false);
                              resetForms();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving..." : "Save"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {reasons.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No reasons found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>SubReasons</TableHead>
                        <TableHead>Expenses</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reasons.map((reason) => (
                        <TableRow key={reason.id}>
                          <TableCell className="font-medium">{reason.name}</TableCell>
                          <TableCell>
                            {reason.description || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{reason.subReasons.length}</TableCell>
                          <TableCell>{reason._count.expenses}</TableCell>
                          <TableCell>
                            <Badge
                              variant={reason.isActive ? "default" : "secondary"}
                            >
                              {reason.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditReason(reason)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  openDeleteDialog("reason", reason.id, reason.name)
                                }
                                disabled={reason._count.expenses > 0}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SubReasons Tab */}
          <TabsContent value="subreasons" className="space-y-4">
            <Card className="shadow-sm border bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Expense SubReasons</CardTitle>
                <Dialog
                  open={subReasonDialogOpen}
                  onOpenChange={(open) => {
                    setSubReasonDialogOpen(open);
                    if (!open) resetForms();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add SubReason
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem && "reasonId" in editingItem
                          ? "Edit SubReason"
                          : "Add SubReason"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingItem && "reasonId" in editingItem
                          ? "Update subreason details"
                          : "Create a new expense subreason"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...subReasonForm}>
                      <form
                        onSubmit={subReasonForm.handleSubmit(onSubReasonSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={subReasonForm.control}
                          name="reasonId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason *</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={!!editingItem}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a reason" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {reasons
                                    .filter((r) => r.isActive)
                                    .map((reason) => (
                                      <SelectItem key={reason.id} value={reason.id}>
                                        {reason.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={subReasonForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SubReason Name *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., John Doe"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={subReasonForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Add description (optional)"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={subReasonForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Active</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  Inactive subreasons won't appear in dropdowns
                                </div>
                              </div>
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setSubReasonDialogOpen(false);
                              resetForms();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving..." : "Save"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {reasons.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No reasons found. Please create a reason first.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reasons.map((reason) => (
                      <Card key={reason.id} className="shadow-sm border bg-white">
                        <CardHeader>
                          <CardTitle className="text-lg">{reason.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {reason.subReasons.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              No subreasons for this reason
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {reason.subReasons.map((subReason) => (
                                  <TableRow key={subReason.id}>
                                    <TableCell className="font-medium">
                                      {subReason.name}
                                    </TableCell>
                                    <TableCell>
                                      {subReason.description || (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={subReason.isActive ? "default" : "secondary"}
                                      >
                                        {subReason.isActive ? "Active" : "Inactive"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditSubReason(subReason)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            openDeleteDialog(
                                              "subreason",
                                              subReason.id,
                                              subReason.name
                                            )
                                          }
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          title="Delete Confirmation"
          description={
            itemToDelete
              ? `Are you sure you want to delete "${itemToDelete.name}"? This action cannot be undone.`
              : ""
          }
          isLoading={isPending}
        />
        </CardContent>
      </Card>
    </RoleGateForComponent>
  );
};

export default ExpensesPage;
