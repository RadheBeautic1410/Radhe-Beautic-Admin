import { useState, isValidElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";

interface DialogDemoProps {
  children: React.ReactNode | ((closeDialog: () => void) => React.ReactNode);
  dialogTrigger: string | React.ReactElement; // Allow string or element for trigger
  dialogTitle: string;
  dialogDescription: string;
  ButtonLabel?: string;
  bgColor?:
    | "destructive"
    | "default"
    | "outline"
    | "link"
    | "secondary"
    | "ghost"
    | null
    | undefined;
  isTriggerElement?: boolean; // Optional prop to indicate if trigger is an element
  dialogContentClassName?: string; // Optional prop to customize dialog content width
}

export const DialogDemo = ({
  children,
  dialogTrigger,
  dialogTitle,
  dialogDescription,
  ButtonLabel,
  bgColor,
  isTriggerElement = false, // Default to false if not provided
  dialogContentClassName, // Optional custom className for dialog content
}: DialogDemoProps) => {
  const [open, setOpen] = useState(false);
  const closeDialog = () => setOpen(false);

  const renderChildren = () => {
    if (typeof children === "function") {
      return children(closeDialog); // new pattern with close support
    }
    return children; // old pattern
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {!isTriggerElement ? (
          <Button variant={bgColor ? bgColor : "outline" }>
            {dialogTrigger}
          </Button>
        ) : (
          dialogTrigger
        )}
      </DialogTrigger>
      <DialogContent className={dialogContentClassName || "sm:max-w-[425px]"}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {renderChildren()}

        {/* Optional Footer Button */}
        {ButtonLabel && (
          <DialogFooter>
            <Button onClick={closeDialog}>{ButtonLabel}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
