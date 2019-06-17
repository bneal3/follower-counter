// NOTE: Purpose of config system is to enable setting environment variables.
var env = process.env.NODE_ENV || 'development';

process.env['ENV'] = env;

if(env === 'development' || env === 'test') {
  var config = require('./config.json');
  var envConfig = config[env];

  Object.keys(envConfig).forEach((key) => {
    process.env[key] = envConfig[key];
  });
}
