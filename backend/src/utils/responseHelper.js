const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const error = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const resp = { success: false, message };
  if (errors) resp.errors = errors;
  return res.status(statusCode).json(resp);
};

module.exports = { success, error };
