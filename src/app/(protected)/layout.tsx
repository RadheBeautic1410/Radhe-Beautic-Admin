'use client';
import Navbar from "./_components/navbar/navbar"
import {
    useQuery,
    useMutation,
    useQueryClient,
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query';
interface ProtectedLayoutProps {
    children: React.ReactNode
}
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
const queryClient = new QueryClient()

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
    return (

        <div className="min-h-screen w-full flex py-4 flex-col gap-y-10 items-center pt-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 to-blue-800">
            <Navbar />
            <QueryClientProvider client={queryClient}>

                {children}
                <ReactQueryDevtools />
            </QueryClientProvider>
        </div>
    )
}

export default ProtectedLayout
