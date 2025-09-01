"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { TableCell, TableRow } from "@/src/components/ui/table";
import { Button } from "@/src/components/ui/button";
import { DialogDemo } from "@/src/components/dialog-demo";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { VerifierDetail } from "./verifierDetail";

import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/src/components/ui/select";

import { Switch } from "@/src/components/ui/switch";
import { UserRole } from "@prisma/client";

import { IoMdCheckmark } from "react-icons/io";
import { ImCross } from "react-icons/im";
import Link from "next/link";
import { moderatorUpdate } from "@/src/actions/moderator";

interface userProps {
  id: string;
  name: string | null;
  phoneNumber: string | null;
  emailVerified: Date | null;
  image: string | null;
  password: string | null;
  organization: string | null;
  isVerified: boolean;
  verifiedBy: string | null;
  balance: number | null;
  role: UserRole;
  groupName: string | null; // 👈 added field
  isTwoFactorEnabled: boolean;
}

interface moderatorRowProps {
  userData: userProps;
  onUpdateUserData: (updateUserData: userProps) => void;
}

const editSchema = z.object({
  isVerified: z.boolean(),
  role: z.nativeEnum(UserRole),
  groupName: z.enum(["group1", "group2", "group3"]), // 👈 added here
});

const addMoneySchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  paymentMethod: z.enum(["cash", "bank_transfer", "gpay"]),
});

export const CustomerRow = ({
  userData,
  onUpdateUserData,
}: moderatorRowProps) => {
  const { id } = userData;
  const [isPending, startTransition] = useTransition();

  // Form for editing user (verification + role + group)
  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      isVerified: userData.isVerified,
      role: userData.role,
      groupName:
        userData.groupName === "group1" ||
        userData.groupName === "group2" ||
        userData.groupName === "group3"
          ? userData.groupName
          : "group1", // 👈 default fallback
    },
  });

  const handleEditSubmit = (values: z.infer<typeof editSchema>) => {
    const combinedData = { ...values, id };
    startTransition(() => {
      moderatorUpdate(combinedData)
        .then((data) => {
          if (data.error) {
            toast.error(data.error);
            return;
          }

          if (data.success && data.updatedUser) {
            toast.success(data.success);
            onUpdateUserData(data.updatedUser);
          }
        })
        .catch(() => toast.error("Something went wrong!"));
    });
  };

  // Form for adding money
  const moneyForm = useForm<z.infer<typeof addMoneySchema>>({
    resolver: zodResolver(addMoneySchema),
    defaultValues: {
      amount: "",
      paymentMethod: "cash",
    },
  });

  const handleAddMoney = async (
    values: z.infer<typeof addMoneySchema>,
    closeDialog: () => void
  ) => {
    const payload = {
      amount: parseFloat(values.amount),
      paymentMethod: values.paymentMethod,
      userId: id,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/wallet/add-money", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
          return;
        }

        toast.success(data.success || "Money added successfully!");
        moneyForm.reset();
        closeDialog();
      } catch (err) {
        toast.error("Something went wrong while adding money.");
        console.error("API Error:", err);
      }
    });
  };

  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch(`/api/wallet/balance`);
        const data = await res.json();

        if (res.ok) {
          setBalance(data.balance);
        } else {
          console.error("Balance fetch error:", data.error);
        }
      } catch (err) {
        console.error("Balance fetch failed:", err);
      }
    };

    fetchBalance();
  }, []);

  return (
    <TableRow key={userData.id}>
      <TableCell className="text-center font-medium">{userData.name}</TableCell>
      <TableCell className="text-center">{userData.phoneNumber}</TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          {userData.isVerified ? <IoMdCheckmark /> : <ImCross />}
        </div>
      </TableCell>
      <TableCell className="text-center">{userData.role}</TableCell>

      <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
        <TableCell className="text-center">
          {userData.verifiedBy ? (
            <VerifierDetail id={userData.verifiedBy} />
          ) : (
            <Button variant="ghost">Not verified</Button>
          )}
        </TableCell>
      </RoleGateForComponent>

      {/* Edit User Dialog */}
      <TableCell className="text-center">
        <DialogDemo
          dialogTrigger="Edit User"
          dialogTitle="Edit User"
          dialogDescription="Make changes to the user's profile. Click save when done."
          ButtonLabel="Save Changes"
        >
          <Form {...editForm}>
            <form
              className="space-y-6"
              onSubmit={editForm.handleSubmit(handleEditSubmit)}
            >
              {/* Verified Switch */}
              <FormField
                control={editForm.control}
                name="isVerified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel>Verification Status</FormLabel>
                    <FormControl>
                      <Switch
                        disabled={isPending}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Role Select */}
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      disabled={isPending}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UserRole.USER}>Customer</SelectItem>
                        <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                        <SelectItem value={UserRole.MOD}>Moderator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Group Select 👇 */}
              <FormField
                control={editForm.control}
                name="groupName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group</FormLabel>
                    <Select
                      disabled={isPending}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="group1">Group 1</SelectItem>
                        <SelectItem value="group2">Group 2</SelectItem>
                        <SelectItem value="group3">Group 3</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isPending}>
                Save Changes
              </Button>
            </form>
          </Form>
        </DialogDemo>
      </TableCell>

      <TableCell className="text-center">{userData.balance}</TableCell>

      {/* Add Money Dialog */}
      <TableCell className="text-center">
        <DialogDemo
          dialogTrigger="Add Money"
          dialogTitle="Add Money"
          dialogDescription="Add money to the user's account."
        >
          {(closeDialog) => (
            <Form {...moneyForm}>
              <form
                className="space-y-6"
                onSubmit={moneyForm.handleSubmit((values) =>
                  handleAddMoney(values, closeDialog)
                )}
              >
                <FormField
                  control={moneyForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <input
                          type="number"
                          placeholder="Enter amount"
                          className="input input-bordered w-full px-3 py-2 border rounded-md"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={moneyForm.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        disabled={isPending}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">
                            Bank Transfer
                          </SelectItem>
                          <SelectItem value="gpay">GPay</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isPending}>
                  Add Money
                </Button>
              </form>
            </Form>
          )}
        </DialogDemo>
      </TableCell>
      <TableCell className="text-center">{userData.groupName ?? "-"}</TableCell>

      <TableCell className="text-center">
        <Link href={`/balance-history/${id}`}>
          <Button variant="outline">Balance History</Button>
        </Link>
      </TableCell>
    </TableRow>
  );
};
