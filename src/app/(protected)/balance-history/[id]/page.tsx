import BalanceHistoryClient from "./client";

// No "use client" here
export default async function BalanceHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  console.log("Resolved userId:", userId);
  return <BalanceHistoryClient userId={userId} />;
}
