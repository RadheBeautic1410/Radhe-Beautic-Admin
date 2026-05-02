'use client';

import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, addDays } from 'date-fns';
import DataLoader from '@/src/components/DataLoader';
import { Button } from '@/src/components/ui/button';
import { Trash2, CheckCheck, Eye, MoreVertical } from "lucide-react"
import OrderTable from './OrderTable';
import ViewOrderDialog from './ViewOrderDialog';
import { deleteOrder, readyOrder } from '@/src/actions/order';
import { toast } from 'sonner';
import {
	useQuery,
	useMutation,
	useQueryClient,
	keepPreviousData
} from '@tanstack/react-query';
import { Select, SelectContent, SelectValue, SelectTrigger, SelectItem } from '@/src/components/ui/select';
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from '@/src/components/ui/card';
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import {
	Popover, PopoverContent,
	PopoverTrigger,
} from '@/src/components/ui/popover';
import { cn } from '@/src/lib/utils';
import { Calendar } from '@/src/components/ui/calendar';
import { Input } from '@/src/components/ui/input';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import TrackingDialog from './TrackingDialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@/src/components/ui/sheet';
import { Badge } from '@/src/components/ui/badge';

interface Order {
	id: string;
	orderId: string;
	date: Date;
	status: string;
	paymentStatus?: string;
	paymentType?: string | null;
	paymentProofImage?: string | null;
	shippingCharge?: number;
	cart: {
		CartProduct: any[];
	};
	total: number;
	shippingAddress: any;
	user: any;
	walletPaymentRequests?: {
		id: string;
		status: string;
		amount: number;
		image: string;
		paymentType: string;
	}[];
}

function getPaymentStatusDisplay(order: Order) {
	if (order.paymentType === 'credit_limit') {
		return { label: 'Credit', tone: 'secondary' as const };
	}
	if (order.paymentStatus === 'COMPLETED') {
		return { label: 'Paid / verified', tone: 'success' as const };
	}
	const hasPendingWallet = order.walletPaymentRequests?.some(
		(w) => w.status === 'PENDING'
	);
	if (hasPendingWallet || order.paymentProofImage) {
		return { label: 'Verification pending', tone: 'destructive' as const };
	}
	return { label: 'Pending', tone: 'outline' as const };
}

function getPendingPaymentWalletRequest(order: Order) {
	return order.walletPaymentRequests?.find((w) => w.status === 'PENDING');
}

const todatDate = new Date();

const PendingOrders = () => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [verifyOpen, setVerifyOpen] = useState(false);
	const [verifyOrder, setVerifyOrder] = useState<Order | null>(null);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('ALL');
	const [downloading, setDownloading] = useState(false);
	const [firstTime, setFirstTime] = useState(true);
	const [dateRange, setDateRange] = useState<DateRange | undefined>({
		from: addDays(todatDate, -20),
		to: todatDate,
	});
	const [page, setPage] = React.useState(0)
	const [pageSize, setPageSize] = useState(10);
	const fetchPendingOrders = async (pageParam: number, pageSizeParam: number, dateRange: DateRange | undefined) => {
		console.log(pageParam);
		const res = await fetch(
			"/api/orders/getOrderslist", {
			method: "POST",
			body: JSON.stringify({
				status: statusFilter,
				pageNum: pageParam,
				pageSize: pageSizeParam,
				dateRange: dateRange,
				firstTime: firstTime,
			}),
			headers: {
				"Content-type": "application/json; charset=UTF-8"
			},
			next: { revalidate: 300 }
		})
		const data = await res.json();
		setDateRange((prev) => ({
			from: data?.data?.date,
			to: prev?.to,
		}));
		setFirstTime(false);
		
		return data;
	}

	const { data, isFetching } =
		useQuery({
			queryKey: ['orders', page, pageSize, dateRange, statusFilter],
			queryFn: () => fetchPendingOrders(page, pageSize, dateRange),
			placeholderData: keepPreviousData,
			// staleTime: 5 * 60 * 1000,
		})

	const fetchAdresses = async () => {
		const res = await fetch("/api/orders/getAddress");
		const ret = await res.json();
		return ret;
	}

	const addressQuery = useQuery({
		queryKey: ['fetchAdress'],
		queryFn: () => fetchAdresses(),
		staleTime: 5 * 60 * 1000,
	})


	console.log('query-data', data);
	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteOrder(id),
		onMutate: async (id: string) => {
			console.log(id);
			await queryClient.cancelQueries({ queryKey: ['orders', page, pageSize, dateRange, statusFilter] });
			const previousOrders = queryClient.getQueryData(['orders', page, pageSize, dateRange, statusFilter]);
			console.log(previousOrders);
			queryClient.setQueryData(['orders', page, pageSize, dateRange, statusFilter], (old: any) => {
				console.log(old);
				old.data.pendingOrders = old.data.pendingOrders.filter((order: any) => order.id !== id)
				return old;
			}
			);
			return { previousOrders };
		},
		onError: (err, newTodo, context: any) => {
			console.log(err);
			queryClient.setQueryData(['orders', page, pageSize], context.previousOrders);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
                predicate: (query) =>
                    query.queryKey[0] === 'orders'
            });
		},
	})

	const moveMutation = useMutation({
		mutationFn: (id: string) => readyOrder(id),
		onError: (err, newTodo, context: any) => {
			console.log(err);
			queryClient.invalidateQueries({
                predicate: (query) =>
                    query.queryKey[0] === 'orders'
            });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
                predicate: (query) =>
                    query.queryKey[0] === 'orders'
            });
		},
	});

	const verifyPaymentMutation = useMutation({
		mutationFn: async ({
			id,
			action,
		}: {
			id: string;
			action: 'approve' | 'reject';
		}) => {
			const res = await fetch('/api/wallet-request', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json; charset=UTF-8' },
				body: JSON.stringify({ id, action }),
			});
			const json = await res.json();
			if (!res.ok) {
				throw new Error(json.error || 'Request failed');
			}
			return json;
		},
		onSuccess: () => {
			toast.success('Wallet / payment updated');
			setVerifyOpen(false);
			setVerifyOrder(null);
			queryClient.invalidateQueries({
				predicate: (query) => query.queryKey[0] === 'orders',
			});
			queryClient.invalidateQueries({
				predicate: (query) => query.queryKey[0] === 'wallet-requests',
			});
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Verification failed');
		},
	});

	const searchOrderQuery = useQuery({
		queryKey: ['searchOrder', search],
		queryFn: () => fetchOrderById(search),
		enabled: false, // This query won't run automatically
	});

	const fetchOrderById = async (orderId: string) => {
		const res = await fetch("/api/orders/getOrderById", {
			method: "POST",
			body: JSON.stringify({ orderId, status: statusFilter === 'ALL' ? undefined : statusFilter }),
			headers: {
				"Content-type": "application/json; charset=UTF-8"
			}
		});
		let ret = await res.json();
		console.log('search:', ret);
		return ret;
	};
	const handleSearch = async (searchId: string) => {
		searchId = searchId.trim();
		if (searchId.length !== 13) {
			toast.error('Enter valid orderId');
		}
		else {
			await searchOrderQuery.refetch();
			if (searchOrderQuery.isError || (searchOrderQuery.data && !searchOrderQuery.data.success)) {
				if ((searchOrderQuery.data && !searchOrderQuery.data.success)) {
					toast.error(searchOrderQuery.data.message);
				}
				else {
					toast.error('Order not found or an error occurred');
				}
			}
		}
	}
	const ordersToDisplay = searchOrderQuery.isSuccess && searchOrderQuery.data && searchOrderQuery.data.success
		? [searchOrderQuery.data.data]
		: data?.data?.pendingOrders || [];

	const getStatusLabel = (status: string) => {
		switch (status) {
			case 'PENDING':
				return 'Pending';
			case 'PROCESSING':
				return 'Accepted';
			case 'TRACKINGPENDING':
				return 'Tracking Pending';
			case 'SHIPPED':
				return 'Shipped';
			case 'CANCELLED':
				return 'Rejected';
			default:
				return status;
		}
	};
	console.log('ordersToDisplay:', ordersToDisplay);
	const columns: ColumnDef<Order>[] = [
		{
			header: 'OrderId',
			accessorKey: 'orderId',
			cell: ({ row }) => {
				return (
					<div className="font-semibold text-gray-800">{row.original.orderId}</div>
				)
			}
		},
		{
			header: 'Order Date',
			accessorKey: 'date',
			cell: ({ row }) => {
				return (
					<div className="font-semibold text-gray-800">
						{format(new Date(row.original.date), "dd/MM/yyyy")}
					</div>
				)
			}
		},
		{
			header: 'Customer',
			accessorKey: 'orderId',
			cell: ({ row }) => {
				return (
					<div className="font-semibold text-gray-800">
						{row.original.user.name}
					</div>
				)
			}
		},
		{
			header: 'Units',
			cell: ({ row }) => {
				return (
					<div className="font-semibold text-gray-800">
						{row.original.cart.CartProduct.reduce((sum, product) =>
							sum + product.sizes.reduce((sizeSum: number, size: any) => sizeSum + size.quantity, 0)
							, 0)}
					</div>
				)
			}
		},
		{
			header: 'Amounts',
			accessorKey: 'total',
			cell: ({ row }) => {
				const sub = Number(row.original.total) || 0;
				const ship = Number(row.original.shippingCharge ?? 0) || 0;
				const grand = sub + ship;
				const fmt = new Intl.NumberFormat("en-IN", {
					style: "currency",
					currency: "INR",
				});
				return (
					<div className="font-semibold text-gray-800 text-xs leading-snug space-y-0.5">
						<div>Subtotal {fmt.format(sub)}</div>
						<div>Shipping {fmt.format(ship)}</div>
						<div className="border-t border-gray-200 pt-0.5 mt-0.5">
							Total {fmt.format(grand)}
						</div>
					</div>
				);
			},
		},
		{
			header: 'Status',
			accessorKey: 'status',
			cell: ({ row }) => {
				return (
					<div className="font-semibold text-gray-800">
						{getStatusLabel(row.original.status)}
					</div>
				)
			},
		},
		{
			header: 'Payment',
			cell: ({ row }) => {
				const pay = getPaymentStatusDisplay(row.original);
				return (
					<Badge variant={pay.tone}>{pay.label}</Badge>
				);
			},
		},
		{
			header: 'Actions',
			cell: ({ row }) => {
				const orderStatus = row.original.status;
				const pendingWr = getPendingPaymentWalletRequest(row.original);
				return (
					<div className="flex flex-wrap items-center gap-2">
						<ViewOrderDialog
							data={row.original}
							triggerContent={
								<Button variant="outline" size="sm">
									<Eye className="h-4 w-4 mr-1" />
									View
								</Button>
							}
						/>
						{pendingWr && (
							<Button
								variant="secondary"
								size="sm"
								onClick={() => {
									setVerifyOrder(row.original);
									setVerifyOpen(true);
								}}
							>
								Verify payment
							</Button>
						)}
						{orderStatus === 'PENDING' && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="icon" className="h-8 w-8">
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-44">
									<DropdownMenuItem
										onClick={async () => {
											await moveMutation.mutate(row.original.id)
										}}
										disabled={moveMutation.isPending || deleteMutation.isPending}
									>
										<CheckCheck className="h-4 w-4 mr-2" />
										Accept Order
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={async () => {
											await deleteMutation.mutate(row.original.id)
										}}
										disabled={moveMutation.isPending || deleteMutation.isPending}
										className="text-red-600 focus:text-red-600"
									>
										<Trash2 className="h-4 w-4 mr-2" />
										Reject Order
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
						{orderStatus === 'PROCESSING' && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => router.push(`/confirm-online-order/${row.original.orderId}`)}
							>
								Accept Order
							</Button>
						)}
						{orderStatus === 'TRACKINGPENDING' && (
							<TrackingDialog data={row.original.orderId} />
						)}
					</div>
				)
			},
		},
		/*{
			header: 'Delete Order',
			cell: ({ row }) => {
				return (
					<Dialog>
						<DialogTrigger asChild>
							<Button
								variant={'destructive'}
								aria-label='delete order'
								type='button'
								disabled={moveMutation.isPending || deleteMutation.isPending}
							>
								<Trash2 className="h-5 w-5 mr-2" />
								Reject Order
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogTitle>
								{`Delete the order ${row.original.orderId}`}
							</DialogTitle>
							<div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
								<div className="flex items-center">
									<svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
										<path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
									</svg>
									<p className="font-bold text-lg">Warning!</p>
								</div>
								<p className="mt-2 font-semibold">
									⚠️ This process is irreversible! ⚠️
								</p>
							</div>
							<Button
								variant={'destructive'}
								aria-label='delete order'
								onClick={async (e: any) => {
									e.preventDefault();
									await deleteMutation.mutate(row.original.id)
								}}
								disabled={moveMutation.isPending || deleteMutation.isPending}
							>
								<Trash2 className="h-5 w-5 mr-2" />
								Reject Order
							</Button>
						</DialogContent>
					</Dialog>
				)
			},
		},*/
	];

	if (isFetching || searchOrderQuery.isFetching) {
		return (
			<DataLoader loading={isFetching || searchOrderQuery.isFetching} />
		)
	}

	if (!data.data?.pendingOrders || data.data?.pendingOrders.length === 0) {
		return (
			<>
				<div className="flex flex-row gap-2 items-center m-3">
					<Popover>
						<PopoverTrigger asChild>
							<Button
								id="date"
								variant={"outline"}
								className={cn(
									"w-full sm:w-[300px] justify-start text-left font-normal",
									!dateRange && "text-muted-foreground"
								)}
							>
								<CalendarIcon className="mr-2 h-4 w-4" />
								{dateRange?.from ? (
									dateRange.to ? (
										<>
											{format(dateRange.from, "LLL dd, y")} -{" "}
											{format(dateRange.to, "LLL dd, y")}
										</>
									) : (
										format(dateRange.from, "LLL dd, y")
									)
								) : (
									<span>Pick a date</span>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								initialFocus
								mode="range"
								defaultMonth={dateRange?.from}
								selected={dateRange}
								onSelect={setDateRange}
								numberOfMonths={2}
							/>
						</PopoverContent>
					</Popover>
					<Input
						className='w-48'
						placeholder='Search Order'
						value={search}
						onKeyUp={
							(e) => {
								e.preventDefault();
								if (e.key === 'Enter') {
									handleSearch(search);
								}
							}
						}
						onChange={(e) => { setSearch(e.target.value); }}
					></Input>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-48">
							<SelectValue placeholder="Filter by status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">All Status</SelectItem>
							<SelectItem value="PENDING">Pending</SelectItem>
							<SelectItem value="PROCESSING">Accepted</SelectItem>
							<SelectItem value="TRACKINGPENDING">Tracking Pending</SelectItem>
							<SelectItem value="SHIPPED">Shipped</SelectItem>
							<SelectItem value="CANCELLED">Rejected</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<Card className="w-full max-w-md mx-auto mt-8 mb-2">
					<CardContent className="flex flex-col items-center justify-center p-6">
						<AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
						<h3 className="text-lg font-semibold text-gray-700 mb-2">
							No pending Orders
						</h3>
						<p className="text-sm text-gray-500 text-center">
							There are currently no orders for selected filters.
						</p>
					</CardContent>
				</Card>
			</>
		)
	}

	const downlodLabels = async (labelsData: any) => {
		try {
			if (!labelsData || labelsData.length === 0) {
				toast.error('Labels no available');
				return;
			}
			setDownloading(true);
			let obj = JSON.stringify(labelsData);
			const res = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/generate-label?data=${obj}`, {
				responseType: 'blob'
			});
			console.log(res);
			let blob = res.data;
			console.log(blob);
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'labels.pdf';
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		}
		catch (e) {
			console.log(e);
		}
		finally {
			setDownloading(false);
		}
	}

	return (
		<>
			<div className="flex flex-row gap-2 items-center m-3">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							id="date"
							variant={"outline"}
							className={cn(
								"w-full sm:w-[300px] justify-start text-left font-normal",
								!dateRange && "text-muted-foreground"
							)}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{dateRange?.from ? (
								dateRange.to ? (
									<>
										{format(dateRange.from, "LLL dd, y")} -{" "}
										{format(dateRange.to, "LLL dd, y")}
									</>
								) : (
									format(dateRange.from, "LLL dd, y")
								)
							) : (
								<span>Pick a date</span>
							)}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							initialFocus
							mode="range"
							defaultMonth={dateRange?.from}
							selected={dateRange}
							onSelect={setDateRange}
							numberOfMonths={2}
						/>
					</PopoverContent>
				</Popover>
				<Input
					className='w-48'
					placeholder='Search Order'
					value={search}
					onKeyUp={
						(e) => {
							e.preventDefault();
							if (e.key === 'Enter') {
								handleSearch(search);
							}
						}
					}
					onChange={(e) => { setSearch(e.target.value); }}
				></Input>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-48">
						<SelectValue placeholder="Filter by status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All Status</SelectItem>
						<SelectItem value="PENDING">Pending</SelectItem>
						<SelectItem value="PROCESSING">Accepted</SelectItem>
						<SelectItem value="TRACKINGPENDING">Tracking Pending</SelectItem>
						<SelectItem value="SHIPPED">Shipped</SelectItem>
						<SelectItem value="CANCELLED">Rejected</SelectItem>
					</SelectContent>
				</Select>
				<Button
					type='button'
					disabled={!(!addressQuery.isFetching && addressQuery.data && addressQuery.data.data) || downloading}
					onClick={() => downlodLabels(addressQuery.data.data)}
				>
					Download Labels
				</Button>
			</div>
			<OrderTable data={ordersToDisplay} columns={columns} />
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
				<div className="flex flex-col sm:flex-row items-center gap-4">
					<span>Rows per page</span>
					<Select
						value={`${pageSize}`}
						onValueChange={(value) => {
							setPageSize(parseInt(value))
						}}
					>
						<SelectTrigger className="w-[180px]">
							{`${pageSize}`}
						</SelectTrigger>
						<SelectContent>
							{[1, 10, 20, 30, 40, 50].map((pageSize) => (
								<SelectItem key={pageSize} value={`${pageSize}`}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-gray-700">
						Page {page + 1} of {data.data.pages}
					</span>
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage(0)}
							disabled={page === 0}
						>
							{"<<"}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage(page - 1)}
							disabled={page === 0}
						>
							{"<"}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage(page + 1)}
							disabled={page === data.data.pages - 1}
						>
							{">"}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage(data.data.pages - 1)}
							disabled={page === data.data.pages - 1}
						>
							{">>"}
						</Button>
					</div>
				</div>
			</div>
			<Sheet
				open={verifyOpen}
				onOpenChange={(open) => {
					setVerifyOpen(open);
					if (!open) setVerifyOrder(null);
				}}
			>
				<SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Verify order payment</SheetTitle>
					</SheetHeader>
					{verifyOrder && (() => {
						const wr = getPendingPaymentWalletRequest(verifyOrder);
						const proofUrl = wr?.image || verifyOrder.paymentProofImage || '';
						const amount =
							wr?.amount ??
							(verifyOrder.total + (verifyOrder.shippingCharge || 0));
						return (
							<div className="mt-4 space-y-4">
								<p className="text-sm text-muted-foreground">
									Order <span className="font-mono font-semibold">{verifyOrder.orderId}</span>
									{' · '}
									Reseller: {verifyOrder.user?.name || verifyOrder.user?.phoneNumber || '—'}
								</p>
								<p className="text-sm">
									Amount:{' '}
									<span className="font-semibold">
										{new Intl.NumberFormat('en-IN', {
											style: 'currency',
											currency: 'INR',
										}).format(amount)}
									</span>
									{wr?.paymentType && (
										<span className="ml-2 text-muted-foreground">
											via {wr.paymentType}
										</span>
									)}
								</p>
								{proofUrl ? (
									<div className="rounded-md border p-2">
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={proofUrl}
											alt="Payment proof"
											className="max-h-[60vh] w-full object-contain"
										/>
									</div>
								) : (
									<p className="text-sm text-muted-foreground">No screenshot on file.</p>
								)}
								<SheetFooter className="flex flex-row gap-2 sm:justify-end pt-4">
									<Button
										variant="outline"
										disabled={verifyPaymentMutation.isPending || !wr}
										onClick={() => wr && verifyPaymentMutation.mutate({ id: wr.id, action: 'reject' })}
									>
										Reject
									</Button>
									<Button
										disabled={verifyPaymentMutation.isPending || !wr}
										onClick={() => wr && verifyPaymentMutation.mutate({ id: wr.id, action: 'approve' })}
									>
										Approve payment
									</Button>
								</SheetFooter>
							</div>
						);
					})()}
				</SheetContent>
			</Sheet>
		</>
	)
}

export default PendingOrders;