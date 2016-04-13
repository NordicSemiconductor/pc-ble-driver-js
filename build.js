/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
 */

function build(debug)
{
    var cmakeJS = require('cmake-js');
    var os = require('os');

    var defaultRuntime = 'node';
    var defaultRuntimeVersion = process.version.substr(1);
    var defaultWinArch = os.arch();

    var options = {
        runtime: process.env.npm_config_runtime || undefined,
        runtimeVersion: process.env.npm_config_target || undefined,
        arch: process.env.npm_config_arch || undefined,
        debug: debug
    };

    var buildSystem = new cmakeJS.BuildSystem(options);

    if (buildSystem.options.runtime === undefined) {
        buildSystem.options.runtime = defaultRuntime;
    }

    if (buildSystem.options.runtimeVersion === undefined) {
        buildSystem.options.runtimeVersion = defaultRuntimeVersion;
    }

    if (buildSystem.options.arch === undefined && process.platform == 'win32') {
        buildSystem.options.arch = defaultWinArch;
    }

    buildSystem.rebuild();
}

var times = 0;

function begin(args) {
    var debug = false;

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
