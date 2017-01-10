/* Copyright (c) 2016, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form, except as embedded into a Nordic
 *   Semiconductor ASA integrated circuit in a product or a software update for
 *   such product, must reproduce the above copyright notice, this list of
 *   conditions and the following disclaimer in the documentation and/or other
 *   materials provided with the distribution.
 *
 *   3. Neither the name of Nordic Semiconductor ASA nor the names of its
 *   contributors may be used to endorse or promote products derived from this
 *   software without specific prior written permission.
 *
 *   4. This software, with or without modification, must only be used with a
 *   Nordic Semiconductor ASA integrated circuit.
 *
 *   5. Any software provided in binary form under this license must not be
 *   reverse engineered, decompiled, modified and/or disassembled.
 *
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

function getBuildSystem(debug) {
    var cmakeJS = require('cmake-js');
    var os = require('os');

    var defaultRuntime = 'node';
    var defaultRuntimeVersion = process.version.substr(1);
    var defaultWinArch = os.arch();

    var options = {
        runtime: process.env.npm_config_runtime || undefined,
        runtimeVersion: process.env.npm_config_target || undefined,
        arch: process.env.npm_config_arch || undefined,
        debug: debug,
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

    return buildSystem;
}

var times = 0;

function begin(args) {
    var debug = false;

    var length = args.length >>> 0;

    for (var i = 0; i < length; i++) {
        if (args[i] === '--debug') debug = true;
    }

    var buildSystem;
    try {
        buildSystem = getBuildSystem(debug);
    } catch (e) {
        if (e.code == 'MODULE_NOT_FOUND') {
            if (times++ == 5) {
                throw e;
            } else {
                setTimeout(begin, 2000);
            }
        } else {
            throw e;
        }
    }

    buildSystem.rebuild().catch(e => {
        process.exit(1);
    });
}

begin(process.argv);
