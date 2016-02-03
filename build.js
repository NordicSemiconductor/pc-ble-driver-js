function build(debug)
{
    var cmakeJS = require('cmake-js');

    var defaultRuntime = 'node';
    var defaultRuntimeVersion = '4.2.0';
    var defaultWinArch = 'ia32';

    var options = {
        runtime: process.env.npm_config_runtime || undefined,
        runtimeVersion: process.env.npm_config_target || undefined,
        arch: process.env.npm_config_arch || undefined,
        debug: debug
    }

    var buildSystem = new cmakeJS.BuildSystem(options);

    if (buildSystem.options.runtime == undefined) {
        buildSystem.options.runtime = defaultRuntime;
    }

    if (buildSystem.options.runtimeVersion == undefined) {
        buildSystem.options.runtimeVersion = defaultRuntimeVersion;
    }

    if (buildSystem.options.arch == undefined && process.platform == 'win32') {
        buildSystem.options.arch = defaultWinArch;
    }

    buildSystem.rebuild();
}

var times = 0;

function begin(args) {
    var debug = true;

    var length = args.length >>> 0;

    for (var i = 0; i < length; i++) {
        if(args[i] === '--debug') debug = true;
    }

    try {
        build(debug);
    } catch(e) {
        if (e.code == 'MODULE_NOT_FOUND') {
            if (times++ == 5) {
                throw e;
            }
            else {
                setTimeout(begin, 2000);
            }
        }
        else {
            throw e;
        }
    }
};

begin(process.argv);
