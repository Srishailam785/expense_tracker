const express = require("express");
const router = express.Router();
const Transaction = require("../controllers/transaction");
const isAuth = require("../middleware/is-auth");

router.get("/transactions", isAuth, Transaction.getTransactions);

router.get("/addtransaction", isAuth, Transaction.getAddTransaction);

router.post("/transactions", isAuth, Transaction.postransactions);

router.post("/transactions/delete/:id", isAuth, Transaction.delete);

router.get("/transactions/edit/:id", isAuth, Transaction.edit);
router.post("/transactions/update/:id", isAuth, Transaction.update);

router.get("/logout", Transaction.logout);

router.get("/month", isAuth, Transaction.month);

router.get("/monthly-plan", isAuth, Transaction.getMonthlyPlan);

router.post("/monthly-plan", isAuth, Transaction.postMonthlyPlan);

module.exports = router;
