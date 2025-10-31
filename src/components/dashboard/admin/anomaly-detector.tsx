"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bot, ShieldAlert, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Visit, User, Outlet } from "@/lib/types";
import { checkVisitAnomaly } from "@/lib/actions";

export function AnomalyDetector({ visit, users, outlets }: { visit: Visit, users: User[], outlets: Outlet[] }) {
  const [open, setOpen] = useState(false);
  const [criteria, setCriteria] = useState("duration_minutes exceeds 120");
  const [result, setResult] = useState<{ isAnomalous: boolean; reason: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleCheck = async () => {
    startTransition(async () => {
      setResult(null);
      
      const userName = users.find(u => u.id === visit.user_id)?.name || 'Unknown User';
      const outletName = outlets.find(o => o.id === visit.outlet_id)?.name || 'Unknown Outlet';
      
      const visitDetails = `Visit by ${userName} at ${outletName}. Entry: ${visit.entry_time}, Exit: ${visit.exit_time}, Duration: ${visit.duration_minutes} minutes.`;
      
      const response = await checkVisitAnomaly(visitDetails, criteria);

      if (response.error) {
        toast({
          variant: "destructive",
          title: "An error occurred",
          description: response.error,
        });
        return;
      }
      
      setResult(response.data);
      if (response.data?.isAnomalous) {
        toast({
            variant: "destructive",
            title: "Anomaly Detected!",
            description: response.data.reason,
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Check
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline"><Bot /> AI Anomaly Detection</DialogTitle>
          <DialogDescription>
            Use AI to check this visit against specific criteria for anomalies.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="criteria">Criteria</Label>
            <Textarea
              id="criteria"
              placeholder="e.g., duration_minutes exceeds 120"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
            />
             <p className="text-sm text-muted-foreground">
                Describe the rule to check for. The AI can check against any detail from the visit.
            </p>
          </div>

          {result && (
             <Alert variant={result.isAnomalous ? "destructive" : "default"}>
                {result.isAnomalous ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                <AlertTitle>{result.isAnomalous ? "Anomaly Found" : "No Anomaly Found"}</AlertTitle>
                <AlertDescription>
                  {result.reason}
                </AlertDescription>
            </Alert>
          )}

        </div>
        <DialogFooter>
          <Button onClick={handleCheck} disabled={isPending}>
            {isPending ? "Analyzing..." : "Check for Anomaly"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
