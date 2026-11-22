'use strict';

module.exports = {
  ...require('./hash'),
  ...require('./heuristik'),
  ...require('./virustotal'),
  ...require('./scan'),
  ...require('./wache'),
  ...require('./autostart-windows'),
  ...require('./defender-windows'),
  ...require('./agent'),
  ...require('./zentrale'),
  ...require('./engine/engine'),
  ...require('./engine/liste'),
  ...require('./engine/lockvoegel'),
};
