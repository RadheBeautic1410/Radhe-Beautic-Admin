import PageLoader from "@/src/components/loader";
import { Card, CardHeader } from "@/src/components/ui/card";

export default function Loading() {
    return (
        <>
            <PageLoader loading={true}/>
        </>
    )
}