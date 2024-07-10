import winston from "winston";
import safeStringify from 'safe-stringify';

export const initLog = (moduleName: string) =>
  winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.label({ label: moduleName }),
      winston.format.printf(({ message, label, timestamp, level, ...rest }) => {
        if (Object.keys(rest).length) {
          return `${timestamp}:${level} [${label}] ${message} ${safeStringify(rest)}`;
        } else {
          return `${timestamp}:${level} [${label}] ${message}`;
        }
      })
    ),
    transports: [new winston.transports.Console(), new winston.transports.File({ filename: "sync.log" })],
  });
