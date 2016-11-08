/*
 * Copyright (c) 2016 Nordic Semiconductor ASA
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form must reproduce the above copyright notice, this
 *   list of conditions and the following disclaimer in the documentation and/or
 *   other materials provided with the distribution.
 *
 *   3. Neither the name of Nordic Semiconductor ASA nor the names of other
 *   contributors to this software may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 *   4. This software must only be used in or with a processor manufactured by Nordic
 *   Semiconductor ASA, or in or with a processor manufactured by a third party that
 *   is used in combination with a processor manufactured by Nordic Semiconductor.
 *
 *   5. Any software provided in binary or object form under this license must not be
 *   reverse engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const _ = require('underscore');
const JSZip = require('jszip');
const fs = require('fs');
const EventEmitter = require('events');

const { ErrorCode } = require('./dfu/dfuConstants');
const DfuTransportFactory = require('./dfu/dfuTransportFactory');
const DfuSpeedometer = require('./dfu/dfuSpeedometer');

const SECURE_DFU_SERVICE_UUID = 'FE59';
const SECURE_DFU_CONTROL_POINT_UUID = '8EC90001F3154F609FB8838830DAEA50';
const SECURE_DFU_PACKET_UUID =        '8EC90002F3154F609FB8838830DAEA50';

/**
 * Class that provides Dfu controller functionality
 * @class
 */

class Dfu extends EventEmitter {
    /**
    * Constructor that shall not be used by developer.
    * @private
    */
    constructor() {
        super();

        this._zipFilePath = null;
        this._transportType = null;
        this._transportParameters = null;
        this._transport = null;
        this._speedometer = null;
        this._handleProgressUpdate = _.throttle(this._handleProgressUpdate.bind(this), 1000);
    }

    // Run the entire DFU process
    performDFU(zipFilePath, transportType, transportParameters, callback) {
        this._zipFilePath = zipFilePath || this._zipFilePath;
        this._transportType = transportType || this._transportType;
        this._transportParameters = transportParameters || this._transportParameters;

        if (!this._zipFilePath) {
            throw new Error('No zipFilePath provided.');
        }
        if (!this._transportType) {
            throw new Error('No transport type provided.');
        }
        if (!this._transportParameters) {
            throw new Error('No transport parameters provided.');
        }

        this._fetchUpdates(this._zipFilePath)
            .then(updates => this._performUpdates(updates))
            .then(() => {
                if (callback) {
                    callback();
                }
            })
            .catch(err => {
                if (err.code === ErrorCode.ABORTED) {
                    const aborted = true;
                    if (callback) { callback(null, aborted); }
                } else {
                    if (callback) { callback(err); }
                }
            });
    }

    abort() {
        if (this._transport) {
            this._transport.abort();
        } else {
            throw new Error('Abort called, but no transport is in progress.');
        }
    }

    _performUpdates(updates) {
        return new Promise((resolve, reject) => {
            Promise.resolve()
            .then(() => updates.reduce((prev, update) => {
                return prev.then(() => this._performSingleUpdate(update));
            }, Promise.resolve()))
            .then(() => resolve())
            .catch(err => reject(err));
        });
    }

    _performSingleUpdate(update) {
        return new Promise((resolve, reject) => {
            DfuTransportFactory.create(this._transportParameters)
                .then(transport => { this._transport = transport; })
                .then(() => this._transport.on('progressUpdate', this._handleProgressUpdate))
                .then(update['initPacket'])
                .then(data => this._transport.sendInitPacket(data))
                .then(update['firmware'])
                .then(data => this._transferFirmware(this._transport, data))
                .then(() => this._transport.removeListener('progressUpdate', this._handleProgressUpdate))
                .then(() => setTimeout(() => resolve(), 5000))
                .catch(err => {
                    this._transport.removeListener('progressUpdate', this._handleProgressUpdate);
                    reject(err);
                });
        });
    }

    _transferFirmware(transport, data) {
        return transport.getFirmwareState(data)
            .then(state => {
                this._speedometer = new DfuSpeedometer(data.length, state.offset);
                return transport.sendFirmware(data);
            })
            .then(() => {
                this._speedometer = null;
            });
    }

    _handleProgressUpdate(progressUpdate) {
        if (this._speedometer) {
            this._speedometer.setCompletedBytes(progressUpdate.offset);
            this.emit('progressUpdate', {
                stage: progressUpdate.stage,
                offset: progressUpdate.offset,
                percentCompleted: this._speedometer.getPercentCompleted(),
                bytesPerSecond: this._speedometer.getBytesPerSecond(),
                averageBytesPerSecond: this._speedometer.getAverageBytesPerSecond(),
                completedBytes: this._speedometer.getCompletedBytes(),
                totalBytes: this._speedometer.getTotalBytes(),
            });
        }
    }

    _getManifestAsync(zipFilePath) {
        return new Promise((resolve, reject) => {
            this.getManifest(zipFilePath, (err, manifest) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(manifest);
                }
            });
        });
    }

    _loadZipAsync(zipFilePath) {
        return new Promise ((resolve, reject) => {
            this._loadZip(zipFilePath, (err, zip) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(zip);
                }
            });
        });
    }

    // Uses the manifest to fetch init packet (dat_file) and firmware (bin_file)
    // from the zip. Returns a sorted array of updates, on the format
    // [ {initPacket: <dat_file promise>, firmware: <bin_file promise>}, ... ]
    // The sorting is such that the application update is put last.
    // Each promise resolves with the contents of the given file.
    _fetchUpdates(zipFilePath) {
        return new Promise((resolve, reject) => {

            Promise.all([this._loadZipAsync(zipFilePath),
                         this._getManifestAsync(zipFilePath)])
            .then(([zip, manifest]) => {
                let updates = [];

                const createUpdatePromise = (updateType => {
                    return new Promise((resolve, reject) => {
                        let update = manifest[updateType];
                        if (update) {
                            Promise.all([() => zip.file(update['dat_file']).async('array'),
                                        () => zip.file(update['bin_file']).async('array')])
                            .then(([initPacket, firmware]) => updates.push({'initPacket': initPacket, 'firmware': firmware}))
                            .then(() => resolve())
                            .catch(err => reject(err));
                        } else {
                          resolve();
                        }
                    });
                });

                let promiseChain = new Promise(resolve => resolve());

                // The sorting of updates happens here; fetching is chained in the below order.
                for (let updateType of ['softdevice', 'bootloader', 'softdevice_bootloader', 'application']) {
                    promiseChain = promiseChain.then(() => createUpdatePromise(updateType));
                }

                promiseChain.then(() => resolve(updates))
                .catch(err => reject(err));
            })
            .catch(err => reject(err));
        });
    }


    // Callback signature: function(err, zip) {}
    _loadZip(zipFilePath, callback) {
        // Read zip file
        fs.readFile(zipFilePath, (err, data) => {
            if (err) {
                return callback(err);
            }

            // Get and return zip object
            JSZip.loadAsync(data)
            .then((zip) => {
                callback(undefined, zip);
            })
            .catch((err) => {
                return callback(err);
            })
        })
    }


    // Callback signature: function(err, manifest) {}
    getManifest(zipFilePath, callback) {
        if (zipFilePath === undefined) { throw new Error('Missing argument zipFilePath.'); }
        if ((typeof zipFilePath !== "string") || (!zipFilePath.length)) {
            throw new Error('zipFilePath must be a non-empty string.');
        }

        // Fetch zip object
        this._loadZip(zipFilePath, (err, zip) => {
            if (err) {
                return callback(err);
            }
            // Read out manifest from zip
            zip.file("manifest.json")
            .async("string")
            .then((data) => {
                let manifest;
                try {
                    // Parse manifest as JASON
                    manifest = JSON.parse(data)['manifest'];
                } catch (err) {
                    return callback(err);
                }
                // Return manifest
                return callback(undefined, manifest);
            }, (err) => {
                return callback(err);
            });
        })
    }

    /* Manifest object format:
    Consists of one or more properties whose name is one of:
        application
        bootloader
        softdevice
        softdevice_bootloader
    Each of the above properties is a firmware object, on the format:
        {bin_file: <binfile>,   // Name of file containing firmware.
         dat_file: <datfile>}   // Name of file containing init packet.
    A firmware object named softdevice_bootloader has one additional property:
        info_read_only_metadata: {
            bl_size: <blsize>,    // Size of bootloader.
            sd_size: <sdsize>}    // Size of softdevice.
    */
}

module.exports = Dfu;
