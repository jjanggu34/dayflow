export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // eslint-disable-next-line no-console
  console.error("[error]", err);

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    message: err.message || "Internal server error"
  });
};
