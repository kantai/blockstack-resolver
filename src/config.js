import { config as bskConfig } from 'blockstack'

const configDefaults = {
  winstonConsoleTransport: {
      level: 'info',
      handleExceptions: false,
      timestamp: true,
      stringify: true,
      colorize: true,
      json: false
  },
  blockstackAPIUrl: 'https://core.blockstack.org'
}


export function getConfig() {
  let config = Object.assign({}, configDefaults)
  if (process.env.BSK_RESOLVER_CONFIG) {
    const configFile = process.env.BSK_RESOLVER_CONFIG
    Object.assign(config, JSON.parse(fs.readFileSync(configFile)))
  }

  config.winstonConfig = { transports: [
    new winston.transports.Console(config.winstonConsoleTransport)
  ] }

  bskConfig.network.blockstackAPIUrl = config.blockstackAPIUrl

  return config
}
