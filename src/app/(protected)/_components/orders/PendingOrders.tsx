'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ColumnDef,
} from '@tanstack/react-table';

import { format, parseISO, addDays } from 'date-fns';
import { getOrdersOfUserbyStatus } from '@/src/actions/orders';
import DataLoader from '@/src/components/DataLoader';
import { Button } from '@/src/components/ui/button';
import { ArrowUpDown, MoreHorizontal, Trash2, CheckCheck } from "lucide-react"
import OrderTable from './OrderTable';
import ViewOrderDialog from './ViewOrderDialog';
import { deleteOrder, readyOrder } from '@/src/actions/order';
import { toast } from 'sonner';
import {
	useQuery,
	useMutation,
	useQueryClient,
	QueryClient,
	QueryClientProvider,
	useInfiniteQuery,
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
import { useInvalidateQueries } from '../../orders/layout';
import { Input } from '@/src/components/ui/input';
import axios from 'axios';
import { Dialog, DialogTitle, DialogTrigger, DialogContent } from '@/src/components/ui/dialog';

interface Order {
	id: string;
	orderId: string;
	date: Date;
	cart: {
		CartProduct: any[];
	};
	total: number;
	shippingAddress: any;
	user: any;
}

const getCurrTime = () => {
	const currentTime = new Date();
	const ISTOffset = 5.5 * 60 * 60 * 1000;
	const ISTTime = new Date(currentTime.getTime() + ISTOffset);
	return ISTTime;
}


const PendingOrders = () => {
	// const [isError, setIsError] = useState(false);
	const queryClient = useQueryClient();
	const invalidateQueries = useInvalidateQueries();
	const [search, setSearch] = useState('');
	const [downloading, setDownloading] = useState(false);
	const [dateRange, setDateRange] = useState<DateRange | undefined>({
		from: addDays(new Date(), -20),
		to: new Date(),
	});
	const [page, setPage] = React.useState(0)
	const [pageSize, setPageSize] = useState(10);
	const fetchPendingOrders = async (pageParam: number, pageSizeParam: number, dateRange: DateRange | undefined) => {
		console.log(pageParam);
		const res = await fetch(
			"/api/orders/getOrderslist", {
			method: "POST",
			body: JSON.stringify({
				status: "PENDING",
				pageNum: pageParam,
				pageSize: pageSizeParam,
				dateRange: dateRange
			}),
			headers: {
				"Content-type": "application/json; charset=UTF-8"
			},
			next: { revalidate: 300 }
		})
		return res.json()
	}

	const { isPending, isError, error, data, isFetching, isPlaceholderData } =
		useQuery({
			queryKey: ['pendingOrders', page, pageSize, dateRange],
			queryFn: () => fetchPendingOrders(page, pageSize, dateRange),
			placeholderData: keepPreviousData,
			staleTime: 5 * 60 * 1000,
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
			await queryClient.cancelQueries({ queryKey: ['pendingOrders', page, pageSize, dateRange] });
			const previousOrders = queryClient.getQueryData(['pendingOrders', page, pageSize, dateRange]);
			console.log(previousOrders);
			queryClient.setQueryData(['pendingOrders', page, pageSize, dateRange], (old: any) => {
				console.log(old);
				old.data.pendingOrders = old.data.pendingOrders.filter((order: any) => order.id !== id)
				return old;
			}
			);
			return { previousOrders };
		},
		onError: (err, newTodo, context: any) => {
			console.log(err);
			queryClient.setQueryData(['pendingOrders', page, pageSize], context.previousOrders);
		},
		onSuccess: () => {
			// Invalidate the queries you want to refetch
			invalidateQueries();
			queryClient.invalidateQueries({ queryKey: ['pendingOrders', page, pageSize, dateRange] });
		},
	})

	const moveMutation = useMutation({
		mutationFn: (id: string) => readyOrder(id),
		onError: (err, newTodo, context: any) => {
			console.log(err);
			queryClient.invalidateQueries({ queryKey: ['pendingOrders', page, pageSize, dateRange] });
		},
		onSuccess: () => {
			// Invalidate the queries you want to refetch
			invalidateQueries();
			queryClient.invalidateQueries({ queryKey: ['pendingOrders', page, pageSize, dateRange] });
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
			body: JSON.stringify({ orderId, status: 'PENDING' }),
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
			if (searchOrderQuery.isSuccess && searchOrderQuery.data && searchOrderQuery.data.success) {
				// If the order is found, update the local state to show this order
				queryClient.setQueryData(['pendingOrders', page, pageSize, dateRange], (old: any) => ({
					...old,
					data: {
						...old.data,
						pendingOrders: [searchOrderQuery.data]
					}
				}));
			} else if (searchOrderQuery.isError || (searchOrderQuery.data && !searchOrderQuery.data.success)) {
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
	console.log('ordersToDisplay:', ordersToDisplay);
	const columns: ColumnDef<Order>[] = [
		{
			header: 'OrderId',
			accessorKey: 'orderId',
			cell: ({ row }) => {
				return (
					<>
						<div className="text-gray-600">Order Id:</div>
						<ViewOrderDialog data={row.original} />
					</>
				)
			}
		},
		{
			header: 'Order Date',
			accessorKey: 'date',
			cell: ({ row }) => {
				return (
					<>
						<div className="text-gray-600">Order Date:</div>
						<div className="font-semibold text-gray-800">
							{format(new Date(row.original.date), "dd/MM/yyyy")}
						</div>
					</>
				)
			}
		},
		{
			header: 'Customer',
			accessorKey: 'orderId',
			cell: ({ row }) => {
				return (
					<>
						<div className="text-gray-600">Customer:</div>
						<div className="font-semibold text-gray-800">
							{row.original.user.name}
						</div>
					</>
				)
			}
		},
		{
			header: 'Units',
			cell: ({ row }) => {
				return (
					<>
						<div className="text-gray-600">Units:</div>
						<div className="font-semibold text-gray-800">
							{row.original.cart.CartProduct.reduce((sum, product) =>
								sum + product.sizes.reduce((sizeSum: number, size: any) => sizeSum + size.quantity, 0)
								, 0)}
						</div>
					</>
				)
			}
		},
		{
			header: 'Amounts',
			accessorKey: 'total',
			cell: ({ row }) => {
				console.log(row);
				const amount = row.original.total;
				const formatted = new Intl.NumberFormat("en-IN", {
					style: "currency",
					currency: "INR",
				}).format(amount)
				return (
					<>
						<>
							<div className="text-gray-600">Amount:</div>
							<div className="font-semibold text-gray-800">
								{`${formatted} + shipping`}
							</div>
						</>
					</>
				)
			},
		},
		{
			header: 'Ready Order',
			cell: ({ row }) => {
				return (
					<Dialog>
						<DialogTrigger asChild>
							<Button
								// variant={'destructive'}
								className='bg-green-500 hover:bg-green-700'
								aria-label='delete order'
								disabled={moveMutation.isPending || deleteMutation.isPending}
							>
								<CheckCheck className="h-5 w-5 mr-2" />
								Order Ready
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogTitle>
								{`Is order ${row.original.orderId} ready?`}
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
								// variant={'destructive'}
								className='bg-green-500 hover:bg-green-700'
								aria-label='delete order'
								onClick={async (e: any) => {
									e.preventDefault();
									await moveMutation.mutate(row.original.id)
								}}
								disabled={moveMutation.isPending || deleteMutation.isPending}
							>
								<CheckCheck className="h-5 w-5 mr-2" />
								Order Ready
							</Button>
						</DialogContent>
					</Dialog>

				)
			},
		},
		{
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
		},
	];

	if (isFetching || searchOrderQuery.isFetching) {
		return (
			<DataLoader loading={isFetching || searchOrderQuery.isFetching} />
		)
	}

	if (!data.data.pendingOrders || data.data.pendingOrders.length === 0) {
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
				</div>
				<Card className="w-full max-w-md mx-auto mt-8 mb-2">
					<CardContent className="flex flex-col items-center justify-center p-6">
						<AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
						<h3 className="text-lg font-semibold text-gray-700 mb-2">
							No pending Orders
						</h3>
						<p className="text-sm text-gray-500 text-center">
							There are currently no orders in the pending state.
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
		</>
	)
}

export default PendingOrders;