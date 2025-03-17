declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}
