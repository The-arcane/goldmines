
"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, MapPin, TriangleAlert, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { markAttendance } from "@/lib/actions";

type AttendanceDialogProps = {
  type: "checkin" | "checkout";
  onAttendanceMarked: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

export function AttendanceDialog({ type, onAttendanceMarked, disabled, children }: AttendanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { coords, error: geoError } = useGeolocation({ enableHighAccuracy: true });
  const { toast } = useToast();

  const getCameraPermission = useCallback(async () => {
      if (typeof window === 'undefined' || !navigator.mediaDevices) return;
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
      } catch (error) {
          console.error("Error accessing camera:", error);
          setHasCameraPermission(false);
          toast({
              variant: "destructive",
              title: "Camera Access Denied",
              description: "Please enable camera permissions in your browser settings.",
          });
      }
  }, [toast]);
  
  useEffect(() => {
    if (open) {
      getCameraPermission();
    } else {
       // Stop camera when dialog closes
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [open, getCameraPermission]);


  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL("image/jpeg");
        setSelfie(dataUri);
      }
    }
  };

  const handleSubmit = () => {
    if (!selfie) {
        toast({ variant: "destructive", title: "No Selfie", description: "Please capture a selfie first." });
        return;
    }
    if (!coords) {
        toast({ variant: "destructive", title: "No Location", description: "Could not get your location. Please ensure location services are enabled." });
        return;
    }
    
    startTransition(async () => {
        const result = await markAttendance({ type, coords, selfie });
        if(result.success) {
            toast({ title: type === 'checkin' ? "Day Started!" : "Day Ended!", description: result.message });
            onAttendanceMarked();
            setOpen(false);
        } else {
             toast({ variant: "destructive", title: "Submission Failed", description: result.error });
        }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{type} Verification</DialogTitle>
          <DialogDescription>
            Please capture a selfie and confirm your location to proceed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            {selfie ? (
                 <div className="relative">
                    <img src={selfie} alt="Selfie" className="rounded-md w-full aspect-video object-cover" />
                    <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => setSelfie(null)}>Retake</Button>
                </div>
            ) : (
                <div className="relative w-full aspect-video rounded-md bg-muted flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover rounded-md" autoPlay muted playsInline></video>
                    {hasCameraPermission === false && (
                         <Alert variant="destructive" className="w-auto">
                            <Camera className="h-4 w-4" />
                            <AlertTitle>Camera Required</AlertTitle>
                            <AlertDescription>Please allow camera access.</AlertDescription>
                        </Alert>
                    )}
                </div>
            )}
            
            <canvas ref={canvasRef} className="hidden"></canvas>
           
            <div className="flex items-center justify-between rounded-md border p-3 bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {coords ? (
                        <span>Lat: {coords.latitude.toFixed(4)}, Lng: {coords.longitude.toFixed(4)}</span>
                    ) : (
                        <span className="text-destructive">{geoError ? "Location access denied." : "Getting location..."}</span>
                    )}
                </div>
                {!selfie && (
                     <Button onClick={captureSelfie} disabled={!hasCameraPermission}>
                        <Camera className="mr-2 h-4 w-4"/> Capture
                    </Button>
                )}
            </div>

        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selfie || !coords || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {isPending ? 'Submitting...' : 'Submit Attendance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
