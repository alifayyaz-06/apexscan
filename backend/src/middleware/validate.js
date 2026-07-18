const { ZodError } = require('zod');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));

      return res.status(400).json({
        success: false,
        message: errors[0].message,
        errors
      });
    }

    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
