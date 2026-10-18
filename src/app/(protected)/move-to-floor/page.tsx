"use client";

import React from "react";
import NotAllowedPage from "../_components/errorPages/NotAllowedPage";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { PendingFloorMoves } from "../_components/godown/pending-floor-moves";
import { PermissionGate } from "@/src/components/auth/permission-gate";

function MoveToFloorPage() {
  return (
    <Card className="w-full h-full rounded-none">
      <CardHeader>
        <p className="text-2xl font-semibold text-center">
          ⬇️ Move to Selling Floor
        </p>
        <p className="text-sm text-center text-gray-600">
          Every size below still has stock, but all of its pieces are lying in the
          godown - nothing is on the selling floor. Bring these down so the floor
          team can actually sell them.
        </p>
      </CardHeader>

      <CardContent className="w-full flex flex-col gap-3">
        <div>
          <Link href="/godown">
            <Button type="button" variant={"outline" as any}>
              🏬 Go to Godown Stock scanner
            </Button>
          </Link>
        </div>
        <PendingFloorMoves />
      </CardContent>
    </Card>
  );
}

const MoveToFloorHelp = () => {
  return (
    <PermissionGate permission="moveToFloor.view">
      <MoveToFloorPage />
    </PermissionGate>
  );
};

export default MoveToFloorHelp;
