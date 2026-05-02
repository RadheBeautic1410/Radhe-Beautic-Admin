import { redirect } from "next/navigation";

const RejectedOrdersPage = () => {
  redirect("/orders/pending");
};

export default RejectedOrdersPage;
