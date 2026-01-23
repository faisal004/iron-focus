import { useEffect, useState } from 'react';

export function UpdateNotification() {
    const [showNotification, setShowNotification] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<'available' | 'downloaded' | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(false);

    useEffect(() => {
        // Listen for update available
        const unsubscribeAvailable = window.electron.onUpdateAvailable(() => {
            setUpdateStatus('available');
            setShowNotification(true);
        });

        // Listen for update downloaded
        const unsubscribeDownloaded = window.electron.onUpdateDownloaded(() => {
            setUpdateStatus('downloaded');
            setDownloadProgress(false);
            setShowNotification(true);
        });

        return () => {
            unsubscribeAvailable();
            unsubscribeDownloaded();
        };
    }, []);

    const handleDownload = () => {
        setDownloadProgress(true);
        window.electron.startDownload();
        setShowNotification(false); // Hide until downloaded? Or show progress? 
        // For now, let's keep it simple: hide or show "Downloading..." state
        // But since we don't have progress events wired to UI yet, let's just Close for now 
        // or keep it open with "Downloading..." text.
        // Let's implement a simple "Downloading..." state if we want better UX, 
        // but the plan didn't strictly specify progress bar.
        // I'll just change text to "Downloading..." and disable button.
    };

    const handleInstall = () => {
        window.electron.installUpdate();
    };

    const handleClose = () => {
        setShowNotification(false);
    };

    if (!showNotification) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#333',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '250px'
        }}>
            <div style={{ fontWeight: 'bold' }}>
                {updateStatus === 'available' && !downloadProgress && "Update details available"}
                {updateStatus === 'available' && downloadProgress && "Downloading update..."}
                {updateStatus === 'downloaded' && "Update ready to install"}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {updateStatus === 'available' && !downloadProgress && (
                    <button onClick={handleDownload} style={buttonStyle}>
                        Download
                    </button>
                )}

                {updateStatus === 'downloaded' && (
                    <button onClick={handleInstall} style={buttonStyle}>
                        Install & Restart
                    </button>
                )}

                <button onClick={handleClose} style={{ ...buttonStyle, backgroundColor: '#666' }}>
                    Close
                </button>
            </div>
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
