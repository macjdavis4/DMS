import pino from 'pino'
import { env } from './env'

const isDev = env.NODE_ENV === 'development'

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      '*.password',
      '*.passwordHash',
      '*.authorization',
      'headers.authorization',
      'headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }
    : {}),
})
