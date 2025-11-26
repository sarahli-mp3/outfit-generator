const { contextBridge, ipcRenderer } = require("electron");

if (process.env.NODE_ENV !== "production") {
  console.log("Preload script loaded");
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  uploadClothingItem: (fileData, fileName, category) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("uploadClothingItem called from renderer");
    }
    return ipcRenderer.invoke("upload-clothing-item", {
      fileData,
      fileName,
      category,
    });
  },
  saveGeneratedOutfit: (topId, bottomId, generatedImageData) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("saveGeneratedOutfit called from renderer");
    }
    return ipcRenderer.invoke("save-generated-outfit", {
      topId,
      bottomId,
      generatedImageData,
    });
  },
  platform: process.platform,
  versions: process.versions,
});

if (process.env.NODE_ENV !== "production") {
  console.log("electronAPI exposed to window");
}
