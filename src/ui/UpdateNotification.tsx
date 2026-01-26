import { useEffect } from 'react';
import { toast } from 'sonner';

export function UpdateNotification() {
    useEffect(() => {
        const unsubChecking = window.electron.onCheckingForUpdate(() => {
            // Optional: toast.info("Checking for updates...");
        });

        const unsubAvailable = window.electron.onUpdateAvailable(() => {
            toast.info("Update available!", {
                description: "A new version of IronFocus is available.",
                action: {
                    label: "Download",
                    onClick: () => window.electron.startDownload(),
                },
                duration: Infinity,
            });
        });

        const unsubNotAvailable = window.electron.onUpdateNotAvailable(() => {
            toast.success("You are up to date!");
        });

        const unsubProgress = window.electron.onDownloadProgress(() => {
            toast.info("Downloading update...");
        });

        const unsubDownloaded = window.electron.onUpdateDownloaded(() => {
            toast.success("Update downloaded!", {
                description: "Restart to apply changes.",
                action: {
                    label: "Restart",
                    onClick: () => window.electron.installUpdate(),
                },
                duration: Infinity, // Keep open until clicked
            });
        });

        const unsubError = window.electron.onUpdateError((err) => {
            toast.error("Update failed", {
                description: err || "Unknown error",
            });
        });

        return () => {
            unsubChecking();
            unsubAvailable();
            unsubNotAvailable();
            unsubProgress();
            unsubDownloaded();
            unsubError();
        };
    }, []);

    // This component is now headless (UI handled by Toaster)
    return null;
}
