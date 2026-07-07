const os = require("os");
const path = require("path");
const fs = require("fs");

const sampleFilesDir = path.join(__dirname, "sample-files");
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log(`Platform: ${os.platform()}`);
console.log(`CPU: ${os.arch()}`);

const totalMemGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
console.log(`Total Memory: ${totalMemGB}GB`);

// Path module
const filePath = path.join(__dirname, "sample-files", "demo.txt");
console.log(`Joined path:${filePath}`);

// fs.promises API
const fsPromises = require("fs/promises");
const fileContent = "fs.promises read: Hello from fs.promises!";

async function run() {
  await fsPromises.writeFile(filePath, fileContent);
  const result = await fsPromises.readFile(filePath, "utf8");
  console.log(result);
  return result;
}
run();

// Streams for large files- log first 40 chars of each chunk

function write(filePath, content) {
  return new Promise((resolve, reject) => {
    const writableStream = fs.createWriteStream(filePath);

    writableStream.on("error", (err) => {
      reject(err);
      console.log(
        `An error occured while writing to the file. Error: ${err.message}`,
      );
    });

    writableStream.on("finish", () => {
      console.log("Successfully wrote line");
      resolve();
    });

    for (let i = 0; i < 100; i++) {
      writableStream.write(content);
    }
    writableStream.end();
  });
}

const largeFilePath = path.join(__dirname, "sample-files", "largefile.txt");
const largeFileContent = "This is a line in a large file...\n";

function readStream(filePath) {
  const stream = fs.createReadStream(filePath, {
    encoding: "utf8",
    highWaterMark: 1024,
  });

  stream.on("data", (chunk) => {
    console.log("Read chunk: ", chunk.slice(0, 40));
  });

  stream.on("end", () => {
    console.log("Finished reading large file with streams");
  });

  stream.on("error", (err) => {
    console.log("Error reading file:", err.message);
  });
}

async function runAdvanced() {
  try {
    await write(largeFilePath, largeFileContent);
    readStream(largeFilePath);
  } catch (error) {
    console.log(error.message);
  }
}

runAdvanced();
