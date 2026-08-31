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
  isTriggerElement?: boolean; // Deprecated: element triggers are detected automatically
  onOpenChange?: (open: boolean) => void; // Optional callback for open state changes
  dialogContentClassName?: string; // Optional className for DialogContent
  open?: boolean; // Optional controlled open state
}

export const DialogDemo = ({
  children,
  dialogTrigger,
  dialogTitle,
  dialogDescription,
  ButtonLabel,
  bgColor,
  onOpenChange,
  dialogContentClassName,
  open: controlledOpen,
}: DialogDemoProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const closeDialog = () => {
    if (controlledOpen === undefined) {
      setInternalOpen(false);
    }
    onOpenChange?.(false);
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const renderChildren = () => {
    if (typeof children === "function") {
      return children(closeDialog); // new pattern with close support
    }
    return children; // old pattern
  };

  // Slot (asChild) requires a single React element child, so only forward the
  // trigger directly when it really is one; strings get wrapped in a Button.
  const useElementTrigger = isValidElement(dialogTrigger);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {useElementTrigger ? (
          dialogTrigger
        ) : (
          <Button variant={bgColor ? bgColor : "outline" }>
            {dialogTrigger}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={dialogContentClassName || "sm:max-w-[425px] max-h-[85vh] !flex !flex-col"}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
        {renderChildren()}
        </div>

        {/* Optional Footer Button */}
        {ButtonLabel && (
          <DialogFooter className="flex-shrink-0">
            <Button onClick={closeDialog}>{ButtonLabel}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
