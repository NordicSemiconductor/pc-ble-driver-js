
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

const spawn = require('child_process').spawn;

/*
 * This script builds and publishes precompiled binaries for pc-ble-driver-js
 * to GitHub. Using the platform and arch for the current system, and building
 * binaries for all the runtime/version combinations configured below.
 */

const BUILD_CONFIGS = [
    {
        npm_config_runtime: 'node',
        npm_config_target: '10.15.1',
    },
    {
        npm_config_runtime: 'node',
        npm_config_target: '8.15.0',
    },
    {
        npm_config_runtime: 'electron',
        npm_config_target: '2.0.17',
        npm_config_disturl: 'https://atom.io/download/electron',
    },
    {
        npm_config_runtime: 'electron',
        npm_config_target: '4.0.6',
        npm_config_disturl: 'https://atom.io/download/electron',
    },
    {
        npm_config_runtime: 'electron',
        npm_config_target: '2.0.17',
        npm_config_disturl: 'https://atom.io/download/electron',
    },
];

function runNpm(args, envVars) {
    return new Promise((resolve, reject) => {
        const env = Object.assign({}, process.env);
        Object.keys(envVars).forEach(key => {
            env[key] = envVars[key];
        });
        const options = {
            env,
            shell: true,
            stdio: 'inherit',
        };
        spawn('npm', args, options).on('exit', code => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`The npm process exited with code ${code}`));
            }
        });
    });
}

function cleanPrebuilt(config) {
    console.log('Removing any locally existing .node binaries');
    return runNpm(['run', 'clean-prebuilt'], config);
}

function prebuild(config) {
    console.log(`Building ${JSON.stringify(config)}`);
    return runNpm(['install'], config);
}

function packagePrebuilt(config) {
    console.log(`Packaging ${JSON.stringify(config)}`);
    return runNpm(['run', 'package-prebuilt'], config);
}

function publishPrebuilt(config) {
    console.log(`Publishing ${JSON.stringify(config)}`);
    return runNpm(['run', 'publish-prebuilt'], config);
}

function buildAndPublishAll(configs) {
    return configs.reduce((prev, config) => (
        prev.then(() => cleanPrebuilt(config))
            .then(() => prebuild(config))
            .then(() => packagePrebuilt(config))
            .then(() => publishPrebuilt(config))
    ), Promise.resolve());
}

if (!process.env.NODE_PRE_GYP_GITHUB_TOKEN) {
    console.error('Environment variable NODE_PRE_GYP_GITHUB_TOKEN was not provided. ' +
        'Unable to publish to GitHub.');
    process.exit(1);
}

buildAndPublishAll(BUILD_CONFIGS)
    .catch(error => {
        console.error(`Error when building/publishing binaries: ${error.message}.`);
        process.exit(1);
    });
