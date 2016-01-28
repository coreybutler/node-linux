# Updates

Please note that the extreme delay in updates has been largely [out of my control](http://github.com/coreybutler/node-windows#update-21814). That said, I anticipate getting back to all of the node-* projects the first week of May.

[![NPM version](https://badge.fury.io/js/node-linux.png)](http://badge.fury.io/js/node-linux)
[![NGN Dependencies](https://david-dm.org/coreybutler/node-linux.png)](https://david-dm.org/coreybutler/node-linux)
[![Build](https://api.travis-ci.org/coreybutler/node-linux.png)](https://travis-ci.org/coreybutler/node-linux)

Follow the author on [G+](https://plus.google.com/u/1/111169756342687497578?rel=author)
or [Twitter (@goldglovecb)](http://twitter.com/goldglovecb).

**Contributions Requested**

(see below)

Documentation is available at the [node-linux portal](https://coreybutler.github.io/node-linux).

# node-linux

This is a standalone module, originally designed for internal use in [NGN](http://github.com/thinkfirst/NGN).
However; it is capable of providing the same features for Node.JS scripts
independently of NGN.

For alternative versions, see [node-windows](http://github.com/coreybutler/node-windows)
and [node-mac](http://github.com/coreybutler/node-mac)

This module makes it possible to daemonize Node.js scripts natively (using systemv init.d scripts).

To start, install node-linux via:

    npm install node-linux

node-linux has a utility to run Node.js scripts as Linux daemons.

To create a service with node-linux, prepare a script like:

```js
  var Service = require('node-linux').Service;

  // Create a new service object
  var svc = new Service({
    name:'Hello World',
    description: 'The nodejs.org example web server.',
    script: '/path/to/helloworld.js'
  });

  // Listen for the "install" event, which indicates the
  // process is available as a service.
  svc.on('install',function(){
    svc.start();
  });

  svc.install();
```

The code above creates a new `Service` object, providing a pretty name and description.
The `script` attribute identifies the Node.js script that should run as a service. Upon running
this, the script will be available to the system. By default, node-linux produces systemv init
scripts, meaning the services can be managed by typing `service myapp start` or `service myapp stop`
(or `service myapp status` in some cases).

![Windows Mac](https://raw.github.com/coreybutler/node-linux/master/docs/assets/images/startstopstatus.jpg)

The `Service` object emits the following events:

- _install_ - Fired when the script is installed as a service.
- _alreadyinstalled_ - Fired if the script is already known to be a service.
- _invalidinstallation_ - Fired if an installation is detected but missing required files.
- _uninstall_ - Fired when an uninstallation is complete.
- _start_ - Fired when the new service is started.
- _stop_ - Fired when the service is stopped.
- _error_ - Fired in some instances when an error occurs.
- _doesnotexist_ - Fired when an attempt to start a non-existent service is detected.

In the example above, the script listens for the `install` event. Since this event
is fired when a service installation is complete, it is safe to start the service.

Services created by node-linux are like other services running on Linux.
They can be started/stopped using `service myapp start` or `service myapp stop` and
logs are available (default is in /var/log).

## Environment Variables

Sometimes you may want to provide a service with static data, passed in on creation of the service. You can do this by setting environment variables in the service config, as shown below:

```js
  var svc = new Service({
    name:'Hello World',
    description: 'The nodejs.org example web server.',
    script: '/path/to/helloworld.js',
    env: {
      name: "HOME",
      value: process.env["USERPROFILE"] // service is now able to access the user who created its' home directory
    }
  });
```

You can also supply an array to set multiple environment variables:

```js
  var svc = new Service({
    name:'Hello World',
    description: 'The nodejs.org example web server.',
    script: '/path/to/helloworld.js',
    env: [{
      name: "HOME",
      value: process.env["USERPROFILE"] // service is now able to access the user who created its' home directory
    },
    {
      name: "TEMP",
      value: path.join(process.env["USERPROFILE"],"/temp") // use a temp directory in user's home directory
    }]
  });
```

## Setting run as user/group

By default your node service will run as root:root. You may not want that.
Just pass the requested user/group values at startup

```js
  var svc = new Service({
    name:'Hello World',
    description: 'The nodejs.org example web server.',
    script: '/path/to/helloworld.js',
    user: "vagrant",
    group: "vagrant"
  });
```

## Cleaning Up: Uninstall a Service

Uninstalling a previously created service is syntactically similar to installation.

```js
  var Service = require('node-linux').Service;

  // Create a new service object
  var svc = new Service({
    name:'Hello World',
    script: require('path').join(__dirname,'helloworld.js')
  });

  // Listen for the "uninstall" event so we know when it's done.
  svc.on('uninstall',function(){
    console.log('Uninstall complete.');
    console.log('The service exists: ',svc.exists());
  });

  // Uninstall the service.
  svc.uninstall();
```

The uninstall process only removes process-specific files. **It does NOT delete your Node.js script, but it will remove the logs!**

## What Makes node-linux Services Unique?

Lots of things!

**Long Running Processes & Monitoring:**

There is no built-in service recovery in most Linux environments, and third party products can be fairly
limited or not easily configured from code. Therefore, node-linux creates a wrapper around the Node.js script.
This wrapper is responsible for restarting a failed service in an intelligent and configurable manner. For example,
if your script crashes due to an unknown error, node-linux will attempt to restart it. By default,
this occurs every second. However; if the script has a fatal flaw that makes it crash repeatedly,
it adds unnecessary overhead to the system. node-linux handles this by increasing the time interval
between restarts and capping the maximum number of restarts.

**Smarter Restarts That Won't Pummel Your Server:**

Using the default settings, node-linux adds 25% to the wait interval each time it needs to restart
the script. With the default setting (1 second), the first restart attempt occurs after one second.
The second occurs after 1.25 seconds. The third after 1.56 seconds (1.25 increased by 25%) and so on.
Both the initial wait time and the growth rate are configuration options that can be passed to a new
`Service`. For example:

```js
  var svc = new Service({
    name:'Hello World',
    description: 'The nodejs.org example web server.',
    script: '/path/to/helloworld.js'),
    wait: 2,
    grow: .5
  });
```

In this example, the wait period will start at 2 seconds and increase by 50%. So, the second attempt
would be 3 seconds later while the fourth would be 4.5 seconds later.

**Don't DOS Yourself!**

Repetitive recycling could potentially go on forever with a bad script. To handle these situations, node-linux
supports two kinds of caps. Using `maxRetries` will cap the maximum number of restart attempts. By
default, this is unlimited. Setting it to 3 would tell the process to no longer restart a process
after it has failed 3 times. Another option is `maxRestarts`, which caps the number of restarts attempted
within 60 seconds. For example, if this is set to 3 (the default) and the process crashes/restarts repeatedly,
node-linux will cease restart attempts after the 3rd cycle in a 60 second window. Both of these
configuration options can be set, just like `wait` or `grow`.

Finally, an attribute called `abortOnError` can be set to `true` if you want your script to **not** restart
at all when it exits with an error.

## How Services Are Made

node-linux uses the templates to generate init.d scripts for each Node.js script deployed as a
service. This file is created in `/etc/init.d` by default. Additionally, a log file is
generated in `/var/log/<name>` for general output and error logging.

_Event Logging_

A log source named `myappname.log` provides basic logging for the service. It can be used to see
when the entire service starts/stops.

By default, any `console.log`, `console.warn`, `console.error` or other output will be made available
in one of these two files.

# Contributions

Due to some unforeseen life circumstances, I was not able to add all of the features I'd hoped to add
before releasing this. I'll chip away at them over time, but I would be very interested in community contributions
in the following areas:

- systemd script generation
- upstart script generation

I have also added a tag in the issues called `feature request` to keep a running to-do list.

If you are interested in working on one of these features, please get in touch with me before you start to discuss
the feature.

# License (MIT)

Copyright (c) 2013 Corey Butler

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.