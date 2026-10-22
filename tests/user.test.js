jest.mock("../models/user", () => {
  return jest.fn().mockImplementation(function (name, email, password) {
    this.name = name;
    this.email = email;
    this.password = password;
    this.register = jest.fn().mockResolvedValue([{ insertId: 1 }]);
  });
});
// Static method used by addlogin — attach it to the mocked constructor.
const userModel = require("../models/user");
userModel.checkPass = jest.fn();

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn(),
}));

const bcrypt = require("bcrypt");
const userController = require("../controllers/user");

function mockRes() {
  return { render: jest.fn(), redirect: jest.fn() };
}

describe("addregister — validation", () => {
  beforeEach(() => jest.clearAllMocks());

  test("rejects missing fields with an error message, not a crash", async () => {
    const req = { body: { name: "", email: "", password: "" } };
    const res = mockRes();

    await userController.addregister(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "register",
      expect.objectContaining({ error: expect.any(String) }),
    );
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test("rejects a password shorter than 8 characters", async () => {
    const req = {
      body: { name: "Sri", email: "sri@example.com", password: "short" },
    };
    const res = mockRes();

    await userController.addregister(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "register",
      expect.objectContaining({
        error: expect.stringContaining("8 characters"),
      }),
    );
  });

  test("redirects to /login on successful registration", async () => {
    const req = {
      body: {
        name: "Sri",
        email: "sri@example.com",
        password: "goodpassword123",
      },
    };
    const res = mockRes();

    await userController.addregister(req, res, jest.fn());

    expect(res.redirect).toHaveBeenCalledWith("/login");
  });

  test("shows a friendly message on duplicate email instead of crashing", async () => {
    const req = {
      body: {
        name: "Sri",
        email: "sri@example.com",
        password: "goodpassword123",
      },
    };
    const res = mockRes();
    const next = jest.fn();

    // Force the mocked .register() to reject like a real MySQL unique-key violation
    userModel.mockImplementationOnce(function () {
      this.register = jest.fn().mockRejectedValue({ code: "ER_DUP_ENTRY" });
    });

    await userController.addregister(req, res, next);

    expect(res.render).toHaveBeenCalledWith(
      "register",
      expect.objectContaining({
        error: expect.stringContaining("already exists"),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe("addlogin — validation", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shows an error when the email doesn't exist", async () => {
    userModel.checkPass.mockResolvedValue([[]]);

    const req = { body: { email: "nobody@example.com", password: "x" } };
    const res = mockRes();

    await userController.addlogin(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "login",
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  test("shows an error on wrong password", async () => {
    userModel.checkPass.mockResolvedValue([
      [{ id: 1, password: "hashed-password" }],
    ]);
    bcrypt.compare.mockResolvedValue(false);

    const req = { body: { email: "sri@example.com", password: "wrong" } };
    const res = mockRes();

    await userController.addlogin(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "login",
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  test("logs in and sets the session on correct credentials", async () => {
    userModel.checkPass.mockResolvedValue([
      [{ id: 1, password: "hashed-password" }],
    ]);
    bcrypt.compare.mockResolvedValue(true);

    const req = {
      body: { email: "sri@example.com", password: "correct" },
      session: {},
    };
    const res = mockRes();

    await userController.addlogin(req, res, jest.fn());

    expect(req.session.isLoggedIn).toBe(true);
    expect(req.session.userId).toBe(1);
    expect(res.redirect).toHaveBeenCalledWith("/transactions");
  });
});
