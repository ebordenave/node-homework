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
//     fs.readFile(filePath, "utf8", (err, data) => {
//       if (err) {
//         console.log(err.message);
//       } else {
//         console.log(data);
//       }
//     });
//   }
// });

//! Reads a file asynchronously using fs.readFile
// 1. Callback style
fs.readFile(filePath, "utf8", (err, content) => {
  if (err) {
    console.log("File read failed: ", err);
    return;
  }
  console.log("Callback read: " + content);
});

// 2. Promise style
function readTextFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, content) => {
      if (err) {
        reject(err);
        return;
      }

      // otherwise
      resolve(content);
    });
  });
}

// Converts the callback code to use Promises, then async/await
readTextFile(filePath)
  .then((content) => {
    console.log("Promise read: " + content);
  })
  .catch((err) => {
    console.log(err.message);
  });

// 3. Async/Await style
async function run() {
  try {
    const content = await readTextFile(filePath);
    console.log("Async/Await read: " + content);
  } catch (err) {
    console.log("An error occurred:", err.message);
  }
}

run();
// Callback read: Hello, async world!
// Promise read: Hello, async world!
// Async/Await read: Hello, async world!
