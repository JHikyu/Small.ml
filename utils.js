const colors = require('colors');
const Mixpanel = require('mixpanel');
const mixpanel = Mixpanel.init('ffa545f28c6c3db00733e362503be04e');

module.exports = {
  log(event, ...args) {
    console.log(`[${event}]`.yellow, ...args);
  },
  mixpanel(event, data) {
    console.log(data);

    mixpanel.track(event, {
      ...data,
    });
  }
}