/* Copyright (c) 2010 - 2019, Nordic Semiconductor ASA
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

const axios = require('axios');
const tar = require('tar');
const cp = require('child_process');
const path = require('path');
const pkgJson = require('../package.json');
const mkdirp = require('mkdirp');

if (!process.env.ENABLE_DRAFT_TEST) {
    process.exit(1);
}

const ghToken = process.env.NODE_PRE_GYP_GITHUB_TOKEN;

if (!ghToken) {
    console.log('missing env NODE_PRE_GYP_GITHUB_TOKEN=<github_access_token>');
    process.exit(1);
}

const destDir = path.resolve(__dirname, '..', pkgJson.binary.module_path, '..');

const reveal = JSON.parse(cp.execSync('node-pre-gyp reveal'));
const { name, package_name: packageName, host } = reveal;
const arr = host.split('/');
const userOrOrg = arr[arr.indexOf(name) - 1];

new Promise((resolve, reject) => {
    mkdirp(destDir, err => (err ? reject(err) : resolve()));
})
.then(() => axios.get(`https://api.github.com/repos/${userOrOrg}/${name}/releases`, {
    headers: {
        Accept: 'application/vnd.github.v3.raw',
        Authorization: `token ${ghToken}`,
    },
}))
.then(({ data: releases }) => (releases || []).find(r => r.draft))
.then(draft => {
    if (!draft) {
        throw new Error('no draft release found');
    }
    const { assets } = draft;
    const asset = assets.find(a => a.name === packageName);
    if (!asset) {
        throw new Error(`${packageName} is not available in the latest draft release`);
    }
    return asset;
})
.then(asset => `https://${ghToken}:@api.github.com/repos/${userOrOrg}/${name}/releases/assets/${asset.id}`)
.then(assetUrl => axios.get(assetUrl, {
    headers: { Accept: 'application/octet-stream' },
    responseType: 'stream',
}))
.then(({ data }) => new Promise((resolve, reject) => {
    data.pipe(tar.x({ cwd: destDir }))
    .on('close', resolve)
    .on('error', reject);
}))
.catch(err => {
    console.log(err.message);
    process.exit(1);
});
