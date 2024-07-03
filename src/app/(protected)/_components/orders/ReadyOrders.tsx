'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ColumnDef,
} from '@tanstack/react-table';

import { format, parseISO, addDays } from 'date-fns';
import { getOrdersOfUserbyStatus } from '@/src/actions/orders';
import DataLoader from '@/src/components/DataLoader';
import { Button } from '@/src/components/ui/button';
import { ArrowUpDown, CheckCheck, MoreHorizontal, Trash2 } from "lucide-react"
import OrderTable from './OrderTable';
import ViewOrderDialog from './ViewOrderDialog';
import { deleteOrder } from '@/src/actions/order';
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
import { AlertCircle, ShieldAlert } from "lucide-react";
import { Card, CardContent } from '@/src/components/ui/card';
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import {
	Popover, PopoverContent,
	PopoverTrigger,
} from '@/src/components/ui/popover';
import { cn } from '@/src/lib/utils';
import { Calendar } from '@/src/components/ui/calendar';
import { Dialog, DialogContent, DialogTitle } from '@/src/components/ui/dialog';
import { DialogTrigger } from '@radix-ui/react-dialog';
import PackingPending from './PackingPendingDialog';

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


const ReadyOrders = () => {
	// const [isError, setIsError] = useState(false);
	const queryClient = useQueryClient();
	const [dateRange, setDateRange] = useState<DateRange | undefined>({
		from: addDays(new Date(), -20),
		to: new Date(),
	});
	const [page, setPage] = React.useState(0)
	const [pageSize, setPageSize] = useState(10);
	const fetchReadyOrders = async (pageParam: number, pageSizeParam: number, dateRange: DateRange | undefined) => {
		console.log(pageParam);
		const res = await fetch(
			"/api/orders/getOrderslist", {
			method: "POST",
			body: JSON.stringify({
				status: "PROCESSING",
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
			queryKey: ['readyOrders', page, pageSize, dateRange],
			queryFn: () => fetchReadyOrders(page, pageSize, dateRange),
			placeholderData: keepPreviousData,
			staleTime: 5 * 60 * 1000,
		})

	console.log('query-data', data);


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
			header: 'Delete Order',
			cell: ({ row }) => {
				return (
					<>
						<PackingPending data={row.original.orderId}/>
					</>
				)
			},
		}
	];

	if (isFetching) {
		return (
			<DataLoader loading={isFetching} />
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
				</div>
				<Card className="w-full max-w-md mx-auto mt-8 mb-2 ">
					<CardContent className="flex flex-col items-center justify-center p-6">
						<AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
						<h3 className="text-lg font-semibold text-gray-700 mb-2">
							No ready Orders
						</h3>
						<p className="text-sm text-gray-500 text-center">
							There are currently no orders in the ready state.
						</p>
					</CardContent>
				</Card>
			</>
		)
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
			</div>
			<OrderTable data={data.data.pendingOrders} columns={columns} />
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

export default ReadyOrders;