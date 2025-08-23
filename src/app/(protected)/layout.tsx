// 'use client';
// import Navbar from "./_components/navbar/navbar"
// import {
//     useQuery,
//     useMutation,
//     useQueryClient,
//     QueryClient,
//     QueryClientProvider,
// } from '@tanstack/react-query';
// interface ProtectedLayoutProps {
//     children: React.ReactNode
// }
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// const queryClient = new QueryClient()

// const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
//     return (

//         <div className="min-h-screen w-full flex py-4 flex-col gap-y-10 items-center pt-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 to-blue-800">
//             <Navbar />
//             <QueryClientProvider client={queryClient}>

//                 {children}
//                 <ReactQueryDevtools />
//             </QueryClientProvider>
//         </div>
//     )
// }

// export default ProtectedLayout

"use client";
import Sidebar from "./_components/navbar/navbar";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
interface ProtectedLayoutProps {
  children: React.ReactNode;
}
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
const queryClient = new QueryClient();

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-full flex bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 to-blue-800">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            <div className="mx-auto min-h-full">{children}</div>
          </div>
        </main>
        <ReactQueryDevtools />
      </div>
    </QueryClientProvider>
  );
};

export default ProtectedLayout;

// components/Layout.tsx
// import { cn } from "@/src/lib/utils";
// import React, { useState } from "react";

// export default function Layout({ children }: { children: React.ReactNode }) {
//   const [isCollapsed, setIsCollapsed] = useState(false);
//   const [isMobileOpen, setIsMobileOpen] = useState(false);

//   return (
//     <div className="flex h-screen overflow-hidden">
//       {/* Sidebar */}
//       <aside
//         className={cn(
//           "fixed lg:relative top-0 left-0 z-50 h-screen bg-white/10 backdrop-blur-lg border-r border-white/20 shadow-xl transition-all duration-300",
//           isCollapsed ? "w-16" : "w-64",
//           isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
//         )}
//       >
//         <div className="p-4">
//           <button
//             onClick={() => setIsCollapsed(!isCollapsed)}
//             className="text-sm bg-white/20 px-2 py-1 rounded"
//           >
//             {isCollapsed ? "Expand" : "Collapse"}
//           </button>
//         </div>
//       </aside>

//       {/* Main content area */}
//       <div
//         className={cn(
//           "flex-1 overflow-y-auto transition-all duration-300",
//           isCollapsed ? "ml-16" : "ml-64"
//         )}
//       >
//         <div className="min-h-screen p-6 space-y-4">
//           {children}
//         </div>
//       </div>
//     </div>
//   );
// }
