import winston from "winston";

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ message, label, timestamp }) => {
      return `${timestamp} [${label}] ${message}`;
    }),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'sync.log' })
  ]
}); 