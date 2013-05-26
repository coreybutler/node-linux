var mu = require('mu2'),
    os = require('os'),
    p = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec,
    supportedos = ['debian','centos','redhat','fedora','ubuntu'];

/**
 * @class nodelinux.init
 * A class used to create systemv init scripts to run a Node.js script as a background daemon/service.
 * @param {Object} config
 */
var init = function(config){

  config = config || {};

  Object.defineProperties(this,{

    /**
     * @property {String} templateRoot
     * The root directory where initd templates are stored.
     */
    templateRoot: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: p.join(__dirname,'templates')
    },

    _label: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: null
    },

    /**
     * @property {String} label
     * The label used for the daemon (file name).
     */
    label: {
      enumerable: true,
      get: function(){
        return this._label;
      }
    },

    /**
     * @method generate
     * Generate a systemv init script for the current operating system.
     * @param {Function} callback
     * The callback is fired after the script is generated.
     * @param {Object} callback.script
     * The content of the initd script file.
     */
    generate: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: function(callback){
        callback = callback || function(){};

        var me = this;
        exec('cat /proc/version',function(error, stdout, stderr){
          stdout = stdout.toLowerCase();
          var _os = supportedos.filter(function(i){
            return stdout.indexOf(i) >= 0;
          })[0];

          switch(_os){
            // Use RedHat for CentOS
            case 'centos':
            case 'redhat':
              _os = 'redhat';
              break;

            // Use debian for Ubuntu & default
            case 'ubuntu':
            case 'debian':
            default:
              _os = 'debian';
              break;
          }

          /**
           * @cfg {String} name required
           * The title of the process
           */
          /**
           * @cfg {String} description
           * A description of what the service does.
           */
          /**
           * @cfg {String} [author='Unknown']
           * The author of the process.
           */
          /**
           * @cfg {String} [user='root']
           * The user account under which the process should run.
           */
          /**
           * @cfg {String} [group='root']
           * The user group under which the process should run.
           */
          /**
           * @cfg {String} [pidroot='/var/run']
           * The root directory where the PID file will be created (if applicable to the OS environment).
           */
          /**
           * @cfg {String} [logroot='/var/log']
           * The root directory where the log file will be created.
           */
          /**
           * @cfg {Object} [env]
           * A key/value object containing environment variables that should be passed to the process.
           */
          me.label = config.name.replace(/[^a-zA-Z0-9]/,'').toLowerCase();
          opt = {
            label: me.label,
            servicesummary: config.name,
            servicedescription: config.description || config.name,
            author: config.author || 'Unknown',
            script: p.join(__dirname,'..','example','helloworld.js'),
            description: config.description,
            user: config.user || 'root',
            group: config.group || 'root',
            pidroot: config.pidroot || '/var/run',
            logroot: config.logroot || '/var/log',
            wrappercode: '-w 3',
            env: '',
            created: new Date(),
            execpath: process.execPath,
          };
          mu.compile(p.join(me.templateRoot,_os),function(err,tpl){
            var stream = mu.render(tpl,opt),
                chunk = "";
            stream.on('data',function(data){
              chunk += data;
            });
            stream.on('end',function(){
              callback(chunk);
            });
          });
        });
      }
    }

  });

};

module.exports = init;