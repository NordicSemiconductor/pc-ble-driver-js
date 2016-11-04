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

const JSZip = require('jszip');
const fs = require('fs');
const EventEmitter = require('events');

const { ErrorCode } = require('./dfu/dfuConstants');
const DfuTransportFactory = require('./dfu/dfuTransportFactory');

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
    constructor(adapter = null) {
        super();

        this._adapter = adapter;
        this._transport = null;
        this._zipFilePath = null;

        this._controlPointCharacteristicId = null;
        this._packetCharacteristicId = null;
    }

    // Run the entire DFU process
    performDFU(zipFilePath, adapter, targetAddress, callback) {
        this._zipFilePath = zipFilePath || this._zipFilePath;
        this._adapter = adapter || this._adapter;
        this._targetAddress = targetAddress || this._targetAddress;

        if (!this._zipFilePath) {
            throw new Error('No zipFilePath provided.');
        }
        if (!this._adapter) {
            throw new Error('No adapter provided.');
        }
        if (!this._targetAddress) {
            throw new Error('No target address provided.');
        }

        this._fetchUpdates(this._zipFilePath)
            .then(updates => this._performUpdates(updates))
            .then(() => callback())
            .catch(err => {
                if (err.code === ErrorCode.ABORTED) {
                    const aborted = true;
                    callback(null, aborted);
                } else {
                    callback(err)
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
            //transport.setMtuSize(); // <-- TODO: Set MTU size.
            Promise.resolve()
            .then(() => DfuTransportFactory.create(this._adapter, this._targetAddress))
            .then(transport => {
                this._transport = transport;
                return transport.setPrn(20)
                .then(() => updates.reduce((prev, update) => {
                    return prev.then(() => this._performSingleUpdate(transport, update));
                }, Promise.resolve() ))
                .catch(err => {
                    reject(err);
                });
             })
            .then(() => resolve())
            .catch(err => reject(err));
        });
    }

    _performSingleUpdate(transport, update) {
        return new Promise((resolve, reject) => {
            this._getProgressHandlers(update)
            .then(([handleInitPacketProgress, handleFirmwareProgress]) => {
                Promise.resolve()
                // Init Packet
                .then(() => transport.on('progressUpdate', handleInitPacketProgress))
                .then(update['initPacket'])
                .then(data => transport.sendInitPacket(data))
                .then(() => transport.removeListener('progressUpdate', handleInitPacketProgress))
                // Firmware
                .then(() => transport.on('progressUpdate', handleFirmwareProgress))
                .then(update['firmware'])
                .then(data => transport.sendFirmware(data))
                .then(() => transport.removeListener('progressUpdate', handleFirmwareProgress))
                // That's all
                .then(() => resolve())
                .catch(err => {
                    transport.removeListener('progressUpdate', handleInitPacketProgress);
                    transport.removeListener('progressUpdate', handleFirmwareProgress);
                    reject(err);
                });
            })
            .catch(err => reject(err));
        });
    }

    _getProgressHandlers(update) {
        return Promise.all([
            Promise.resolve()
                .then(update['initPacket'])
                .then(data => this._handleProgressFactory(0.05, 0.1, data.length))
                .catch(err => reject(err)),
            Promise.resolve()
                .then(update['firmware'])
                .then(data => this._handleProgressFactory(0.1, 1.0, data.length))
                .catch(err => reject(err))
        ]);
    }

    _emitProgress(stage, progress) {
        this.emit('progressUpdate', {stage: stage, progress: progress.toFixed(2)});
    }

    _handleProgressFactory(progressStart, progressEnd, transferSize) {
        return progressUpdate => {
            this._emitProgress(progressUpdate.stage,
              (progressStart + (progressUpdate.offset / transferSize * (progressEnd - progressStart))));
        };
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


    // Start or resume DFU process
    // For now, just restart the DFU process.
    // It is part of the protocol to continue at the current offset.
    startDFU(zipFilePath, adapter, targetAddress) {
        performDFU(zipFilePath, adapter, targetAddress);
    }


    // Stop (pause) DFU process
    // Should do nothing more than pause.
    stopDFU() {

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
