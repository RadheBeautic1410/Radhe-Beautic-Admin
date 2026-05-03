import { redirect } from "next/navigation";

const TrackingPendingOrdersPage = () => {
  redirect("/orders/pending");
};

export default TrackingPendingOrdersPage;
