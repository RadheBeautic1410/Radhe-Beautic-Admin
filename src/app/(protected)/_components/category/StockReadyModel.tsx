"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { CheckCircle } from "lucide-react";

interface SetStockReadyModalProps {
  categoryCode: string;
  categoryName?: string;
  onSetStockReady: (
    categoryCode: string
  ) => Promise<{ success?: boolean; error?: string }>;
  trigger?: React.ReactNode;
}

const SetStockReadyModal = ({
  categoryCode,
  categoryName,
  onSetStockReady,
  trigger,
}: SetStockReadyModalProps) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(() => {
      onSetStockReady(categoryCode)
        .then((data) => {
          setOpen(false);
        })
        .catch((error) => {
          console.error("Set stock ready error:", error);
          toast.error("Something went wrong!");
        });
    });
  };

  // Reset form when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            Set Stock Ready
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] overflow-auto max-h-[90%]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <DialogTitle className="text-green-600">
              Set Stock Ready
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600">
            {categoryName
              ? `You are about to mark stock as ready for "${categoryName}" (${categoryCode}).`
              : `You are about to mark stock as ready for category "${categoryCode}".`}
            <br />
          </DialogDescription>
        </DialogHeader>
        <Button
          variant="default"
          size="sm"
          className="bg-green-600 hover:bg-green-700"
          onClick={handleSubmit}
          disabled={isPending}
        >
          Confirm
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default SetStockReadyModal;
