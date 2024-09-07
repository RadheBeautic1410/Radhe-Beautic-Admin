"use client";

import { RoleGate } from "@/src/components/auth/role-gate";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { UserRole } from "@prisma/client";
import { useEffect, useState } from "react";


import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow, } from "@/src/components/ui/table"

import { ModeratorRow } from "../_components/request/moderatorRow";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import PageLoader from "@/src/components/loader";
import { useCurrentRole } from "@/src/hooks/use-currrent-role";
import NotAllowedPage from "../_components/errorPages/NotAllowedPage";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { CustomerRow } from "../_components/request/customerRow";



interface user {
    id: string;
    name: string | null;
    phoneNumber: string | null;
    emailVerified: Date | null;
    image: string | null;
    password: string | null;
    organization: string | null;
    isVerified: boolean;
    verifiedBy: string | null
    role: UserRole;
    isTwoFactorEnabled: boolean;
}


const ModeratorPage = () => {

    const [users, setUsers] = useState<user[]>([]);
    const [customers, setCustomers] = useState<user[]>([]);

    const [loadingUsers, setLoadingUsers] = useState(true)


    const [tabNum, setTabNum] = useState(0);
    const currentROle = useCurrentRole();
    useEffect(() => {
        const fetchData = async () => {
            if (currentROle === UserRole.ADMIN || currentROle === UserRole.MOD) {
                try {
                    const response = await fetch('/api/users'); // Adjust the API endpoint based on your actual setup
                    const result = await response.json();
                    console.log(result);
                    let staffMembers: user[] = [];
                    let customerList: user[] = [];
                    for (let i = 0; i < (result.data || []).length; i++) {
                        if (result.data[i].role === UserRole.USER) {
                            customerList.push(result.data[i]);
                        }
                        else {
                            staffMembers.push(result.data[i]);
                        }
                    }
                    setUsers(staffMembers); // Use an empty array as a default value if result.data is undefined or null
                    setCustomers(customerList);
                } catch (error) {
                    console.error('Error fetching data:', error);
                } finally {
                    setLoadingUsers(false);
                }
            } else {
                setLoadingUsers(false);
            }
        }

        if (loadingUsers) {
            fetchData();
        }
    }, [loadingUsers]);


    const updateUserData = (updatedUserData: user) => {
        setUsers((prevUsers) =>
            prevUsers.map((user) =>
                user.id === updatedUserData.id ? { ...updatedUserData } : user
            )
        );
        setCustomers((prevUsers) =>
            prevUsers.map((user) =>
                user.id === updatedUserData.id ? { ...updatedUserData } : user
            )
        );
    }

    // const deleteUserData = (deletedUser: user) => {
    //     setUsers((prevUsers) => {
    //         // Filter out the deleted user based on its id
    //         const updatedUsers = prevUsers.filter((user) => user.id !== deletedUser.id);
    //         return updatedUsers;
    //     });
    //     setCustomers((prevUsers) => {
    //         const updatedUsers = prevUsers.filter((user) => user.id !== deletedUser.id);
    //         return updatedUsers;
    //     });
    // };


    return (
        <>
            <PageLoader loading={loadingUsers} />
            <RoleGate allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
                <Card className="w-[90%]">
                    <CardHeader className="bg-secondary rounded-xl">
                        <div className="flex flex-row justify-between items-center ">
                            <div className='flex sm:gap-x-2 max-sm:flex-col max-sm:gap-y-3'>
                                <Button
                                    asChild
                                    className="cursor-pointer"
                                    variant={tabNum === 0 ? "default" : "outline"}
                                    onClick={() => {
                                        if (tabNum !== 0) {
                                            setTabNum(0);
                                        }
                                    }}
                                >
                                    <a>🧑‍💼 Staff Members</a>
                                </Button>
                                <Button
                                    asChild
                                    className="cursor-pointer"
                                    variant={tabNum === 1 ? "default" : "outline"}
                                    onClick={() => {
                                        if (tabNum !== 1) {
                                            setTabNum(1);
                                        }
                                    }}
                                >
                                    <a>🧑‍💻 Customers</a>
                                </Button>
                            </div>
                            <Button
                                asChild
                                className="cursor-pointer mt-1"
                                variant={"outline"}
                                onClick={() => {
                                    setTabNum(0);
                                    setLoadingUsers(true);
                                }}
                            >
                                <Link href='/request'>⟳ Refresh Page</Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableCaption>End of list</TableCaption>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-center">Name</TableHead>
                                    <TableHead className="text-center">Phone Number</TableHead>
                                    {/* <TableHead className="text-center">Organization</TableHead> */}
                                    <TableHead className="text-center">Verified</TableHead>
                                    <TableHead className="text-center">Role</TableHead>
                                    <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
                                        <TableHead className="text-center">Verified By</TableHead>
                                    </RoleGateForComponent>
                                    <TableHead className="text-center">Action</TableHead>
                                    <TableHead className="text-center">Action</TableHead>

                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tabNum === 0 ?
                                    <>
                                        {users.map((user) => (
                                            user.role !== UserRole.MOD &&
                                            (<ModeratorRow key={user.id} userData={user} onUpdateUserData={updateUserData} />)
                                        ))}
                                    </>
                                    :
                                    <>
                                        {customers.map((user) => (
                                            user.role !== UserRole.MOD &&
                                            (<CustomerRow key={user.id} userData={user} onUpdateUserData={updateUserData} />)
                                        ))}
                                    </>
                                }

                            </TableBody>

                        </Table>
                    </CardContent>
                </Card>

            </RoleGate>
        </>
    );
};

const ModeratorPage2 = () => {
    return (
        <>
            <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
                <ModeratorPage />
            </RoleGateForComponent>
            <RoleGateForComponent allowedRole={[UserRole.SELLER, UserRole.UPLOADER, UserRole.RESELLER]}>
                <NotAllowedPage />
            </RoleGateForComponent>
        </>
    );
}

export default ModeratorPage2;