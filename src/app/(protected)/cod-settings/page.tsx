"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Switch } from "@/src/components/ui/switch";
import { Textarea } from "@/src/components/ui/textarea";
import { Badge } from "@/src/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { useCan } from "@/src/components/auth/permissions-provider";
import {
  CodSlabRow,
  deleteCodSlab,
  getCodConfig,
  loadSpeedPostRateCard,
  previewCodCharge,
  saveCodSetting,
  saveCodSlab,
} from "@/src/actions/cod-charge";
import { CodQuote, CodSlab, COD_ZONES, codZoneLabel, parsePincodePatterns } from "@/src/lib/cod";

type SlabDraft = Record<keyof CodSlab, string>;

type ReturnStats = { days: number; delivered: number; returned: number; returnRatePercent: number | null };

const EMPTY_DRAFT: SlabDraft = { maxWeightGrams: "", local: "", withinState: "", metro: "", otherStates: "" };
const SLAB_FIELDS = ["local", "withinState", "metro", "otherStates"] as const;

const toDraft = (s: CodSlab): SlabDraft => ({
  maxWeightGrams: String(s.maxWeightGrams),
  local: String(s.local),
  withinState: String(s.withinState),
  metro: String(s.metro),
  otherStates: String(s.otherStates),
});

const fromDraft = (d: SlabDraft): CodSlab => ({
  maxWeightGrams: Number(d.maxWeightGrams),
  local: Number(d.local),
  withinState: Number(d.withinState),
  metro: Number(d.metro),
  otherStates: Number(d.otherStates),
});

const formatWeight = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString("en-IN")} kg` : `${g} g`);
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const CodSettingsPage = () => {
  const canEdit = useCan("codCharges.edit");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  const [enabled, setEnabled] = useState(false);
  const [localText, setLocalText] = useState("");
  const [withinStateText, setWithinStateText] = useState("");
  const [metroText, setMetroText] = useState("");
  const [codFeePercent, setCodFeePercent] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [returnRatePercent, setReturnRatePercent] = useState("");
  const [roundTo, setRoundTo] = useState("");
  const [returnStats, setReturnStats] = useState<ReturnStats | null>(null);

  const [slabs, setSlabs] = useState<CodSlabRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null); // "new" for the add row
  const [draft, setDraft] = useState<SlabDraft>(EMPTY_DRAFT);

  const [testWeight, setTestWeight] = useState("500");
  const [testPincode, setTestPincode] = useState("395004");
  const [testAmount, setTestAmount] = useState("1000");
  const [testQuote, setTestQuote] = useState<CodQuote | null>(null);

  const load = async () => {
    const res = await getCodConfig();
    if (!("setting" in res)) {
      toast.error(res.error);
    } else {
      const s = res.setting;
      setEnabled(s.enabled);
      setLocalText(s.localPincodes.join(", "));
      setWithinStateText(s.withinStatePincodes.join(", "));
      setMetroText(s.metroPincodes.join(", "));
      setCodFeePercent(String(s.codFeePercent));
      setGstPercent(String(s.gstPercent));
      setReturnRatePercent(String(s.returnRatePercent));
      setRoundTo(String(s.roundTo));
      setReturnStats(res.returnStats);
      setSlabs(res.slabs);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const run = (action: () => Promise<{ success?: string | boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (typeof res.success === "string") toast.success(res.success);
      after?.();
      await load();
    });

  const formulaValues = () => ({
    codFeePercent: Number(codFeePercent),
    gstPercent: Number(gstPercent),
    returnRatePercent: Number(returnRatePercent),
    roundTo: Number(roundTo),
  });

  const saveSettings = () =>
    run(() =>
      saveCodSetting({
        enabled,
        localPincodes: parsePincodePatterns(localText),
        withinStatePincodes: parsePincodePatterns(withinStateText),
        metroPincodes: parsePincodePatterns(metroText),
        ...formulaValues(),
      })
    );

  const startEdit = (slab: CodSlabRow | null) => {
    setEditingId(slab ? slab.id : "new");
    setDraft(slab ? toDraft(slab) : EMPTY_DRAFT);
  };

  const saveDraft = () => {
    if (Object.values(draft).some((v) => v.trim() === "")) {
      toast.error("Fill the weight and all four charges");
      return;
    }
    run(
      () => saveCodSlab(fromDraft(draft), editingId === "new" ? undefined : editingId ?? undefined),
      () => setEditingId(null)
    );
  };

  const removeSlab = (slab: CodSlabRow) => {
    if (!confirm(`Delete the ${formatWeight(slab.maxWeightGrams)} slab?`)) return;
    run(() => deleteCodSlab(slab.id));
  };

  const loadRateCard = () => {
    if (slabs.length && !confirm("Replace all slabs with the Speed Post rate card (01.08.2026)?")) return;
    run(() => loadSpeedPostRateCard());
  };

  // Previews with the values typed on this page, saved or not.
  const runTest = () =>
    startTransition(async () => {
      const res = await previewCodCharge(
        Number(testWeight) || 0,
        testPincode,
        Number(testAmount) || 0,
        formulaValues()
      );
      if (res.quote) setTestQuote(res.quote);
      else toast.error(res.error || "Failed to calculate");
    });

  const draftRow = (
    <TableRow>
      <TableCell>
        <Input
          type="number"
          min={1}
          placeholder="grams"
          value={draft.maxWeightGrams}
          onChange={(e) => setDraft({ ...draft, maxWeightGrams: e.target.value })}
          className="w-28"
        />
      </TableCell>
      {SLAB_FIELDS.map((f) => (
        <TableCell key={f}>
          <Input
            type="number"
            min={0}
            value={draft[f]}
            onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
            className="w-24"
          />
        </TableCell>
      ))}
      <TableCell className="whitespace-nowrap">
        <Button size="icon" variant="ghost" onClick={saveDraft} disabled={isPending} aria-label="Save">
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} aria-label="Cancel">
          <X className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );

  if (loading) return <div className="container mx-auto p-6">Loading...</div>;

  const r = Number(returnRatePercent) || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="rounded-none">
        <CardHeader className="py-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
            <CardTitle className="text-2xl font-semibold">💵 Cash on Delivery</CardTitle>
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "COD ON" : "COD OFF"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <Switch id="cod-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={!canEdit} />
            <Label htmlFor="cod-enabled">Offer Cash on Delivery at checkout</Label>
          </div>

          <div className="space-y-3 rounded-md border p-4">
            <h3 className="font-semibold">Charge formula</h3>
            <p className="text-sm text-muted-foreground">
              COD charge = shipping (table below) + COD fee % of product amount + GST on that fee + return cover. Return
              cover = shipping × return rate ÷ (100 − return rate). It makes the parcels customers keep pay for the
              shipping of the ones that come back.
            </p>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {[
                { label: "COD fee (% of product amount)", value: codFeePercent, set: setCodFeePercent },
                { label: "GST on COD fee (%)", value: gstPercent, set: setGstPercent },
                { label: "Expected return rate (%)", value: returnRatePercent, set: setReturnRatePercent },
                { label: "Round charge up to (₹)", value: roundTo, set: setRoundTo },
              ].map((f) => (
                <div key={f.label} className="space-y-1">
                  <Label>{f.label}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              ))}
            </div>
            {returnStats && (
              <p className="text-sm">
                Actual return rate, last {returnStats.days} days:{" "}
                {returnStats.returnRatePercent == null ? (
                  <span className="text-muted-foreground">no delivered or returned COD orders yet</span>
                ) : (
                  <>
                    <b>{returnStats.returnRatePercent}%</b> ({returnStats.returned} returned of{" "}
                    {returnStats.delivered + returnStats.returned})
                    {returnStats.returnRatePercent > r && (
                      <span className="text-red-600">
                        {" "}
                        — higher than your expected {r}%, so returns are not fully covered
                      </span>
                    )}
                  </>
                )}
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            The zone comes from the delivery pincode, checked in this order: Local, Within State, Zone / Metro, then
            Other States for everything else. Patterns: <code>395*</code>, <code>364001-364005</code> or{" "}
            <code>395004</code>, separated by commas.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Local pincodes", value: localText, set: setLocalText },
              { label: "Within State pincodes", value: withinStateText, set: setWithinStateText },
              { label: "Zone / Metro pincodes", value: metroText, set: setMetroText },
            ].map((z) => (
              <div key={z.label} className="space-y-1">
                <Label>{z.label}</Label>
                <Textarea value={z.value} onChange={(e) => z.set(e.target.value)} rows={3} disabled={!canEdit} />
              </div>
            ))}
          </div>
          {canEdit && (
            <Button onClick={saveSettings} disabled={isPending}>
              Save settings
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader className="py-3">
          <CardTitle className="text-xl font-semibold">Test a parcel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-1">
              <Label>Weight (grams)</Label>
              <Input type="number" min={0} value={testWeight} onChange={(e) => setTestWeight(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Pincode</Label>
              <Input value={testPincode} maxLength={6} onChange={(e) => setTestPincode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Product amount (₹)</Label>
              <Input type="number" min={0} value={testAmount} onChange={(e) => setTestAmount(e.target.value)} />
            </div>
            <Button onClick={runTest} disabled={isPending}>
              Calculate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Uses the formula values typed above, even before saving.</p>
          {testQuote &&
            (testQuote.available ? (
              <div className="text-sm space-y-1 rounded-md border p-3 max-w-md">
                <div className="flex justify-between">
                  <span>
                    Shipping ({codZoneLabel(testQuote.zone)}, up to {formatWeight(testQuote.slabMaxGrams)})
                  </span>
                  <span>{inr(testQuote.shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span>COD fee + GST</span>
                  <span>{inr(testQuote.codFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Return cover</span>
                  <span>{inr(testQuote.returnCover)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Customer pays (rounded up)</span>
                  <span>{inr(testQuote.charge)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-600">
                {testQuote.reason}
                {testQuote.zone ? ` (zone: ${codZoneLabel(testQuote.zone)})` : ""}
              </p>
            ))}
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader className="py-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
            <CardTitle className="text-xl font-semibold">Courier shipping by weight (₹, incl. GST)</CardTitle>
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadRateCard} disabled={isPending}>
                  Load Speed Post rate card
                </Button>
                <Button onClick={() => startEdit(null)} disabled={isPending || editingId !== null}>
                  <Plus className="h-4 w-4 mr-1" /> Add slab
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Weight up to</TableHead>
                  {COD_ZONES.map((z) => (
                    <TableHead key={z.key}>{z.label}</TableHead>
                  ))}
                  {canEdit && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {slabs.map((slab) =>
                  editingId === slab.id ? (
                    <Fragment key={slab.id}>{draftRow}</Fragment>
                  ) : (
                    <TableRow key={slab.id}>
                      <TableCell className="font-medium">{formatWeight(slab.maxWeightGrams)}</TableCell>
                      {SLAB_FIELDS.map((f) => (
                        <TableCell key={f}>₹{slab[f]}</TableCell>
                      ))}
                      {canEdit && (
                        <TableCell className="whitespace-nowrap">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEdit(slab)}
                            disabled={isPending || editingId !== null}
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeSlab(slab)}
                            disabled={isPending}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                )}
                {editingId === "new" && draftRow}
                {slabs.length === 0 && editingId !== "new" && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No slabs yet. Load the Speed Post rate card or add slabs by hand. COD stays hidden until slabs
                      exist.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            The smallest slab that covers the parcel weight is used. Parcels heavier than the last slab cannot be sent
            COD. The slab shipping also prefills the return (RTO) charge when a COD parcel comes back.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CodSettingsPage;
