require("dotenv").config();
const request = require("supertest");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const prisma = require("../db/prisma");

const httpMocks = require("node-mocks-http");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");

let agent;
let saveRes;
const { app, server } = require("../app");

const { logon } = require("../controllers/userController");

beforeAll(async () => {
  // clear database
  await prisma.Task.deleteMany(); // delete all tasks
  await prisma.User.deleteMany(); // delete all users
  agent = request.agent(app);
});

afterAll(async () => {
  prisma.$disconnect();
  server.close();
});

describe("register a user ", () => {
  let saveRes = null; // we'll declare this out here, so that we can reference it in several tests
  // let saveData;
  let newUser;
  let csrfToken;

  it("46. it creates the user entry", async () => {
    newUser = {
      name: "John Deere",
      email: "jdeere@example.com",
      password: "Pa$$word20",
    };
    saveRes = await agent.post("/user/register").send(newUser);
    expect(saveRes.statusCode).toBe(201);
  });
  it("47. Registration returns an object with the expected name.", () => {
    expect(saveRes.body.user.name).toBe("John Deere");
  });
  it("48. Test that the returned object includes a csrfToken.", () => {
    expect(saveRes.body).toHaveProperty("csrfToken");
  });
  it("49. You can logon as the newly registered user.", async () => {
    saveRes = await agent.post("/user/logon").send(newUser);
    csrfToken = saveRes.body.csrfToken;
    expect(saveRes.statusCode).toBe(200);
  });
  it("50. Verify that you are logged in: /api/tasks should not return a 401", async () => {
    saveRes = await agent.get("/api/tasks");
    expect(saveRes.statusCode).not.toBe(401);
  });
  it("51. Verify that you can log out.", async () => {
    saveRes = await agent.post("/user/logoff").set("X-CSRF-TOKEN", csrfToken);
    expect(saveRes.statusCode).toBe(200);
  });
  it("52. Make sure that you are really logged out: /api/tasks should now return a 401", async () => {
    saveRes = await agent.get("/api/tasks");
    expect(saveRes.statusCode).toBe(401);
  });
});
