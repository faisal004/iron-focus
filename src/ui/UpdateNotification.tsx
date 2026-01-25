import { useEffect, useState } from 'react';

export function UpdateNotification() {
    const [showNotification, setShowNotification] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [updateReady, setUpdateReady] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        console.log("UpdateNotification: Setting up IPC listeners");

        const unsubChecking = window.electron.onCheckingForUpdate(() => {
            console.log("UpdateNotification: Received checking-for-update");
            setStatusMsg("Checking for updates...");
            setShowNotification(true);
            setHasError(false);
        });

        const unsubAvailable = window.electron.onUpdateAvailable(() => {
            console.log("UpdateNotification: Received update-available");
            setStatusMsg("Update available!");
            setShowNotification(true);
            setUpdateAvailable(true);
            setHasError(false);
        });

        const unsubNotAvailable = window.electron.onUpdateNotAvailable(() => {
            console.log("UpdateNotification: Received update-not-available");
            setStatusMsg("You're on the latest version.");
            setShowNotification(true);
            setUpdateAvailable(false);
        });

        const unsubProgress = window.electron.onDownloadProgress((progress) => {
            console.log("UpdateNotification: Received download-progress", progress);
            const msg = `Downloading: ${progress.percent.toFixed(1)}% (${(progress.transferred / 1024 / 1024).toFixed(1)}MB / ${(progress.total / 1024 / 1024).toFixed(1)}MB)`;
            setStatusMsg(msg);
            setDownloadProgress(progress.percent);
            setShowNotification(true);
        });

        const unsubDownloaded = window.electron.onUpdateDownloaded(() => {
            console.log("UpdateNotification: Received update-downloaded");
            setStatusMsg("Update downloaded. Ready to install.");
            setDownloadProgress(null);
            setUpdateReady(true);
            setUpdateAvailable(false);
            setShowNotification(true);
        });

        const unsubError = window.electron.onUpdateError((err) => {
            console.log("UpdateNotification: Received update-error", err);
            setStatusMsg(`Error: ${err}`);
            setShowNotification(true);
            setHasError(true);
            setUpdateAvailable(false);
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

    const handleDownload = () => {
        window.electron.startDownload();
    };

    const handleInstall = () => {
        window.electron.installUpdate();
    };




    return (
        <div style={{
            margin: '20px',
            backgroundColor: '#333',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            maxWidth: '600px',
            alignSelf: 'center'
        }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', wordBreak: 'break-word' }}>
                {statusMsg || "Ready to check for updates..."}
            </div>

            {downloadProgress !== null && (
                <div style={{ width: '100%', backgroundColor: '#555', borderRadius: '4px', height: '8px' }}>
                    <div style={{
                        width: `${downloadProgress}%`,
                        backgroundColor: '#007bff',
                        height: '100%',
                        borderRadius: '4px',
                        transition: 'width 0.2s'
                    }} />
                </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {updateAvailable && (
                    <button onClick={handleDownload} style={buttonStyle}>
                        Download
                    </button>
                )}

                {updateReady && (
                    <button onClick={handleInstall} style={buttonStyle}>
                        Install & Restart
                    </button>
                )}
            </div>

            {hasError && (
                <div style={{ fontSize: '12px', color: '#ff6b6b', marginTop: '5px' }}>
                    If you installed an older version (v0.0.5 or earlier), please manually download the latest version from GitHub.
                </div>
            )}
        </div>
    );
}

const buttonStyle = {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
};
