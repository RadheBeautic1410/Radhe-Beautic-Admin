"use client";

import { useEffect, useState } from "react";
import { RoleGate } from "@/src/components/auth/role-gate";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { useCurrentRole } from "@/src/hooks/use-currrent-role";
import PageLoader from "@/src/components/loader";
import { UserRole } from "@prisma/client";

import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { ModeratorRow } from "../_components/request/moderatorRow";
import NotAllowedPage from "../_components/errorPages/NotAllowedPage";
import Link from "next/link";
import { CustomerRow } from "../_components/request/customerRow";
export interface userProps {
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
  isTwoFactorEnabled: boolean;
  balance: number | null;
}
const ModeratorPage = () => {
  const [users, setUsers] = useState<userProps[]>([]);
  const [customers, setCustomers] = useState<userProps[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [tab, setTab] = useState<0 | 1>(0);

  const currentRole = useCurrentRole();

  useEffect(() => {
    const fetchData = async () => {
      if (currentRole === UserRole.ADMIN || currentRole === UserRole.MOD) {
        try {
          const response = await fetch("/api/users");
          const result = await response.json();

          let staff: userProps[] = [];
          let customerList: userProps[] = [];

          for (let u of result.data || []) {
            if (u.role === UserRole.USER) {
              customerList.push(u);
            } else {
              staff.push(u);
            }
          }

          setUsers(staff);
          setCustomers(customerList);
        } catch (error) {
          console.error("Fetch error:", error);
        } finally {
          setLoadingUsers(false);
        }
      } else {
        setLoadingUsers(false);
      }
    };

    if (loadingUsers) fetchData();
  }, [loadingUsers]);

  const updateUserData = (updatedUser:userProps) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    setCustomers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
  };

  return (
    <>
      <PageLoader loading={loadingUsers} />
      <RoleGate allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
        <Card className="w-full h-full">
          <CardHeader className="bg-secondary rounded-xl">
            <div className="flex justify-between items-center">
              <div className="flex gap-x-2">
                <Button
                  variant={tab === 0 ? "default" : "outline"}
                  onClick={() => setTab(0)}
                >
                  🧑‍💼 Staff Members
                </Button>
                <Button
                  variant={tab === 1 ? "default" : "outline"}
                  onClick={() => setTab(1)}
                >
                  🧑‍💻 Customers
                </Button>
              </div>
              <Button variant="outline" onClick={() => setLoadingUsers(true)}>
                <Link href="/request">⟳ Refresh</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {tab === 0 ? (
              <Table>
                <TableCaption>Staff Members</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Name</TableHead>
                    <TableHead className="text-center">Phone Number</TableHead>
                    <TableHead className="text-center">Verified</TableHead>
                    <TableHead className="text-center">Role</TableHead>
                    <RoleGateForComponent
                      allowedRole={[UserRole.ADMIN, UserRole.MOD]}
                    >
                      <TableHead className="text-center">Verified By</TableHead>
                    </RoleGateForComponent>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .filter((user) => user.role !== UserRole.MOD)
                    .map((user) => (
                      <ModeratorRow
                        key={user.id}
                        userData={user}
                        onUpdateUserData={updateUserData}
                      />
                    ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableCaption>Customers</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Name</TableHead>
                    <TableHead className="text-center">Phone Number</TableHead>
                    <TableHead className="text-center">Verified</TableHead>
                    <TableHead className="text-center">Role</TableHead>
                    <RoleGateForComponent
                      allowedRole={[UserRole.ADMIN, UserRole.MOD]}
                    >
                      <TableHead className="text-center">Verified By</TableHead>
                    </RoleGateForComponent>
                    <TableHead className="text-center">Action</TableHead>
                    <TableHead className="text-center">Balance</TableHead>
                    <TableHead className="text-center">Add Money</TableHead>
                    <TableHead className="text-center">Balance History</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((user) => (
                    <CustomerRow
                      key={user.id}
                      userData={user}
                      onUpdateUserData={updateUserData}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </RoleGate>
    </>
  );
};

const ModeratorPage2 = () => (
  <>
    <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
      <ModeratorPage />
    </RoleGateForComponent>
    <RoleGateForComponent
      allowedRole={[UserRole.SELLER, UserRole.UPLOADER, UserRole.RESELLER]}
    >
      <NotAllowedPage />
    </RoleGateForComponent>
  </>
);

export default ModeratorPage2;
