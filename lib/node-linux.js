/**
 * @class nodelinux
 * This is a standalone module, originally designed for internal use in [NGN](http://github.com/thinkfirst/NGN).
 * However; it is capable of providing the same features for Node.JS scripts
 * independently of NGN.
 *
 * ### Getting node-linux
 *
 * `npm install node-linux`
 *
 * ### Using node-linux
 *
 * `var nm = require('node-linux');`
 *
 * @singleton
 * @author Corey Butler
 */
if (require('os').platform().indexOf('linux') < 0){
  throw 'node-linux is only supported on Linux.';
}

// Add daemon management capabilities
module.exports.Service = require('./daemon');