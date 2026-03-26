import { createContext, useContext, useState } from "react";
import { FastCaptureModal } from "../components/capture/FastCaptureModal";

type CaptureContextValue = { openCapture: () => void };

const CaptureContext = createContext<CaptureContextValue | null>(null);

export function useCapture() {
  const ctx = useContext(CaptureContext);
  if (!ctx) throw new Error("useCapture must be used within CaptureProvider");
  return ctx;
}

export function CaptureProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <CaptureContext.Provider value={{ openCapture: () => setOpen(true) }}>
      {children}
      <FastCaptureModal open={open} onClose={() => setOpen(false)} onSuccess={() => setOpen(false)} />
    </CaptureContext.Provider>
  );
}
