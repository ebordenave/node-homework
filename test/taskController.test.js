require("dotenv").config();
const EventEmitter = require("node:events");

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");

const {
  index,
  show,
  create,
  update,
  deleteTask,
} = require("../controllers/taskController");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const { Prisma } = require("@prisma/client");
const expectCookies = require("supertest/lib/cookies");

// A few useful globals
let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;
let saveTaskId = null;

beforeAll(async () => {
  //! Clear the database before running the tests.
  await prisma.Task.deleteMany();
  await prisma.User.deleteMany();

  //! Create users that can be used during testing.
  user1 = await prisma.User.create({
    data: {
      name: "Bob",
      email: "bob@sample.com",
      hashedPassword: "nonsense",
    },
  });

  user2 = await prisma.User.create({
    data: {
      name: "Alice",
      email: "alice@sample.com",
      hashedPassword: "nonsense",
    },
  });
});

afterAll(() => {
  //! Disconnect from the database after testing.
  prisma.$disconnect();
});

//! BEFORE:
// The create controller takes req and res, so node-http-mocks simulates those objects.
// This calls the create controller directly with a valid task and expects a 201.

//! Delete this test after running it and seeing the failure.
// describe("testing task creation", () => {
//   it("14. Creates a task", async () => {
//     const req = httpMocks.createRequest({
//       method: "POST",
//       body: {
//         title: "first task",
//       },
//     });

//!     // Simulate the response object and pass the EventEmitter class.
//     saveRes = httpMocks.createResponse({
//       eventEmitter: EventEmitter,
//     });

//     await waitForRouteHandlerCompletion(create, req, saveRes);

//     expect(saveRes.statusCode).toBe(201);
//   });
// });

//! WHY THE FIRST TEST FAILS:
// Task creation is protected by JWT middleware, which sets up req.user.
// Calling the controller directly bypasses that middleware, so req.user is undefined.

//! AFTER:
// Since req.user is missing, this test expects and catches that specific error.
// expect.assertions(1) makes sure the expect inside the catch block actually runs.

// Uncomment this after running and removing the first test.

describe("testing task creation", () => {
  it("14. cant create a task without a user id", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        title: "first task",
      },
    });

    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    // The test must execute exactly one expect() to pass.
    expect.assertions(1);

    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });
  it("15. You can't create a task with a bogus user id.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        title: "first task",
      },
      user: {
        id: 999999,
      },
    });
    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });
    expect.assertions(1);
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    }
  });
  it("16. If you have a valid user id, create() succeeds (res.statusCode should be 201).", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        title: "first task",
      },
      user: {
        id: user1.id,
      },
    });
    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });
    expect.assertions(1);
    await waitForRouteHandlerCompletion(create, req, saveRes);
    expect(saveRes.statusCode).toBe(201);
  });
  it("17. The object returned from the create() call has the expected title.", async () => {
    saveData = saveRes._getJSONData();
    expect(saveData.title).toBe("first task");
  });
  it("18. The object has the right value for isCompleted.", async () => {
    saveData = saveRes._getJSONData();
    expect(saveData.isCompleted).toBe(false);
  });
  it("19. The object does not have any value for userId.", async () => {
    saveData = saveRes._getJSONData();
    saveTaskId = saveData.id;
    expect(saveData.userId).toBeUndefined();
  });
  describe("test getting created tasks", () => {
    it("20. You can't get a list of tasks without a user id.", async () => {
      const req = httpMocks.createRequest({
        method: "GET",
      });

      saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });

      expect.assertions(1);

      try {
        await waitForRouteHandlerCompletion(index, req, saveRes);
      } catch (e) {
        expect(e.name).toBe("TypeError");
      }
    });
    it("21. If you use user1's id on index() the call returns a 200 status.", async () => {
      const req = httpMocks.createRequest({
        method: "GET",
        user: {
          id: user1.id,
        },
      });
      saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
      await waitForRouteHandlerCompletion(index, req, saveRes);
      expect(saveRes.statusCode).toBe(200);
    });
    it("22. The returned object has a tasks array of length 1.", async () => {
      saveData = saveRes._getJSONData(); // reusing saveRes

      expect(saveData.tasks.length).toBe(1); //! fails right here
    });
    it("23. The title in the first array object is as expected.", () => {
      saveData = saveRes._getJSONData();

      expect(saveData.tasks[0].title).toBe("first task");
    });
    it("24. The first array object does not contain a userId.", () => {
      saveData = saveRes._getJSONData();
      // console.log(saveData.tasks[0].User);
      expect(saveData.tasks[0].User.id).toBeUndefined();
    });
    it("25. If you get the list of tasks using the userId from user2, you get a 404.", async () => {
      const req = httpMocks.createRequest({
        method: "GET",
        user: {
          id: user2.id,
        },
      });
      const res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
      });
      await waitForRouteHandlerCompletion(index, req, res);
      expect(res.statusCode).toBe(404);
    });
    it("26. You can retrieve the created task using show().", async () => {
      const req = httpMocks.createRequest({
        method: "GET",
        params: {
          id: saveTaskId.toString(),
        },
        user: {
          id: user1.id,
        },
      });

      const res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
      });

      await waitForRouteHandlerCompletion(show, req, res);

      expect(res.statusCode).toBe(200);
    });
    it("27. User2 can't retrieve this task entry. You should get a 404.", async () => {
      const req = httpMocks.createRequest({
        method: "GET",
        params: {
          id: saveTaskId.toString(),
        },
        user: {
          id: user2.id,
        },
      });

      const res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
      });

      await waitForRouteHandlerCompletion(show, req, res);

      expect(res.statusCode).toBe(404);
    });
    it("28. User1 can set the task corresponding to saveTaskId to isCompleted: true", async () => {
      const req = httpMocks.createRequest({
        method: "PATCH",
        user: {
          id: user1.id,
        },
        params: {
          id: saveTaskId.toString(),
        },
        body: {
          isCompleted: true,
        },
      });

      const res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
      });

      await waitForRouteHandlerCompletion(update, req, res);

      expect(res.statusCode).toBe(200);
    });
    it("29. User2 can't do this.", async () => {
      const req = httpMocks.createRequest({
        method: "PATCH",
        user: {
          id: user2.id,
        },
        params: {
          id: saveTaskId.toString(),
        },
        body: {
          isCompleted: true,
        },
      });

      const res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
      });

      await waitForRouteHandlerCompletion(update, req, res);

      expect(res.statusCode).toBe(404);
    });
    it("30. User2 can't delete this task.", async () => {
      const req = httpMocks.createRequest({
        method: "DELETE",
        user: {
          id: user2.id,
        },
        params: {
          id: saveTaskId.toString(),
        },
      });

      const res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
      });

      await waitForRouteHandlerCompletion(deleteTask, req, res);

      expect(res.statusCode).toBe(404);
    });
    it("31. User1 can delete this task.", async () => {
      const req = httpMocks.createRequest({
        method: "DELETE",
        user: {
          id: user1.id,
        },
        params: {
          id: saveTaskId.toString(),
        },
      });

      const res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
      });

      await waitForRouteHandlerCompletion(deleteTask, req, res);

      expect(res.statusCode).toBe(200);
    });
    it("32. Retrieving user1's tasks now returns a 404.", async () => {
      const req = httpMocks.createRequest({
        method: "GET",
        user: {
          id: user1.id,
        },
        params: {
          id: saveTaskId.toString(),
        },
      });

      const res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
      });

      await waitForRouteHandlerCompletion(show, req, res);

      expect(res.statusCode).toBe(404);
    });
  });
});
