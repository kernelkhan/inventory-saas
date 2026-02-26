"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface BarcodeScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: any) => void;
}

import { Button } from "@/components/ui/Button";
import { Image as ImageIcon } from "lucide-react";

export default function BarcodeScanner({ onScanSuccess, onScanFailure }: BarcodeScannerProps) {
    const scannerRef = useRef<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const scannerId = "html5-qrcode-reader";
        let isMounted = true;

        const initializeScanner = async () => {
            try {
                const { Html5Qrcode } = await import("html5-qrcode");

                // If component unmounted during import, stop
                if (!isMounted) return;

                // Ensure element exists before init
                if (!document.getElementById(scannerId)) return;

                const html5QrCode = new Html5Qrcode(scannerId);
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        if (isMounted) {
                            onScanSuccess(decodedText);
                            // Optional: Stop scanning immediately on success? 
                            // Usually better to let the parent unmount this component.
                        }
                    },
                    (errorMessage) => {
                        // ignore frame errors
                    }
                );
            } catch (err: any) {
                if (isMounted) {
                    console.error("Scanner start error:", err);
                    setError("Failed to start camera. Please ensure permissions are granted.");
                    if (onScanFailure) onScanFailure(err);
                }
            }
        };

        initializeScanner();

        return () => {
            isMounted = false;
            // Cleanup: Stop the scanner safely
            if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current.clear();
                }).catch((err: any) => {
                    console.warn("Scanner stop warning:", err);
                });
            }
        };
    }, []); // Empty dependency array to mount once

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null); // Clear previous errors

        try {
            const { Html5Qrcode } = await import("html5-qrcode");
            const html5QrCode = new Html5Qrcode("html5-qrcode-reader");

            // Temporary stop camera if running to avoid conflicts
            if (scannerRef.current && scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }

            const decodedText = await html5QrCode.scanFile(file, true);
            onScanSuccess(decodedText);
        } catch (err) {
            console.error("File scan error", err);
            setError("Could not read barcode from image. Try a clearer image.");
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto p-4">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-square shadow-lg border border-white/20">
                <div id="html5-qrcode-reader" className="w-full h-full"></div>

                {/* Overlay UI */}
                <div className="absolute inset-0 border-2 border-white/30 pointer-events-none rounded-lg">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary -mb-1 -mr-1"></div>
                    </div>
                </div>

                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                    <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                        Auto-detecting...
                    </span>
                </div>

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white text-center p-4 animate-in fade-in zoom-in-95">
                        <p className="text-red-400 text-sm mb-4 max-w-[200px]">{error}</p>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setError(null)}
                        >
                            Try Again
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-3 mt-4">
                <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-muted" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                </div>
                <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Upload from Device
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                        onClick={(e) => (e.currentTarget.value = '')}
                    />
                </label>
            </div>
        </div>
    );
}
