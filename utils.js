const log = (message, error = null) => {
  if (error) {
    console.error(message, error);
  } else {
    console.log(message);
  }
};

const handleError = (res, error, message) => {
  log(message, error);
  res.status(500).send({ error: true, msg: message });
};

const validateInput = (input) => {
  return input !== null && input !== "";
};

module.exports = { log, handleError, validateInput };
