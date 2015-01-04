/**
 * @class nodelinux.Service
 * Manage node.js scripts as native Linux daemons.
 *     var Service = require('node-linux').Service;
 *
 *     // Create a new service object
 *     var svc = new Service({
 *       name:'Hello World',
 *       description: 'The nodejs.org example web server.',
 *       script: '/path/to/helloworld.js'
 *     });
 *
 *     // Listen for the "install" event, which indicates the
 *     // process is available as a service.
 *     svc.on('install',function(){
 *       svc.start();
 *     });
 *
 *     svc.install();
 * @author Corey Butler
 * @singleton
 */
var fs = require('fs'),
	p = require('path'),
	exec = require('child_process').exec,
	wrapper = p.resolve(p.join(__dirname,'./wrapper.js'));

var daemon = function(config) {

	Object.defineProperties(this,{

    /**
     * @cfg {String} [mode=systemv]
     * The type of daemon to create. Defaults to the common systemv daemonization utility.
     * Alternatively, `systemd` can be used.
     */
    mode: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.mode || 'systemv'
    },

    /**
     * @cfg {String} [user=root]
     * The user to run the service as. Defaults to 'root'
     */
    user: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.user || 'root'
    },

    /**
     * @cfg {String} [group=root]
     * The group to run the service as. Defaults to 'root'
     */
    group: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.group || 'root'
    },

    system: {
      enumerable: false,
      get: function(){
        switch(this.mode){
          default:
            return require('./systemv');
        }
      }
    },

    /**
     * @cfg {String} [author='Unknown']
     * An optional descriptive header added to the top of the daemon file. Credits
     * the author of the script.
     */
    author: {
      enumerable: true,
      writable: true,
      configurable: false,
      value: config.author || 'Unknown'
    },

    /**
     * @cfg {String} [piddir=/var/run]
     * The root directory where the PID file is stored.
     */
    piddir: {
      enumerable: true,
      writable: true,
      configurable: false,
      value: config.piddir || '/var/run'
    },

    /**
     * @cfg {String} name
     * The descriptive name of the process, i.e. `My Process`.
     */
    _name: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: config.name || null
    },

		/**
		 * @property {String} name
		 * The name of the process.
		 */
    name: {
      enumerable: true,
      get: function(){return this._name;},
      set: function(value){this._name = value;}
    },

    label: {
    	enumerable: false,
    	get: function(){
    		return this.name.replace(/[^a-zA-Z\-]+/gi,'').toLowerCase()
    	}
    },

    outlog: {
    	enumerable: false,
    	get: function(){
    		return p.join(this.logpath,this.label+'.log');
    	}
    },

    errlog: {
    	enumerable: false,
    	get: function(){
				return p.join(this.logpath,this.label+'-error.log');
    	}
    },

    /**
     * @property {Boolean} exists
     * Indicates that the service exists.
     * @readonly
     */
    exists: {
     	enumerable: true,
     	get: function(){
     		return fs.existsSync('/etc/init.d/'+this.label);
     	}
    },

    /**
     * @cfg {String} [description='']
     * Description of the service.
     */
    description: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.description || ''
    },

    /**
     * @cfg {String} [cwd]
     * The absolute path of the current working directory. Defaults to the base directory of #script.
     */
    cwd: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: config.cwd || p.dirname(this.script)
    },

    /**
	   * @cfg {Array|Object} [env]
	   * An optional array or object used to pass environment variables to the node.js script.
	   * You can do this by setting environment variables in the service config, as shown below:
	   *
	   *     var svc = new Service({
	   *      name:'Hello World',
	   *      description: 'The nodejs.org example web server.',
	   *      script: '/path/to/helloworld.js',
	   *      env: {
	   *        name: "NODE_ENV",
	   *        value: "production"
	   *      }
	   *     });
	   *
	   * You can also supply an array to set multiple environment variables:
	   *
	   *     var svc = new Service({
	   *      name:'Hello World',
	   *      description: 'The nodejs.org example web server.',
	   *      script: '/path/to/helloworld.js',
	   *      env: [{
	   *        name: "HOME",
	   *        value: process.env["USERPROFILE"] // Access the user home directory
	   *      },{
	   *        name: "NODE_ENV",
	   *        value: "production"
	   *      }]
	   *     });
	   */
	  _ev: {
	  	enumerable: false,
	  	writable: true,
	  	configurable: false,
	  	value: config.env || []
	  },

    EnvironmentVariables: {
    	enumerable: false,
    	get: function(){
    		var ev = [], tmp = {};
    		if (Object.prototype.toString.call(this._ev) === '[object Array]'){
    			this._ev.forEach(function(item){
    				tmp = {};
    				tmp[item.name] = item.value;
    				ev.push(tmp);
    			});
    		} else {
    			tmp[this._ev.name] = this._ev.value;
    			ev.push(tmp);
    		}
    		return ev;
    	}
    },

    /**
     * @cfg {String} script required
     * The absolute path of the script to launch as a service.
     */
    script: {
      enumerable: true,
      writable: true,
      configurable: false,
      value: config.script !== undefined ? require('path').resolve(config.script) : null
    },

		/**
		 * @cfg {String} [logpath=/Library/Logs/node-scripts]
		 * The root directory where the log will be stored.
		 */
		logpath: {
			enumerable: true,
			writable: true,
			configurable: false,
			value: config.logpath || '/var/log'
		},

		/**
     * @cfg {Number} [maxRetries=null]
     * The maximum number of restart attempts to make before the service is considered non-responsive/faulty.
     * Ignored by default.
     */
    maxRetries: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.maxRetries || null
    },

    /**
     * @cfg {Number} [maxRestarts=3]
     * The maximum number of restarts within a 60 second period before haulting the process.
     * This cannot be _disabled_, but it can be rendered ineffective by setting a value of `0`.
     */
    maxRestarts: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.maxRestarts || 3
    },

    /**
     * @cfg {Boolean} [abortOnError=false]
     * Setting this to `true` will force the process to exit if it encounters an error that stops the node.js script from running.
     * This does not mean the process will stop if the script throws an error. It will only abort if the
     * script throws an error causing the process to exit (i.e. `process.exit(1)`).
     */
    abortOnError: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.abortOnError instanceof Boolean ? config.abortOnError : false
    },

    /**
     * @cfg {Number} [wait=1]
     * The initial number of seconds to wait before attempting a restart (after the script stops).
     */
    wait: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.wait || 1
    },

    /**
     * @cfg {Number} [grow=.25]
     * A number between 0-1 representing the percentage growth rate for the #wait interval.
     * Setting this to anything other than `0` allows the process to increase it's wait period
     * on every restart attempt. If a process dies fatally, this will prevent the server from
     * restarting the process too rapidly (and too strenuously).
     */
    grow: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.grow || .25
    },

    _suspendedEvents: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: []
    },

    /**
     * @method isSuspended
     * Indicates the specified event is suspended.
     */
    isSuspended: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: function(eventname){
        return this._suspendedEvents.indexOf(eventname) >= 0;
      }
    },

    /**
     * @method suspendEvent
     * Stop firing the specified event.
     * @param {String} eventname
     * The event.
     */
    suspendEvent: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: function(eventname){
        if (!this.isSuspended(eventname)){
          this._suspendedEvents.push(eventname);
        }
      }
    },

    /**
     * @method resumeEvent
     * Resume firing the specified event.
     * @param {String} eventname
     * The event.
     */
    resumeEvent: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: function(eventname){
        if (this.isSuspended(eventname)){
          this._suspendedEvents.splice(this._suspendedEvents.indexOf(eventname),1);
        }
      }
    },

    _gen: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: null
    },

    generator: {
      enumerable: false,
      get: function(){
        return this._gen;
      },
      set: function(value) {
        var me = this;
        this._gen = value;

        // Handle generator events & bubble accordingly

        /**
         * @event install
         * Fired when the installation completes.
         */
        this._gen.on('install',function(){
          !me.isSuspended('install') && me.emit('install');
        });

        /**
         * @event uninstall
         * Fired when the uninstallation/removal completes.
         */
        this._gen.on('uninstall',function(){
          !me.isSuspended('uninstall') && me.emit('uninstall');
        });

        /**
         * @event alreadyinstalled
         * Fired when a duplicate #install is attempted.
         */
        this._gen.on('alreadyinstalled',function(){
          !me.isSuspended('alreadyinstalled') && me.emit('alreadyinstalled');
        });

        /**
         * @event invalidinstallation
         * Fired when an invalid installation is detected.
         */
        this._gen.on('invalidinstallation',function(){
          !me.isSuspended('invalidinstallation') && me.emit('invalidinstallation');
        });

        /**
         * @event start
         * Fired when the #start method finishes.
         */
        this._gen.on('start',function(){
          !me.isSuspended('start') && me.emit('start');
        });

        /**
         * @event stop
         * Fired when the #stop method finishes.
         */
        this._gen.on('stop',function(){
          !me.isSuspended('stop') && me.emit('stop');
        });

        /**
         * @event error
         * Fired when an error occurs. The error is passed as a callback to the listener.
         */
        this._gen.on('error',function(err){
          !me.isSuspended('error') && me.emit('error',err);
        });

        /**
         * @event doesnotexist
         * Fired when an attempt to uninstall the service fails because it does not exist.
         */
        this._gen.on('doesnotexist',function(err){
          !me.isSuspended('doesnotexist') && me.emit('doesnotexist');
        });
      }
    },

		/**
		 * @method install
		 * Install the script as a background process/daemon.
		 * @param {Function} [callback]
		 */
		install: {
			enumerable: true,
			writable: true,
			configurable: false,
			value: function(callback){

        // Generate the content
        this.generator.createProcess(callback||function(){});
			}
		},

		/**
		 * @method uninstall
		 * Uninstall an existing background process/daemon.
		 * @param {Function} [callback]
		 * Executed when the process is uninstalled.
		 */
		uninstall: {
			enumerable: true,
			writable: true,
			configurable: false,
			value: function(callback){

				var me = this;
				this.suspendEvent('stop');
  				this.stop(function(){
				  me.resumeEvent('stop');
					me.generator.removeProcess(function(success){
            callback && callback();
					});
				});
			}
		},

		/**
		 * @method start
		 * Start and/or create a daemon.
		 * @param {Function} [callback]
		 */
		start:{
			enumerable: true,
			writable: false,
			configurable: false,
			value: function(callback){
        this.generator.start(callback);
			}
		},

		/**
		 * @method stop
		 * Stop the process if it is currently running.
	 	 * @param {Function} [callback]
		 */
		stop: {
			enumerable: true,
			writable: false,
			configurable: false,
			value: function(callback){
				this.generator.stop(callback);
			}
		},

		/**
	 	 * @method restart
	 	 * @param {Function} [callback]
	 	 */
	 	restart: {
		 	enumerable: true,
		 	writable: true,
		 	configurable: false,
		 	value: function(callback){
		 		var me = this;
		 		this.stop(function(){
		 			me.start(callback);
		 		});
		 	}
	 	}

	});

	// Do not allow invalid daemonization type
	if (['systemv','systemd'].indexOf(this.mode) < 0){
	  this.mode = 'systemv';
	}

	// Require a script tag
	if (!this.script){
	  throw new Error('Script was not provided as a configuration attribute.');
	}

  // Generate wrapper code arguments
	var args = [
	  '-f','"'+this.script.trim()+'"',
    '-l','"'+this.outlog.trim()+'"',
    '-e','"'+this.errlog.trim()+'"',
    '-t','"'+this.label.trim()+'"',
    '-g',this.grow.toString(),
    '-w',this.wait.toString(),
    '-r',this.maxRestarts.toString(),
    '-a',(this.abortOnError===true?'y':'n')
  ];

  if (this.maxRetries!==null){
    args.push('-m');
    args.push(this.maxRetries.toString());
  }

  // Add environment variables
  for (var i=0;i<this.EnvironmentVariables.length;i++){
    args.push('--env');
    for (var el in this.EnvironmentVariables[i]){
      args.push(el+'='+this.EnvironmentVariables[i][el]);
    }
  }

  // Add the CWD environment variable if requested
  if (this.cwd){
    args.push('--env');
    args.push('"'+p.resolve(this.cwd)+'"');
  }

  // Create options
  var opts = {};
  for(var attr in this){
    if (typeof this[attr] !== 'function'){
      opts[attr] = this[attr];
    }
  }

  opts.name = this.label;
  opts.description = this.description;
  opts.author = this.author;
  opts.wrappercode = args.join(' ');

  // Create the generator
  this.generator = this.generator || new this.system(opts);

};

var util = require('util'),
  EventEmitter = require('events').EventEmitter;

// Inherit Events
util.inherits(daemon,EventEmitter);

module.exports = daemon;
