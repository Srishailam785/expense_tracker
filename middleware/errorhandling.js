module.exports = (err, req, res, next) => {
  console.error(err);

  // If a response has already started, delegate to Express's default handler
  // instead of trying to send a second response (avoids "headers already sent" crashes).
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).render("error", {
    message: "Something went wrong. Please try again.",
  });
};
