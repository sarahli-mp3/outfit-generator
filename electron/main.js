import { app, BrowserWindow, session, ipcMain } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

let win = null;

// Supabase admin client for privileged operations
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('Missing Supabase environment variables');
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, key);
}

// Handle file upload to Supabase Storage
ipcMain.handle(
  "upload-clothing-item",
  async (event, { fileData, fileName, category }) => {
    try {
      console.log(`Upload request: ${fileName} to ${category}`);

      const sb = supabaseAdmin();
      
      // Convert data URL to base64
      const base64 = fileData.split(",")[1];
      const buffer = Buffer.from(base64, "base64");
      
      // Create storage path
      const path = `${category}/${Date.now()}_${fileName}`;
      
      // Upload to Supabase Storage
      const { error } = await sb.storage.from("wardrobe").upload(path, buffer, {
        contentType: "image/png",
        upsert: true,
      });
      
      if (error) {
        console.error("Supabase upload error:", error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data } = sb.storage.from("wardrobe").getPublicUrl(path);
      console.log(`Upload successful: ${data.publicUrl}`);
      
      return { success: true, path: data.publicUrl };
    } catch (error) {
      console.error("File upload error:", error);
      return { success: false, error: error.message };
    }
  }
);

// Handle saving generated outfit to Supabase
ipcMain.handle(
  "save-generated-outfit",
  async (event, { topId, bottomId, generatedImageData }) => {
    try {
      console.log(`Saving generated outfit: ${topId} + ${bottomId}`);

      const sb = supabaseAdmin();
      
      // Convert data URL to base64
      const base64 = generatedImageData.split(",")[1];
      const buffer = Buffer.from(base64, "base64");
      
      // Create storage path for generated outfit
      const path = `generated/${topId}_${bottomId}_${Date.now()}.png`;
      
      // Upload to Supabase Storage
      const { error } = await sb.storage.from("wardrobe").upload(path, buffer, {
        contentType: "image/png",
        upsert: true,
      });
      
      if (error) {
        console.error("Supabase upload error:", error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data } = sb.storage.from("wardrobe").getPublicUrl(path);
      
      // Save to database
      const { error: dbError } = await sb
        .from("generated_outfits")
        .upsert({
          top_id: topId,
          bottom_id: bottomId,
          generated_image_url: data.publicUrl
        });

      if (dbError) {
        console.error("Database save error:", dbError);
        return { success: false, error: dbError.message };
      }
      
      console.log(`Generated outfit saved: ${data.publicUrl}`);
      return { success: true, path: data.publicUrl };
    } catch (error) {
      console.error("Save generated outfit error:", error);
      return { success: false, error: error.message };
    }
  }
);

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(__dirname, "../dist/index.html"));
  }

  // Clear cache and storage data on startup (commented out for now)
  // session.defaultSession.clearStorageData({
  //   storages: ["cache", "cookies", "filesystem", "indexdb", "localstorage", "shadercache", "websql", "serviceworkers", "codecache"]
  // });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
