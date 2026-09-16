const fs = require('fs');
const path = require('path');

function startFolderWatcher(pipeline) {
  const watchDir = path.join(__dirname, '..', 'data', 'incoming');
  const archiveDir = path.join(__dirname, '..', 'data', 'archive');

  if (!fs.existsSync(watchDir)) fs.mkdirSync(watchDir, { recursive: true });
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

  const processingFiles = new Set();

  async function handleFile(filePath) {
    const filename = path.basename(filePath);
    if (!filename.endsWith('.json') || processingFiles.has(filename)) return;

    processingFiles.add(filename);
    console.log(`⚡ [Watcher] New order file detected: ${filename}`);

    try {
      // Small timeout to ensure file is completely written
      await new Promise(r => setTimeout(r, 200));

      if (!fs.existsSync(filePath)) {
        processingFiles.delete(filename);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const orderData = JSON.parse(content);
      orderData.channel = orderData.channel || 'file-drop-watcher';

      await pipeline.processOrder(orderData);

      // Move to archive
      const targetArchive = path.join(archiveDir, `${Date.now()}_${filename}`);
      fs.renameSync(filePath, targetArchive);
      console.log(`📦 [Watcher] Archived processed order to: ${path.basename(targetArchive)}`);
    } catch (err) {
      console.error(`❌ [Watcher] Error processing file ${filename}:`, err.message);
    } finally {
      processingFiles.delete(filename);
    }
  }

  // Periodic poll check every 800ms
  setInterval(() => {
    try {
      const files = fs.readdirSync(watchDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          handleFile(path.join(watchDir, file));
        }
      }
    } catch (e) {}
  }, 800);

  // Native OS file watcher
  try {
    fs.watch(watchDir, (eventType, filename) => {
      if (filename && filename.endsWith('.json')) {
        handleFile(path.join(watchDir, filename));
      }
    });
  } catch (e) {}

  console.log(`👀 [Watcher] Automation folder watcher active on: ${watchDir}`);
}

module.exports = { startFolderWatcher };

