// Mock the model layer so these are true unit tests — no real database
// connection is needed or made. We control exactly what each DB call
// returns so we can exercise every branch of the controller logic.

jest.mock("../models/transaction", () => {
  return class MockTransaction {
    constructor(title, amount, type, category, date, user_id) {
      this.title = title;
      this.amount = amount;
      this.type = type;
      this.category = category;
      this.date = date;
      this.user_id = user_id;
    }
    save() {
      return Promise.resolve([{ insertId: 1 }]);
    }

    static findplan_id = jest.fn();
    static checkInExpense = jest.fn();
    static fetchbyid = jest.fn();
    static updateById = jest.fn();
    static delete = jest.fn();
    static fetchAll = jest.fn();
    static getExpenseByCategory = jest.fn();
    static getincomeByCategory = jest.fn();
    static getSummary = jest.fn();
  };
});

jest.mock("../models/user", () => ({
  username: jest.fn(),
}));

const Transaction = require("../models/transaction");
const transactionController = require("../controllers/transaction");

// Helper: builds a fake Express res object with jest.fn() spies so we
// can assert what the controller tried to send back.
function mockRes() {
  return {
    render: jest.fn(),
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
}

function mockReq(body = {}, sessionUserId = 1) {
  return {
    body,
    session: { userId: sessionUserId },
  };
}

describe("postransactions — input validation", () => {
  beforeEach(() => jest.clearAllMocks());

  test("rejects a negative amount", async () => {
    const req = mockReq({
      title: "Rent",
      amount: "-500",
      type: "expense",
      category: "Housing",
      date: "2026-09-01",
    });
    const res = mockRes();
    const next = jest.fn();

    await transactionController.postransactions(req, res, next);

    expect(res.render).toHaveBeenCalledWith(
      "addtransactions",
      expect.objectContaining({ warning: expect.any(String) }),
    );
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test("rejects a zero amount", async () => {
    const req = mockReq({
      title: "Rent",
      amount: "0",
      type: "expense",
      category: "Housing",
      date: "2026-09-01",
    });
    const res = mockRes();

    await transactionController.postransactions(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "addtransactions",
      expect.objectContaining({ warning: expect.any(String) }),
    );
  });

  test("rejects a missing title", async () => {
    const req = mockReq({
      title: "   ",
      amount: "500",
      type: "expense",
      category: "Housing",
      date: "2026-09-01",
    });
    const res = mockRes();

    await transactionController.postransactions(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "addtransactions",
      expect.objectContaining({ warning: expect.any(String) }),
    );
  });

  test("rejects an invalid transaction type", async () => {
    const req = mockReq({
      title: "Rent",
      amount: "500",
      type: "savings", // not "income" or "expense"
      category: "Housing",
      date: "2026-09-01",
    });
    const res = mockRes();

    await transactionController.postransactions(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "addtransactions",
      expect.objectContaining({ warning: expect.any(String) }),
    );
  });
});

describe("postransactions — monthly plan check", () => {
  beforeEach(() => jest.clearAllMocks());

  test("warns when the expense category isn't in the monthly plan", async () => {
    Transaction.findplan_id.mockResolvedValue([[{ id: 42 }]]); // a plan exists
    Transaction.checkInExpense.mockResolvedValue([
      [{ existsExpense: 0 }], // ...but this category isn't in it
    ]);

    const req = mockReq({
      title: "Concert tickets",
      amount: "1500",
      type: "expense",
      category: "Entertainment",
      date: "2026-09-01",
      warningShown: "0",
    });
    const res = mockRes();

    await transactionController.postransactions(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "addtransactions",
      expect.objectContaining({
        warning: expect.stringContaining("Entertainment"),
        warningShown: "1",
      }),
    );
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test("does not warn and saves when the category is planned", async () => {
    Transaction.findplan_id.mockResolvedValue([[{ id: 42 }]]);
    Transaction.checkInExpense.mockResolvedValue([[{ existsExpense: 1 }]]);

    const req = mockReq({
      title: "Groceries",
      amount: "1500",
      type: "expense",
      category: "Food",
      date: "2026-09-01",
      warningShown: "0",
    });
    const res = mockRes();

    await transactionController.postransactions(req, res, jest.fn());

    expect(res.redirect).toHaveBeenCalledWith("/transactions");
    expect(res.render).not.toHaveBeenCalled();
  });

  test("does not warn when there is no monthly plan at all", async () => {
    Transaction.findplan_id.mockResolvedValue([[]]); // no plan for this month

    const req = mockReq({
      title: "Taxi",
      amount: "300",
      type: "expense",
      category: "Transport",
      date: "2026-09-01",
      warningShown: "0",
    });
    const res = mockRes();

    await transactionController.postransactions(req, res, jest.fn());

    expect(res.redirect).toHaveBeenCalledWith("/transactions");
  });

  test("skips the plan check once warningShown is '1' (user confirmed)", async () => {
    const req = mockReq({
      title: "Concert tickets",
      amount: "1500",
      type: "expense",
      category: "Entertainment",
      date: "2026-09-01",
      warningShown: "1",
    });
    const res = mockRes();

    await transactionController.postransactions(req, res, jest.fn());

    expect(Transaction.findplan_id).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("/transactions");
  });

  test("income transactions are never checked against the plan", async () => {
    const req = mockReq({
      title: "Salary",
      amount: "50000",
      type: "income",
      category: "Salary",
      date: "2026-09-01",
      warningShown: "0",
    });
    const res = mockRes();

    await transactionController.postransactions(req, res, jest.fn());

    expect(Transaction.findplan_id).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("/transactions");
  });
});

describe("edit / update — ownership checks", () => {
  beforeEach(() => jest.clearAllMocks());

  test("edit returns 404 when the transaction doesn't exist or isn't the user's", async () => {
    Transaction.fetchbyid.mockResolvedValue([[]]); // nothing found

    const req = { params: { id: 999 }, session: { userId: 1 } };
    const res = mockRes();

    await transactionController.edit(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith(
      "error",
      expect.objectContaining({ message: expect.any(String) }),
    );
  });

  test("edit renders trans_edit when the transaction is found", async () => {
    const fakeTrans = { id: 5, title: "Rent", amount: 500, type: "expense", category: "Housing", date: new Date("2026-09-01") };
    Transaction.fetchbyid.mockResolvedValue([[fakeTrans]]);

    const req = { params: { id: 5 }, session: { userId: 1 } };
    const res = mockRes();

    await transactionController.edit(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith("trans_edit", { trans: fakeTrans });
  });
});
