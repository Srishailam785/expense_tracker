const db = require("./database");

module.exports = class Transaction {
  constructor(title, amount, type, category, date, user_id) {
    this.title = title;
    this.amount = amount;
    this.type = type;
    this.category = category;
    this.date = date;
    this.user_id = user_id;
  }

  save() {
    return db.execute(
      "INSERT INTO transactions(title, amount, type, category, date,user_id) VALUES (?, ?, ?, ?, ?,?)",
      [
        this.title,
        this.amount,
        this.type,
        this.category,
        this.date,
        this.user_id,
      ],
    );
  }

  static fetchAll = (user_id) => {
    return db.execute("SELECT * FROM transactions where user_id=?", [user_id]);
  };

  static delete = (id, user_id) => {
    return db.execute("delete from transactions where id=? and user_id=?", [
      id,
      user_id,
    ]);
  };

  static fetchbyid = (id, user_id) => {
    return db.execute("select * from transactions where id=? and user_id=?", [
      id,
      user_id,
    ]);
  };

  static updateById = (id, body, user_id) => {
    return db.execute(
      "UPDATE transactions SET title=?, amount=?, type=?, category=?, date=? WHERE id=? and user_id=?",
      [
        body.title,
        body.amount,
        body.type,
        body.category,
        body.date,
        id,
        user_id,
      ],
    );
  };

  static getSummary = (user_id) => {
    return db.execute(
      `SELECT
       SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
       SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpense,
       COUNT(id) AS totalTransactions
     FROM transactions
     WHERE user_id = ?`,
      [user_id],
    );
  };

  static getExpenseByCategory = (user_id) => {
    return db.execute(
      `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ? AND type = 'expense'
     GROUP BY category`,
      [user_id],
    );
  };

  static getincomeByCategory = (user_id) => {
    return db.execute(
      "select category,sum(amount)as total from transactions where user_id = ? and type='income' group by category",
      [user_id],
    );
  };

  static getByMonth = (month, user_id) => {
    return db.execute(
      `SELECT * FROM transactions
     WHERE user_id = ?
     AND DATE_FORMAT(date, '%Y-%m') = ?`,
      [user_id, month],
    );
  };

  static getExpenseByCategorybyMonth = (user_id, month) => {
    return db.execute(
      `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = ? AND type = 'expense' 
     GROUP BY category`,
      [user_id, month],
    );
  };
  static getincomeByCategoryByMonth = (user_id, month) => {
    return db.execute(
      "select category,sum(amount)as total from transactions where user_id = ? and DATE_FORMAT(date, '%Y-%m') = ? and type='income' group by category",
      [user_id, month],
    );
  };

  static getSummaryByMonth = (user_id, month) => {
    return db.execute(
      `SELECT
       SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
       SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpense,
       COUNT(id) AS totalTransactions
     FROM transactions
     WHERE user_id = ? and  DATE_FORMAT(date, '%Y-%m') = ? `,
      [user_id, month],
    );
  };

  static createOrUpdateMonthlyPlan = (user_id, month, savings_goal) => {
    return db.execute(
      `INSERT INTO monthly_plans(user_id, month, savings_goal)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
     id = LAST_INSERT_ID(id),
     savings_goal = VALUES(savings_goal)`,
      [user_id, month, savings_goal],
    );
  };

  static updateMonthlyPlan = (plan_id, savings_goal) => {
    return db.execute("UPDATE monthly_plans SET savings_goal=? WHERE id=?", [
      savings_goal,
      plan_id,
    ]);
  };

  static Getmonthlyplan = (user, month) => {
    return db.execute(
      `SELECT * FROM monthly_plans
     WHERE user_id = ?
     AND month = ?`,
      [user, month],
    );
  };

  static addPlannedExpense = (plan_id, category, amount) => {
    return db.execute(
      `INSERT INTO planned_expenses
     (plan_id, category, amount)
     VALUES (?, ?, ?)`,
      [plan_id, category, amount],
    );
  };

  static GetPlannedExpenses = (plan_id) => {
    return db.execute("SELECT * FROM planned_expenses WHERE plan_id=?", [
      plan_id,
    ]);
  };

  static getTotalPlannedExpenses = (plan_id) => {
    return db.execute(
      "SELECT SUM(amount) AS totalMandatoryExpense FROM planned_expenses WHERE plan_id=?",
      [plan_id],
    );
  };

  static getTotalIncomeOfMonth = (user_id, month) => {
    return db.execute(
      `SELECT SUM(amount) AS TotalMonthlyIncome
     FROM transactions
     WHERE user_id = ?
     AND DATE_FORMAT(date, '%Y-%m') = ?
     AND type = 'income'`,
      [user_id, month],
    );
  };
  static findplan_id = (user_id, month) => {
    return db.execute(
      "SELECT id FROM monthly_plans WHERE user_id=? AND month=?",
      [user_id, month],
    );
  };

  static checkInExpense = (plan_id, category) => {
    return db.execute(
      `SELECT EXISTS (
      SELECT 1
      FROM planned_expenses
      WHERE plan_id = ? AND LOWER(category) = LOWER(?)
    ) AS existsExpense`,
      [plan_id, category],
    );
  };
};
