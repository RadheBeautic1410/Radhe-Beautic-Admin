"use client";

import * as z from "zod";
import { Button } from "@/src/components/ui/button";
import { UserRole } from "@prisma/client";
import { toast } from "sonner";

import { TableCell, TableRow } from "@/src/components/ui/table";
import { useState, useTransition } from "react";
import { Input } from "@/src/components/ui/input";
import { staffChangePassword, staffDelete } from "@/src/actions/staff";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { DialogDemo } from "@/src/components/dialog-demo";

import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { useForm } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Switch } from "@/src/components/ui/switch";
import { moderatorUpdate } from "@/src/actions/moderator";
import { ImCross } from "react-icons/im";
import { IoMdCheckmark } from "react-icons/io";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { VerifierDetail } from "./verifierDetail";
import { useCurrentRole } from "@/src/hooks/use-currrent-role";

export interface RoleOption {
  id: string;
  name: string;
  baseRole: UserRole;
  isSystem: boolean;
}

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
  role: UserRole;
  roleId?: string | null;
  salary?: number | null;
  isTwoFactorEnabled: boolean;
  balance: number | null;
  groupName: string | null;
  creditLimit: number | null;
}

interface moderatorRowProps {
  userData: userProps;
  roles?: RoleOption[];
  onUpdateUserData: (updateUserData: userProps) => void;
  onDeleted?: (id: string) => void;
  // onDeleteUserData: (deleteUserData: userProps) => void;
}

export const ModeratorRow = ({
  userData,
  roles = [],
  onUpdateUserData,
  onDeleted,
}: moderatorRowProps) => {
  const { id } = userData;
  const currentRole = useCurrentRole();

  // The Role row this user is on: their custom role, or the system row for
  // their fixed role.
  const currentRoleRow = userData.roleId
    ? roles.find((r) => r.id === userData.roleId)
    : roles.find((r) => r.isSystem && r.name === userData.role);

  // ADMIN can hand out every role; MOD only the roles it could always assign.
  const assignable = roles.filter(
    (r) =>
      currentRole === UserRole.ADMIN ||
      (r.isSystem && (r.name === UserRole.UPLOADER || r.name === UserRole.RESELLER))
  );
  const form = useForm({
    defaultValues: {
      isVerified: userData?.isVerified,
      roleKey: currentRoleRow?.id || "",
      salary: userData.salary != null ? String(userData.salary) : "",
    },
  });

  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState(userData.password || "");
  const [newPassword, setNewPassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isAdmin = currentRole === UserRole.ADMIN;

  const onChangePassword = (closeDialog: () => void) => {
    startTransition(() => {
      staffChangePassword(id, newPassword)
        .then((res) => {
          if (res.error) {
            toast.error(res.error);
            return;
          }
          toast.success(res.success);
          setPassword(res.password || newPassword);
          setNewPassword("");
          closeDialog();
        })
        .catch(() => toast.error("Something went wrong!"));
    });
  };

  const onDelete = () => {
    startTransition(() => {
      staffDelete(id)
        .then((res) => {
          if (res.error) {
            toast.error(res.error);
            return;
          }
          toast.success(res.success);
          setDeleteOpen(false);
          onDeleted?.(id);
        })
        .catch(() => toast.error("Something went wrong!"));
    });
  };

  const onSubmit = (values: any, closeDialog?: () => void) => {
    const picked = roles.find((r) => r.id === values.roleKey);
    const combinedData = {
      id,
      isVerified: values.isVerified,
      // The fixed role stays in sync (a custom role acts as its baseRole), so
      // role-specific setup such as reseller customers keeps working.
      role: picked ? picked.baseRole : userData.role,
      customRoleId: picked ? (picked.isSystem ? null : picked.id) : undefined,
      // Blank clears the salary; MOD never sends one.
      salary: !isAdmin
        ? undefined
        : String(values.salary ?? "").trim() === ""
        ? null
        : Number(values.salary),
    };
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
            closeDialog?.();
          }
        })
        .catch(() => toast.error("Something went wrong!"));
    });
  };

  // const onSubmitDelete = () => {
  //     startTransition(() => {
  //         userDelete(id)
  //             .then((data) => {
  //                 if (data.error) {
  //                     toast.error(data.error);
  //                 }

  //                 if (data.success) {
  //                     toast.success(data.success);
  //                     onDeleteUserData(data.deletedUser)

  //                 }
  //             })
  //             .catch(() => toast.error("Something went wrong!"));
  //     });
  // }

  return (
    <TableRow key={userData.id}>
      <TableCell className="text-center font-medium">{userData.name}</TableCell>
      <TableCell className="text-center">{userData.phoneNumber}</TableCell>
      {/* <TableCell className="text-center">{userData.organization}</TableCell> */}
      <TableCell className="text-center">
        <div className="flex justify-center">
          {userData.isVerified ? <IoMdCheckmark /> : <ImCross />}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {currentRoleRow && !currentRoleRow.isSystem ? currentRoleRow.name : userData.role}
      </TableCell>

      <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
        <TableCell className="text-center font-medium">
          {userData.salary != null ? `₹${userData.salary.toLocaleString("en-IN")}` : "-"}
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-sm">
              {password ? (showPassword ? password : "••••••") : "-"}
            </span>
            {password && (
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-gray-500 hover:text-gray-800"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        </TableCell>
      </RoleGateForComponent>

      <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
        <TableCell className="text-center">
          {userData.verifiedBy ? (
            <VerifierDetail id={userData.verifiedBy} />
          ) : (
            <Button variant="ghost">Not verified</Button>
          )}
        </TableCell>
      </RoleGateForComponent>

      {/* <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
                <TableCell className="text-center">
                    <DialogDemo
                        dialogTrigger="Delete"
                        dialogTitle="Delete User"
                        dialogDescription="Do you want to delete this User?"
                        ButtonLabel="yes"
                    >
                        <DialogFooter>
                            <Button type="submit" variant="destructive" disabled={isPending} onClick={onSubmitDelete}>Yes</Button>
                        </DialogFooter>
                    </DialogDemo>

                </TableCell>
            </RoleGateForComponent> */}

      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-2">
        <DialogDemo
          dialogTrigger="Edit User"
          dialogTitle="Edit User"
          dialogDescription="Make changes here, then click Save changes."
        >
          {(closeDialog) => (
            <Form {...form}>
              <form
                className="space-y-6"
                onSubmit={form.handleSubmit((values) =>
                  onSubmit(values, closeDialog)
                )}
              >
              <FormField
                control={form.control}
                name="isVerified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Verification Status</FormLabel>
                    </div>
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

              <FormField
                control={form.control}
                name="roleKey"
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
                        {assignable.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                            {r.isSystem ? "" : " (custom)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isAdmin && (
                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly salary (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="e.g. 15000"
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type="submit" disabled={isPending}>
                Save changes
              </Button>
            </form>
          </Form>
          )}
        </DialogDemo>

        {isAdmin && (
          <>
            <DialogDemo
              dialogTrigger="Change Password"
              dialogTitle={`Change password - ${userData.name || userData.phoneNumber}`}
              dialogDescription="The new password works for sign-in immediately."
            >
              {(closeDialog) => (
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="New password (min 6 characters)"
                    value={newPassword}
                    disabled={isPending}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onChangePassword(closeDialog);
                    }}
                  />
                  <Button
                    type="button"
                    disabled={isPending || newPassword.trim().length < 6}
                    onClick={() => onChangePassword(closeDialog)}
                  >
                    Save password
                  </Button>
                </div>
              )}
            </DialogDemo>

            <DialogDemo
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              dialogTrigger={
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  aria-label="Delete member"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              }
              dialogTitle="Delete staff member"
              dialogDescription={`Permanently delete ${userData.name || userData.phoneNumber}? This cannot be undone.`}
            >
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={isPending} onClick={onDelete}>
                  Delete
                </Button>
              </div>
            </DialogDemo>
          </>
        )}
        </div>
      </TableCell>
    </TableRow>
  );
};
