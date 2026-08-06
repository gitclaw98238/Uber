const { validationResult } = require('express-validator');

function validate(validations) {
  return [
    ...validations,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          message: 'Validation failed.',
          errors: errors.array().map((error) => ({
            field: error.path,
            message: error.msg,
            value: error.value
          }))
        });
      }
      return next();
    }
  ];
}

module.exports = {
  validate
};
