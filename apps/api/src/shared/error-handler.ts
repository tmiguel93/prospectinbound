import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  void next;
  if (error instanceof ZodError) {
    response.status(400).json({ message: 'Dados inválidos.', issues: error.flatten() });
    return;
  }

  console.error(error);
  response.status(500).json({ message: 'Ocorreu um erro interno.' });
};
