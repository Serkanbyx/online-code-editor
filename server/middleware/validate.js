import { validationResult } from 'express-validator';

export default function validate(validationChains) {
  return async (req, res, next) => {
    await Promise.all(validationChains.map((validationChain) => validationChain.run(req)));

    const result = validationResult(req);

    if (result.isEmpty()) {
      next();
      return;
    }

    const errors = result.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));

    res.status(400).json({ success: false, errors });
  };
}
