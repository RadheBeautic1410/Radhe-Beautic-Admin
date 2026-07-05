"use client";

import { useEffect, useState } from "react";
import { RoleGate } from "@/src/components/auth/role-gate";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import PageLoader from "@/src/components/loader";
import { UserRole } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Input } from "@/src/components/ui/input";
import { Search, RefreshCw, CheckCircle2, XCircle, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { adminResetPassword } from "@/src/actions/moderator";
import { toast } from "sonner";
import NotAllowedPage from "../_components/errorPages/NotAllowedPage";

interface CustomerProps {
  id: string;
  name: string | null;
  phoneNumber: string | null;
  email: string | null;
  isVerified: boolean;
  role: UserRole;
  balance: number | null;
  password: string | null;
  organization: string | null;
}

const AllCustomersPage = () => {
  const [customers, setCustomers] = useState<CustomerProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Dialog State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProps | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const result = await response.json();
        setCustomers(result.data || []);
      } else {
        console.error("Failed to fetch customers");
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Reset current page to 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredCustomers = customers.filter((cust) => {
    const matchesName = cust.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    const matchesPhone = cust.phoneNumber?.includes(searchQuery) ?? false;
    return matchesName || matchesPhone;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenResetDialog = (customer: CustomerProps) => {
    setSelectedCustomer(customer);
    setNewPassword("");
    setIsResetOpen(true);
  };

  const handleResetPasswordSubmit = async () => {
    if (!selectedCustomer) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setResetting(true);
    try {
      const res = await adminResetPassword(selectedCustomer.id, newPassword);
      if (res.error) {
        toast.error(res.error);
      } else if (res.success) {
        toast.success(res.success);
        setIsResetOpen(false);
      }
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <PageLoader loading={loading} />
      <RoleGate allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto w-full">
          <Card className="w-full shadow-lg border border-white/20 bg-white/95 backdrop-blur-sm dark:bg-zinc-950/95">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                  👥 All Customers List
                  <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {filteredCustomers.length} Total
                  </span>
                </CardTitle>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  View registered retail customers (excludes resellers).
                </p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or mobile number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-xl border-zinc-200 focus:ring-primary focus:border-primary w-full shadow-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchCustomers}
                  className="rounded-xl border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850 h-10 w-10 shrink-0 shadow-sm"
                  title="Refresh List"
                >
                  <RefreshCw className="h-4 w-4 animate-none" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/75 dark:bg-zinc-900/50 hover:bg-zinc-50/75">
                      <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 w-[200px] pl-6 py-4">Name</TableHead>
                      <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 w-[150px] py-4">Mobile Number</TableHead>
                      <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 w-[120px] py-4 text-center">Verified</TableHead>
                      <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 w-[150px] py-4 text-right">Wallet Balance</TableHead>
                      <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 w-[180px] py-4 text-center pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                          {loading ? "Loading customer list..." : "No customers found matching the search criteria."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCustomers.map((cust) => (
                        <TableRow key={cust.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                          <TableCell className="font-medium text-zinc-900 dark:text-zinc-100 pl-6 py-4">
                            {cust.name || <span className="text-zinc-400 italic">Not set</span>}
                          </TableCell>
                          <TableCell className="text-zinc-600 dark:text-zinc-400 py-4 font-mono">
                            {cust.phoneNumber || "-"}
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <div className="flex items-center justify-center">
                              {cust.isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                                  <CheckCircle2 className="h-3 w-3" /> Yes
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                                  <XCircle className="h-3 w-3" /> No
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-4 font-semibold text-zinc-900 dark:text-zinc-100">
                            {cust.balance !== null ? `₹${cust.balance.toFixed(2)}` : "₹0.00"}
                          </TableCell>
                          <TableCell className="py-4 text-center pr-6">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenResetDialog(cust)}
                              className="inline-flex items-center gap-1.5 rounded-xl border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            >
                              <KeyRound className="h-3.5 w-3.5 text-zinc-500" /> Reset Password
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="text-sm text-zinc-500">
                  Showing <span className="font-semibold text-zinc-700 dark:text-zinc-300">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {Math.min(currentPage * itemsPerPage, filteredCustomers.length)}
                  </span>{" "}
                  of <span className="font-semibold text-zinc-700 dark:text-zinc-300">{filteredCustomers.length}</span> customers
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="rounded-lg border-zinc-200"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`rounded-lg w-8 h-8 p-0 ${
                              page === currentPage
                                ? "bg-primary text-primary-foreground"
                                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                            }`}
                          >
                            {page}
                          </Button>
                        );
                      } else if (
                        page === 2 ||
                        page === totalPages - 1
                      ) {
                        return (
                          <span key={page} className="text-zinc-400 px-1 text-sm select-none">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className="rounded-lg border-zinc-200"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </RoleGate>

      {/* Reset Password Dialog */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Reset Customer Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedCustomer?.name || selectedCustomer?.phoneNumber}</span>.
              This password will be securely hashed in the database.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="new-password-input" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                New Password
              </label>
              <Input
                id="new-password-input"
                type="text"
                placeholder="Enter at least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResetOpen(false)}
              disabled={resetting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPasswordSubmit}
              disabled={resetting || !newPassword}
              className="rounded-xl"
            >
              {resetting ? "Saving..." : "Save Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const AllCustomersPageWrapper = () => (
  <>
    <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
      <AllCustomersPage />
    </RoleGateForComponent>
    <RoleGateForComponent
      allowedRole={[UserRole.SELLER, UserRole.UPLOADER, UserRole.RESELLER]}
    >
      <NotAllowedPage />
    </RoleGateForComponent>
  </>
);

export default AllCustomersPageWrapper;
