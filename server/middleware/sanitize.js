import mongoSanitize from 'express-mongo-sanitize';

export default function sanitize(req, _res, next) {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
}
