import { useState, isValidElement } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/src/components/ui/sheet";
import { Button } from "@/src/components/ui/button";

interface SheetDemoProps {
  children: React.ReactNode | ((closeSheet: () => void) => React.ReactNode);
  sheetTrigger: string | React.ReactElement; // Allow string or element for trigger
  sheetTitle: string;
  sheetDescription: string;
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
  onOpenChange?: (open: boolean) => void; // Optional callback for open state changes
  sheetContentClassName?: string; // Optional className for SheetContent
  open?: boolean; // Optional controlled open state
  side?: "top" | "bottom" | "left" | "right";
}

export const SheetDemo = ({
  children,
  sheetTrigger,
  sheetTitle,
  sheetDescription,
  ButtonLabel,
  bgColor,
  isTriggerElement = false, // Default to false if not provided
  onOpenChange,
  sheetContentClassName,
  open: controlledOpen,
  side = "right",
}: SheetDemoProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const closeSheet = () => {
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
      return children(closeSheet); // new pattern with close support
    }
    return children; // old pattern
  };

  // Automatically detect if sheetTrigger is a React element
  const isReactElement = isValidElement(sheetTrigger);
  const shouldUseAsChild = isTriggerElement || isReactElement;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild={shouldUseAsChild}>
        {shouldUseAsChild ? (
          sheetTrigger
        ) : (
          <Button variant={bgColor ? bgColor : "outline"}>
            {sheetTrigger}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side={side}
        className={
          sheetContentClassName ||
          "w-full sm:max-w-[550px] h-full !flex !flex-col overflow-y-auto"
        }
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-4">
          {renderChildren()}
        </div>

        {/* Optional Footer Button */}
        {ButtonLabel && (
          <SheetFooter className="flex-shrink-0 mt-auto">
            <Button onClick={closeSheet}>{ButtonLabel}</Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};
