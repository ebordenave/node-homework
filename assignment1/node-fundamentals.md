# Node.js Fundamentals

## What is Node.js?

Node.js is a runtime environment that allows JavaScript to run outside of the browser. It uses Google's V8 engine. It is an event-driven runtime designed to build scalable network applications.

## How does Node.js differ from running JavaScript in the browser?

JavaScript in the browser uses the DOM (Document Object Model), browser APIs, and pages. Node.js, however, works with files, processes, servers, and backend APIs.

## What is the V8 engine, and how does Node use it?

The V8 engine is a technology developed by Google and is the underlying technology used in the Chrome browser. It is written in C++, is performant, and implements ECMAScript and WebAssembly.

## What are some key use cases for Node.js?

A use case of using Node is when you are using a database and you need to interact with the data within that database, typically through backend APIs. Node.js allows us to use JavaScript anywhere outside of the browser and on a machine/server.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

ES Modules and CommonJS modules use different syntax. For import/export in React, for example, importing a "hook" such as useState would look like this:

**ES Modules (supported in modern Node.js):**

```js
import { x } from "module";
```

where x would be `useState` and `module` would be `react`.

Whereas in CommonJS, you would use the `require` syntax for import/export processes, for example:

**CommonJS (default in Node.js):**

```js
const { x } = require("module");
```
