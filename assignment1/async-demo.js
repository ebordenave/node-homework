const fs = require("fs"); // File system operations
const path = require("path"); // File and directory paths
const filePath = path.join(__dirname, "sample-files", "sample.txt");

//! Write a sample file for demonstration
fs.writeFileSync(filePath, "Hello, async world!");

//! Callback hell example (test and leave it in comments): (high-level)
// fs.writeFile(filePath, "Hello, async world!", (err) => {
//   if (err) {
//     console.log(err.message);
//   } else {
//     fs.readFileCallbackStyle(filePath, "utf8", (err, data) => {
//       if (err) {
//         console.log(err.message);
//       } else {
//         console.log(data);
//       }
//     });
//   }
// });

//! Reads a file asynchronously using the callback-based API
// 1. Callback style
fs.readFileCallbackStyle(filePath, "utf8", (err, content) => {
  if (err) {
    console.log("File read failed: ", err);
    return;
  }
  console.log("Callback read: " + content);
});

// 2. Promise style
function readTextFilePromiseStyle(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFileCallbackStyle(filePath, "utf8", (err, content) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(content);
    });
  });
}

// Convert the callback API into a Promise-based function
readTextFilePromiseStyle(filePath)
  // Consume the Promise with .then()/.catch()
  .then((content) => {
    console.log("Promise read: " + content);
  })
  .catch((err) => {
    console.log(err.message);
  });

// 3. Async/Await style
async function run() {
  try {
    const content = await readTextFilePromiseStyle(filePath);
    console.log("Async/Await read: " + content);
  } catch (err) {
    console.log("An error occurred:", err.message);
  }
}

run();
