const transaction = require("../models/transaction");
const User = require("../models/user");

// Shared helper: checks whether an expense category is covered by the
// user's monthly plan for the given date. Returns a warning string, or null
// if no warning is needed (no plan exists yet, or the category is planned).
async function getUnplannedExpenseWarning(user_id, category, date) {
  const monthForDatabase = date.slice(0, 7) + "-01";

  const planResult = await transaction.findplan_id(user_id, monthForDatabase);

  if (planResult[0].length === 0) {
    return null; // no plan for this month — nothing to warn about
  }

  const plan_id = planResult[0][0].id;
  const expenseCheck = await transaction.checkInExpense(plan_id, category);
  const isPlanned = expenseCheck[0][0].existsExpense;

  if (isPlanned) {
    return null;
  }

  return `⚠️ ${category} is an extra expense and is not part of your monthly plan.`;
}

exports.getTransactions = async (req, res, next) => {
  try {
    const user = await User.username(req.session.userId);
    const Month = req.query.month;
    const trans = await transaction.fetchAll(req.session.userId);

    const expenseCategory = await transaction.getExpenseByCategory(
      req.session.userId,
    );
    const incomeCategory = await transaction.getincomeByCategory(
      req.session.userId,
    );

    const summary = await transaction.getSummary(req.session.userId);

    res.render("transactions", {
      expenseCat: expenseCategory[0],
      incomeCat: incomeCategory[0],
      name: user[0][0].name,
      trans: trans[0],
      summary: summary[0][0],
      month: Month,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAddTransaction = (req, res, next) => {
  res.render("addtransactions", {
    warning: null,
    warningShown: "0",
    formData: {},
  });
};

exports.postransactions = async (req, res, next) => {
  try {
    const title = req.body.title?.trim();
    const amount = Number(req.body.amount);
    const type = req.body.type?.trim();
    const category = req.body.category?.trim();
    const date = req.body.date?.trim();
    const user_id = req.session.userId;

    const warningShown = req.body.warningShown || "0";

    if (!title || !amount || amount <= 0 || !category || !date) {
      return res.render("addtransactions", {
        warning: "Please fill in all fields with a valid amount.",
        warningShown,
        formData: { title, amount: req.body.amount, category, date, type },
      });
    }

    if (type !== "income" && type !== "expense") {
      return res.render("addtransactions", {
        warning: "Please choose a valid transaction type.",
        warningShown,
        formData: { title, amount, category, date, type },
      });
    }

    // Only expenses need to be checked against the monthly plan
    if (type === "expense" && warningShown === "0") {
      const warning = await getUnplannedExpenseWarning(
        user_id,
        category,
        date,
      );

      if (warning) {
        return res.render("addtransactions", {
          warning,
          warningShown: "1",
          formData: { title, amount, category, date, type },
        });
      }
    }

    const newTransaction = new transaction(
      title,
      amount,
      type,
      category,
      date,
      user_id,
    );

    await newTransaction.save();

    res.redirect("/transactions");
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = req.params.id;

    await transaction.delete(id, req.session.userId);

    res.redirect("/transactions");
  } catch (err) {
    next(err);
  }
};

exports.edit = async (req, res, next) => {
  try {
    const id = req.params.id;
    const detail = await transaction.fetchbyid(id, req.session.userId);

    if (!detail[0][0]) {
      return res.status(404).render("error", {
        message: "Transaction not found.",
      });
    }

    res.render("trans_edit", { trans: detail[0][0] });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const oldVal = await transaction.fetchbyid(id, req.session.userId);

    if (!oldVal[0][0]) {
      return res.status(404).render("error", {
        message: "Transaction not found.",
      });
    }

    const title = req.body.title?.trim();
    const amount = Number(req.body.amount);
    const type = req.body.type?.trim();
    const category = req.body.category?.trim();
    const date = req.body.date?.trim();

    if (!title || !amount || amount <= 0 || !category || !date) {
      return res.render("trans_edit", { trans: oldVal[0][0] });
    }
    if (type !== "income" && type !== "expense") {
      return res.render("trans_edit", { trans: oldVal[0][0] });
    }

    // Keep the same monthly-plan check that new transactions get, so
    // editing an expense into an unplanned category isn't silently allowed.
    // confirmUnplanned lets the user resubmit past the warning, same as
    // warningShown does on the add-transaction form.
    const confirmUnplanned = req.body.confirmUnplanned === "1";

    if (type === "expense" && !confirmUnplanned) {
      const warning = await getUnplannedExpenseWarning(
        req.session.userId,
        category,
        date,
      );

      if (warning) {
        return res.render("trans_edit", {
          trans: { ...oldVal[0][0], title, amount, type, category, date },
          warning,
        });
      }
    }

    await transaction.updateById(id, req.body, req.session.userId);

    res.redirect("/transactions");
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
};

exports.month = async (req, res, next) => {
  try {
    const Month = req.query.month;
    const user_id = req.session.userId;

    const val = await transaction.getByMonth(Month, user_id);
    const user = await User.username(req.session.userId);

    const expenseCategory = await transaction.getExpenseByCategorybyMonth(
      req.session.userId,
      Month,
    );
    const incomeCategory = await transaction.getincomeByCategoryByMonth(
      req.session.userId,
      Month,
    );

    const summary = await transaction.getSummaryByMonth(
      req.session.userId,
      Month,
    );

    res.render("transactions", {
      expenseCat: expenseCategory[0],
      incomeCat: incomeCategory[0],
      name: user[0][0].name,
      trans: val[0],
      summary: summary[0][0],
      month: Month,
    });
  } catch (err) {
    next(err);
  }
};

exports.postMonthlyPlan = async (req, res, next) => {
  try {
    const user = req.session.userId;

    const month = req.body.month + "-01";
    const savings_goal = Number(req.body.savings_goal) || 0;

    const result = await transaction.createOrUpdateMonthlyPlan(
      user,
      month,
      savings_goal,
    );

    const plan_id = result[0].insertId;

    const categories = Array.isArray(req.body.category)
      ? req.body.category
      : [req.body.category];

    const amounts = Array.isArray(req.body.amount)
      ? req.body.amount
      : [req.body.amount];

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i]?.trim();
      const amount = Number(amounts[i]);

      // Skip incomplete rows (e.g. an empty category/amount from the client-side "Add Expense" button)
      if (!category || !amount || amount <= 0) {
        continue;
      }

      await transaction.addPlannedExpense(plan_id, category, amount);
    }

    res.redirect(`/monthly-plan?month=${req.body.month}`);
  } catch (error) {
    next(error);
  }
};

exports.getMonthlyPlan = async (req, res, next) => {
  try {
    const user = req.session.userId;

    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const monthForDatabase = month + "-01";

    const val = await transaction.Getmonthlyplan(user, monthForDatabase);

    if (val[0].length === 0) {
      return res.render("monthly-plan", {
        values: null,
        expenses: [],
        selectedMonth: month,
        MontlyMandatoryExpens: 0,
      });
    }

    const plan = val[0][0];

    const expenseResult = await transaction.GetPlannedExpenses(plan.id);
    const expenses = expenseResult[0];

    const result = await transaction.getTotalPlannedExpenses(plan.id);
    const totalMandatoryExpense = result[0][0].totalMandatoryExpense || 0;

    const TotalIncome = await transaction.getTotalIncomeOfMonth(user, month);
    const totalIncome = Number(TotalIncome[0][0].TotalMonthlyIncome) || 0;

    const savingsGoal = Number(plan.savings_goal) || 0;

    const AvailableMoney =
      totalIncome - Number(totalMandatoryExpense) - savingsGoal;

    res.render("monthly-plan", {
      values: plan,
      expenses: expenses,
      selectedMonth: month,
      MontlyMandatoryExpens: totalMandatoryExpense,
      availablemoney: AvailableMoney,
      saving: savingsGoal,
      income: totalIncome,
    });
  } catch (error) {
    next(error);
  }
};
