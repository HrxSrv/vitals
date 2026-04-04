import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@utils/httpError';

type ValidationType = 'body' | 'query' | 'params';

export function validateRequest(schema: ZodSchema, type: ValidationType = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const target = type === 'body' ? req.body : type === 'query' ? req.query : req.params;
      const validated = schema.parse(target);

      if (type === 'body') {
        req.body = validated;
      } else if (type === 'query') {
        req.query = validated;
      } else {
        req.params = validated;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        const message =
          type === 'body'
            ? 'Invalid request body'
            : type === 'query'
              ? 'Invalid query parameters'
              : 'Invalid path parameters';
        next(new ValidationError(message, details));
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return validateRequest(schema, 'query');
}
