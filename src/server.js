// import file
import express from "express";
import chalk from "chalk";
import fsPromises from "node:fs/promises"; // Use fs/promises for async file operations

import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = 8000;
//work with __directory in ES module
const __filename = fileURLToPath(import.meta.url);
console.log(`__filename: ${__filename}`);
const __dirname = path.dirname(__filename);
console.log(`__dirname: ${__dirname}`);

//serve the main route
app.get("/", (req, res) => {
  res.send("Welcome to the node-media-streamer");
});

//server the video stream
app.get("/video-stream", async (req, res) => {
  try {
    // 1. Define the video file path
    const videoPath = path.join(__dirname, "../public/video.mp4");
    console.log(`Video Path: ${videoPath}`);
    // 2.Get file statistics like size
    const videoStats = await fsPromises.stat(videoPath);
    console.log(`Video Stats: ${videoStats}`);
    // 3.Total size of the video file : 17.7 MB (1,85,97,074 bytes)
    const fileSize = videoStats.size;
    console.log(`File Size: ${fileSize}`);
    // 4. Get the "Range" header from the request (for partial content)
    const range = req.headers.range;
    console.log(`Range: ${range}`);

    if (range) {
      console.log("range hai");
      //handle range request
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      if (start >= fileSize || end >= fileSize || start > end) {
        res.writeHead(416, {
          "Content-Range": `bytes */${fileSize}`,
        });
        return res.end();
      }

      const contentLength = end - start + 1;
      
      const videoHandling = await fsPromises.open(videoPath, "r");
      const videoStream = await videoHandling.createReadStream({start,end});
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
      });
      videoStream.pipe(res);
    } else {
      console.log("No Range requested, sending entire file");
      // 11. If no range is requested, send the entire video file
      res.writeHead(200, {
        "Content-Length": fileSize, //Total size of the video
        "Content-Type": "video/mp4", //Content type
      });

      const videoHandling = await fsPromises.open(videoPath, "r");
      const videoStream = await videoHandling.createReadStream();
      videoStream.pipe(res);
    }
  } catch (err) {
    console.error("Error serving video:", err);
    res.status(500).send("Error serving video");
  }
});

// Serve the audio stream
app.get("/audio-stream", async (req, res) => {
    console.log(`Req: ${chalk.green(req)} | Res: ${chalk.blue(res)}`);
    const audioPath = path.join(__dirname, "../public/audio.mp3");
    const audioStats = await fsPromises.stat(audioPath);
    const audioSize = audioStats.size;
    const range = req.headers.range;
  
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : audioSize - 1;
  
      if (start >= audioSize || end >= audioSize || start > end) {
        res.writeHead(416, { "Content-Range": `bytes */${audioSize}` });
        return res.end();
      }
  
      const contentLength = end - start + 1;
      const audioHandle = await fsPromises.open(audioPath, "r");
      const audioStream = audioHandle.createReadStream({ start, end });
  
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${audioSize}`,
        "Content-Length": contentLength,
        "Content-Type": "audio/mpeg",
      });
  
      // Debug: Track progress of audio stream
      let bytesSent = 0;
      audioStream.on("data", (chunk) => {
        bytesSent += chunk.length;
        console.log(
          `Sending audio chunk: start=${start}, end=${end}, chunkSize=${chunk.length}, totalBytesSent=${bytesSent}`
        );
      });
  
      audioStream.on("end", () => {
        console.log("Audio stream ended");
      });
  
      audioStream.on("error", (error) => {
        console.error("Error in audio stream:", error);
      });
  
      audioStream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": audioSize,
        "Content-Type": "audio/mp3",
      });
  
      const audioHandle = await fsPromises.open(audioPath, "r");
      const audioStream = audioHandle.createReadStream();
  
      let bytesSent = 0;
      audioStream.on("data", (chunk) => {
        bytesSent += chunk.length;
        console.log(
          `Sending full audio chunk: chunkSize=${chunk.length}, totalBytesSent=${bytesSent}`
        );
      });
  
      audioStream.on("end", () => {
        console.log("Full audio stream ended");
      });
  
      audioStream.on("error", (error) => {
        console.error("Error in full audio stream:", error);
      });
  
      audioStream.pipe(res);
    }
  });
  
app.listen(port, () => {
  console.log(`${chalk.green(`Server run at http://localhost:${port}`)}`);
});
