/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const cmakeJS = require('cmake-js');
const os = require('os');
const fs = require('fs');

function getBuildSystem(debug) {
    const defaultRuntime = 'node';
    const defaultRuntimeVersion = process.version.substr(1);
    const defaultWinArch = os.arch();

    const options = {
        runtime: process.env.npm_config_runtime || undefined,
        runtimeVersion: process.env.npm_config_target || undefined,
        arch: process.env.npm_config_arch || undefined,
        generator: 'Ninja',
        debug,
    };

    if (process.platform === 'win32') {
        if (process.arch === 'ia32') {
            options.generator = 'Visual Studio 14 2015';
        } else if (process.arch === 'x64') {
            options.generator = 'Visual Studio 14 2015 Win64';
        } else {
            console.log(`${process.arch} is not supported on Windows`);
        }
    }

    const buildSystem = new cmakeJS.BuildSystem(options);

    if (buildSystem.options.runtime === undefined) {
        buildSystem.options.runtime = defaultRuntime;
    }

    if (buildSystem.options.runtimeVersion === undefined) {
        buildSystem.options.runtimeVersion = defaultRuntimeVersion;
    }

    if (buildSystem.options.arch === undefined && process.platform === 'win32') {
        buildSystem.options.arch = defaultWinArch;
    }

    return buildSystem;
}

let times = 0;

function begin(args) {
    // Sanity check for the platform-specific binary driver files
    fs.readdir('./pc-ble-driver', (err, files) => {
        if (err) {
            console.error('ERROR: Could not read the \'pc-ble-driver\' subrepo, please check manually.');
            process.exit(2);
        } else if (!files.length) {
            console.error('ERROR: The \'pc-ble-driver\' subrepo is empty, please run \'git submodule update --init --recursive\' and try again.');
            process.exit(1);
        }
    });

    let debug = false;
    let build = 'rebuild';

    for (let i = 0; i < args.length; i += 1) {
        if (args[i] === '--debug') debug = true;
        if (args[i] === '--no-rebuild') build = 'build';
    }

    let buildSystem;
    try {
        buildSystem = getBuildSystem(debug);
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            times += 1;
            if (times === 5) {
                throw e;
            } else {
                setTimeout(begin, 2000);
            }
        } else {
            throw e;
        }
    }

    buildSystem[build]().catch(() => {
        process.exit(1);
    });
}

begin(process.argv);
