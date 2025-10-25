// Frame storage utility for saving frames to local filesystem
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create frames directory in backend/frames
const FRAMES_DIR = path.resolve(__dirname, '../../frames');

// Ensure frames directory exists
async function ensureFramesDirectory() {
  try {
    await fs.access(FRAMES_DIR);
  } catch {
    await fs.mkdir(FRAMES_DIR, { recursive: true });
    console.log('📁 Created frames directory:', FRAMES_DIR);
  }
}

// Save frame to local filesystem
export async function saveFrameToFile(sessionId, frameNumber, base64Data) {
  try {
    await ensureFramesDirectory();
    
    // Create session subdirectory
    const sessionDir = path.join(FRAMES_DIR, sessionId);
    try {
      await fs.access(sessionDir);
    } catch {
      await fs.mkdir(sessionDir, { recursive: true });
    }
    
    // Extract base64 data (remove data:image/jpeg;base64, prefix)
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `frame_${frameNumber}_${timestamp}.jpg`;
    const filepath = path.join(sessionDir, filename);
    
    // Write file
    await fs.writeFile(filepath, buffer);
    
    console.log(`💾 Frame saved: ${filename} (${(buffer.length / 1024).toFixed(2)}KB)`);
    
    // Return relative path for database storage
    return path.relative(FRAMES_DIR, filepath);
    
  } catch (error) {
    console.error('Error saving frame to file:', error.message);
    throw error;
  }
}

// Get frame file path
export function getFramePath(relativePath) {
  return path.join(FRAMES_DIR, relativePath);
}

// Delete old frames (cleanup utility)
export async function deleteOldFrames(daysOld = 7) {
  try {
    const sessions = await fs.readdir(FRAMES_DIR);
    let deletedCount = 0;
    
    for (const session of sessions) {
      const sessionPath = path.join(FRAMES_DIR, session);
      const stats = await fs.stat(sessionPath);
      
      if (stats.isDirectory()) {
        const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        
        if (ageInDays > daysOld) {
          await fs.rm(sessionPath, { recursive: true, force: true });
          deletedCount++;
          console.log(`🗑️  Deleted old session: ${session}`);
        }
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error deleting old frames:', error.message);
    return 0;
  }
}

// Get session statistics
export async function getSessionStats(sessionId) {
  try {
    const sessionDir = path.join(FRAMES_DIR, sessionId);
    const files = await fs.readdir(sessionDir);
    
    let totalSize = 0;
    for (const file of files) {
      const stats = await fs.stat(path.join(sessionDir, file));
      totalSize += stats.size;
    }
    
    return {
      frameCount: files.length,
      totalSize: totalSize,
      averageSize: totalSize / files.length,
      directory: sessionDir
    };
  } catch (error) {
    return null;
  }
}

export default {
  saveFrameToFile,
  getFramePath,
  deleteOldFrames,
  getSessionStats
};
