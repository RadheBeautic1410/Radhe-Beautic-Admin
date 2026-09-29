"use client";

import {
  LOCATION_LABELS,
  STOCK_LOCATIONS,
  StockLocation,
  getLocationQty,
} from "@/src/lib/godown";

/**
 * Pre-select a location only when it is the single place that can cover the
 * quantity - otherwise the person packing the order has to choose.
 */
export const suggestStockLocation = (
  sizeRow: any,
  quantity: number
): StockLocation | undefined => {
  const able = STOCK_LOCATIONS.filter((loc) => getLocationQty(sizeRow, loc) >= quantity);
  return able.length === 1 ? able[0] : undefined;
};

interface StockLocationPickerProps {
  /** The kurti's `sizes` row for the size being sent. */
  sizeRow: any;
  quantity: number;
  value?: StockLocation;
  onChange: (location: StockLocation) => void;
}

/** One button per location showing its stock; greyed out when it can't cover `quantity`. */
export const StockLocationPicker: React.FC<StockLocationPickerProps> = ({
  sizeRow,
  quantity,
  value,
  onChange,
}) => {
  return (
    <div className="flex flex-wrap gap-1">
      {STOCK_LOCATIONS.map((loc) => {
        const qty = sizeRow ? getLocationQty(sizeRow, loc) : 0;
        const enough = qty >= quantity;
        const active = value === loc;
        return (
          <button
            key={loc}
            type="button"
            disabled={!enough}
            onClick={() => onChange(loc)}
            title={enough ? `Take from ${LOCATION_LABELS[loc]}` : `Only ${qty} in ${LOCATION_LABELS[loc]}`}
            className={`px-2 py-1 rounded-md border text-xs font-semibold whitespace-nowrap transition-colors ${
              active
                ? "bg-slate-800 border-slate-800 text-white"
                : enough
                  ? "bg-white border-gray-300 text-gray-800 hover:bg-gray-50"
                  : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {LOCATION_LABELS[loc]} {qty}
          </button>
        );
      })}
      {!value && (
        <span className="text-[11px] font-semibold text-red-600 self-center">Choose</span>
      )}
    </div>
  );
};
