const colors = require('colors');

module.exports = {
  log(event, ...args) {
    console.log(`[${event}]`.yellow, ...args);
  }
}