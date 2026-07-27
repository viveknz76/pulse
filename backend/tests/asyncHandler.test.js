const assert = require("node:assert/strict");
const test = require("node:test");
const { Prisma } = require("@prisma/client");
const { asyncHandler } = require("../dist/middleware/asyncHandler");
const { errorHandler, notFoundHandler } = require("../dist/middleware/errorHandler");

function mockResponse() {
  return {
    headersSent: false,
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("asyncHandler forwards a rejected route promise to next", async () => {
  const expected = new Error("database unavailable");
  const wrapped = asyncHandler(async () => {
    throw expected;
  });

  const received = await new Promise((resolve) => {
    wrapped({}, mockResponse(), resolve);
  });

  assert.equal(received, expected);
});

test("errorHandler returns a generic 500 response for unexpected failures", () => {
  const res = mockResponse();
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    errorHandler(new Error("sensitive database detail"), {}, res, () => {});
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "Internal server error" });
});

test("notFoundHandler returns a controlled 404 response", () => {
  const res = mockResponse();
  notFoundHandler({ method: "GET", path: "/missing" }, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: "Route not found: GET /missing" });
});

test("errorHandler maps known Prisma failures to controlled responses", () => {
  const cases = [
    ["P2002", 409],
    ["P2003", 409],
    ["P2025", 404],
  ];

  for (const [code, expectedStatus] of cases) {
    const res = mockResponse();
    const err = new Prisma.PrismaClientKnownRequestError("database failure", {
      code,
      clientVersion: "5.22.0",
    });

    errorHandler(err, {}, res, () => {});
    assert.equal(res.statusCode, expectedStatus);
    assert.equal(typeof res.body.error, "string");
  }
});
