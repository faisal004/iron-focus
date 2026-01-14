const electron = require('electron');


electron.contextBridge.exposeInMainWorld("electron", {
    subscribeStatistics: (callback: (statistics: any) => void) => {
        // @ts-ignore
        electron.ipcRenderer.on("statistics", (_, stats) => {
            callback(stats)
        })
        callback({})
    },
    getStaticData: () => electron.ipcRenderer.invoke("getStaticData")
})