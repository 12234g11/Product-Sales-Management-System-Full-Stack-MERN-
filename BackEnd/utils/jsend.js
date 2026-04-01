export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({ status: "success", data });
};

export const sendFail = (res, data, statusCode = 400) => {
  res.status(statusCode).json({ status: "fail", data });
};

export const sendError = (res, message, statusCode = 500) => {
  res.status(statusCode).json({ status: "error", message });
};
