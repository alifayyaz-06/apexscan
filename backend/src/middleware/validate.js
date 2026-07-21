const { ZodError } = require('zod');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));

      console.error('[VALIDATION ERROR]', JSON.stringify({
        url: req.originalUrl,
        method: req.method,
        errors,
        bodyKeys: Object.keys(req[source] || {}),
        itemsSample: req[source]?.items?.slice(0, 2)
      }, null, 2));

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
