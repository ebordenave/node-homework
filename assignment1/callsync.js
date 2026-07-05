function syncfunc() {
  console.log("3. In syncfunc.  No async operations here."); // Log: #3
  return "7. Returned from syncfunc."; // Log: #7
}

async function asyncCaller() {
  console.log("2. About to wait."); // Log: #2
  const res = await syncfunc();
  console.log(res);
  return "9. asyncCaller complete."; // Log: #9
}

console.log("1. Calling asyncCaller."); // Log: #1
const r = asyncCaller();
console.log(`4. Got back a value from asyncCaller of type ${typeof r}`); // Log: #4
if (typeof r == "object") {
  console.log(`5. That object is of class ${r.constructor.name}`); // Log: #5
}
r.then((resolvesTo) => {
  console.log("8. The promise resolves to: ", resolvesTo); // Log: #8
});
console.log("6. Finished."); // Log: #6
