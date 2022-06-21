const colors = require('colors');
const Mixpanel = require('mixpanel');
const mixpanel = Mixpanel.init('ffa545f28c6c3db00733e362503be04e');

module.exports = {
  log(event, ...args) {
    console.log(`[${event}]`.yellow, ...args);
  },
  mixpanel(event, data) {
    if (data.socket) {
      data.ip = data.socket.request.connection.remoteAddress;
      data.socket_id = data.socket.id;
      delete data.socket;
    }
    if (data.req) {
      data.ip = data.req.headers['x-forwarded-for'] || data.req.socket.remoteAddress
      delete data.req;
    }

    mixpanel.track(event, {
      ...data,
    });
  }
}