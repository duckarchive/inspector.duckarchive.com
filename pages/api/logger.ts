import winston from "winston";

export const initLog = (moduleName: string) =>
  winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.label({ label: moduleName }),
      winston.format.printf(({ message, label, timestamp, level, ...rest }) => {
        if (Object.keys(rest).length) {
          return `${timestamp}:${level} [${label}] ${message} ${JSON.stringify({ ...rest })}`;
        } else {
          return `${timestamp}:${level} [${label}] ${message}`;
        }
      })
    ),
    transports: [new winston.transports.Console(), new winston.transports.File({ filename: "sync.log" })],
  });
