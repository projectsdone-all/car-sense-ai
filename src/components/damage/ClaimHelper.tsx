import { useMemo, useState } from "react";
import { Copy, FileCheck2, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { damageLabel, formatDate, formatRange, humanisePart, severityLabel } from "@/lib/format";
import { shareText } from "@/services/notification/notificationService";
import type { DamageDetection, RepairEstimate } from "@/types";

const KEY = "carsense.claim-details.v1";

interface Saved {
  insurer: string;
  policy: string;
  owner: string;
  phone: string;
}

function loadSaved(): Saved {
  try {
    return { insurer: "", policy: "", owner: "", phone: "", ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { insurer: "", policy: "", owner: "", phone: "" };
  }
}

export function ClaimHelper({
  open,
  onOpenChange,
  reportId,
  createdAt,
  vehicle,
  detections,
  estimate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  createdAt: string;
  vehicle: { brand?: string; model?: string; year?: number | null; registration_number?: string | null } | null;
  detections: DamageDetection[];
  estimate: RepairEstimate;
}) {
  const [saved, setSaved] = useState<Saved>(loadSaved);
  const [incidentDate, setIncidentDate] = useState(createdAt.slice(0, 10));
  const [place, setPlace] = useState("");
  const [story, setStory] = useState("");

  const update = (patch: Partial<Saved>) => {
    const next = { ...saved, ...patch };
    setSaved(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  const text = useMemo(() => {
    const car = vehicle ? [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ") : "—";
    return [
      `Subject: Motor insurance claim intimation${vehicle?.registration_number ? ` — ${vehicle.registration_number}` : ""}`,
      "",
      `Dear ${saved.insurer || "Claims Team"},`,
      "",
      "I would like to intimate a claim for damage to my insured vehicle. Details are below.",
      "",
      `Policy number: ${saved.policy || "__________"}`,
      `Policy holder: ${saved.owner || "__________"}`,
      `Contact: ${saved.phone || "__________"}`,
      `Vehicle: ${car}`,
      `Registration: ${vehicle?.registration_number || "__________"}`,
      `Date of incident: ${incidentDate ? formatDate(incidentDate) : "__________"}`,
      `Place of incident: ${place || "__________"}`,
      "",
      "What happened:",
      story || "__________",
      "",
      "Damage observed (Car Sense AI inspection):",
      ...detections.map(
        (d, i) => `${i + 1}. ${damageLabel(d.class)} — ${humanisePart(d.part)} (${severityLabel(d.severity)})`,
      ),
      "",
      `Estimated repair cost: ${formatRange(estimate.local_mechanic.min, estimate.showroom.max)}`,
      `  • Authorized service center: ${formatRange(estimate.showroom.min, estimate.showroom.max)}`,
      `  • Local mechanic: ${formatRange(estimate.local_mechanic.min, estimate.local_mechanic.max)}`,
      "",
      `Inspection reference: CS-${reportId.slice(0, 8).toUpperCase()} dated ${formatDate(createdAt)}. Photos are attached.`,
      "Please let me know the next steps and the surveyor visit schedule.",
      "",
      "Regards,",
      saved.owner || "",
    ].join("\n");
  }, [saved, incidentDate, place, story, vehicle, detections, estimate, reportId, createdAt]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Claim letter copied.");
    } catch {
      toast.error("Copy is not available here.");
    }
  }

  async function share() {
    const outcome = await shareText({ title: "Insurance claim", text });
    if (outcome === "shared") toast.success("Claim shared.");
    else if (outcome === "copied") toast.success("Claim letter copied.");
  }

  function email() {
    const [subjectLine, ...rest] = text.split("\n");
    const subject = subjectLine!.replace(/^Subject:\s*/, "");
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(rest.join("\n").trim())}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[28rem] overflow-y-auto rounded-3xl border-border bg-popover p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display flex items-center gap-2 text-xl">
            <FileCheck2 className="size-5 text-primary" aria-hidden /> Insurance claim helper
          </DialogTitle>
          <DialogDescription>
            Fill in a few details and get a ready-to-send claim letter with this inspection attached.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="claim-insurer">Insurance company</Label>
            <Input id="claim-insurer" placeholder="e.g. ICICI Lombard" value={saved.insurer} onChange={(e) => update({ insurer: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claim-policy">Policy number</Label>
            <Input id="claim-policy" value={saved.policy} onChange={(e) => update({ policy: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claim-date">Incident date</Label>
            <Input id="claim-date" type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claim-owner">Your name</Label>
            <Input id="claim-owner" autoComplete="name" value={saved.owner} onChange={(e) => update({ owner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claim-phone">Phone</Label>
            <Input id="claim-phone" type="tel" autoComplete="tel" value={saved.phone} onChange={(e) => update({ phone: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="claim-place">Place of incident</Label>
            <Input id="claim-place" placeholder="e.g. Outer Ring Road, Hebbal" value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="claim-story">What happened</Label>
            <Textarea id="claim-story" rows={3} placeholder="e.g. Another vehicle hit the front door while reversing in a parking lot." value={story} onChange={(e) => setStory(e.target.value)} />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Preview</p>
          <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-border bg-[oklch(0.12_0.02_258/0.6)] p-3 font-sans text-xs leading-relaxed text-muted-foreground">
            {text}
          </pre>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="min-h-11" onClick={copy}>
            <Copy aria-hidden /> Copy
          </Button>
          <Button variant="outline" className="min-h-11" onClick={email}>
            <Mail aria-hidden /> Email
          </Button>
          <Button className="min-h-11" onClick={share}>
            <Share2 aria-hidden /> Share
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Intimate your insurer quickly — most policies ask for it within a few days of the incident.
        </p>
      </DialogContent>
    </Dialog>
  );
}
