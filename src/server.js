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
      setInterval(() => {
        console.log("parts:" + parts);
        console.log("end:" + end);
        console.log("start:" + start);
        console.log('contentLength: ' + contentLength);
      },1000);
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

app.listen(port, () => {
  console.log(`${chalk.green(`Server run at http://localhost:${port}`)}`);
});
