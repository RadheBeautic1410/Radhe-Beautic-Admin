import { redirect } from "next/navigation";

const ReadyOrdersPage = () => {
  redirect("/orders/pending");
};

export default ReadyOrdersPage;
