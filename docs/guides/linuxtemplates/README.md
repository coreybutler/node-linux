# SystemV Templates

There are many flavors of Linux, and while many of them cn be served using the stock
`initd` template scripts packaged with node-linux, there may be occasions where a
custom template is a better fit for the server environment. This guide discusses how
templates are built and how to create custom templates.

## How Node-Linux Creates init.d Scripts

Node-Linux uses the [mustache](http://mustache.github.io/) template library along with
the [mu](https://github.com/raycmorgan/Mu) module to create initd scripts. Templates are stored
within the `node_modules/node-linux/lib/templates` directory. Debian and RedHat templates ship
with node-linux, which should also work for Ubuntu and CentOS/Fedora/AMI respectively.

## Custom Templates

Custom templates must implement a minimum of two functions to work properly: start and stop.
Node-Linux uses these to start and stop scripts using syntax similar to what would be used on the
command line to start/stop a service: `service myapp start` and `service myapp stop`.

A custom init.d template is a mustache template, working with a simple
find/replace approach. There are several variables passed to the template when the script is
generated.

### Variables

Use the following variables in your template file. For example, to generate `name` in a
custom template, it should use the standard mustache syntax, i.e. `{{name}}`.

The following variables are passed to every template. Custom templates can choose to use
whichever ones are necessary.

- `label` **(REQUIRED)**: The label/service/file name. This is all lowercase with no special characters or spaces.
- `servicesummary`: A short summary of the service. Typically used in header documentation within the script.
- `servicedescription`: A detailed summary of the service. Typically used in header documentation within the script.
- `author`: The author of the script or daemon. Typically used for documentation only.
- `script` **(REQUIRED)**: The Node.js script that should be run as a daemon.
- `description`: A common description of the service. The is usually used instead of the servicedescription.
- `user`: A user account under which the process should run.
- `group`: A user group under which the process should run.
- `pidroot`: The root directory where the PID file is stored. Defaults to '/var/run'.
- `logroot`: The root directory where log files are written. Defaults to '/var/log'.
- `wrappercode` **(REQUIRED)**: The dynamically generated parameters for the wrapper script. This script
is responsible for controlling restarts.
- `env`: Environment variables that should be passed to the running process.
- `created`: The date when the service is created. Typically used for documentation only.
- `execpath` **(REQUIRED)**: The full path & executable name of Node.JS.

These variables are created by node-linux and passed to the template when it is rendered.
Template authos should use the required variables at minimum.

## Using Custom Templates

Once a custom template has been created, it can be used by specifying the template attribute of
the service configuration. For example:

    var Service = require('./').Service,
    svc = new Service({
      name: 'Hello World',
      descirption: 'A hello world web server.',
      template: '/path/to/custom/template'
    });

It's probably easiest to copy or study one of the existing templates when creating custom templates.