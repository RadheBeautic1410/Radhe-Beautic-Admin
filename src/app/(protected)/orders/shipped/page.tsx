import { redirect } from "next/navigation";

const ShippedOrdersPage = () => {
  redirect("/orders/pending");
};

export default ShippedOrdersPage;
