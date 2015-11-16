'use strict';

const sinon = require('sinon');
const assert = require('assert');
const _ = require('underscore');

const commonStubs = require('./commonStubs');

var Adapter = require('../../api/adapter');

describe('Adapter - Scanning', () => {
    let adapter;
    let bleDriverEventCallback;

    beforeEach(() => {
        this.bleDriver = commonStubs.createBleDriver(eventCallback => {
            bleDriverEventCallback = eventCallback;
        });

        adapter = new Adapter(this.bleDriver, 'COM1', 'COM1');

        let options = {};
        adapter.open(options, err => {
            assert(!err);
        });
    });

    it('start and stop should provide callbacks with possible error and emit stateChanged', (done) => {
        let stateChangedSpy = sinon.spy();
        adapter.on('stateChanged', stateChangedSpy);

        sinon.assert.notCalled(stateChangedSpy);

        let scanOptions = {};

        adapter.startScan(scanOptions, err => {
            assert(!err);

            sinon.assert.calledOnce(stateChangedSpy);
            assert.equal(true, stateChangedSpy.lastCall.args[0].scanning);

            adapter.stopScan(err => {
                assert(!err);

                sinon.assert.calledTwice(stateChangedSpy);
                assert(!stateChangedSpy.lastCall.args[0].scanning);
                done();
            });
        });
    });

    it('After starting scanning we should receive deviceDiscovered and deviceChanged events', (done) => {
        let deviceDiscoveredSpy = sinon.spy();
        adapter.on('deviceDiscovered', deviceDiscoveredSpy);

        let scanOptions = {};
        adapter.startScan(scanOptions, err => {
            assert(!err);

            sinon.assert.notCalled(deviceDiscoveredSpy);

            const advReportUuids = ['0000180D-0000-1000-8000-00805F9B34FB'];
            let advReportEvent = {
                id: this.bleDriver.BLE_GAP_EVT_ADV_REPORT,
                peer_addr: {address: 'CD:96:E6:E2:3A:EA'},
                data: {BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE: advReportUuids},
                scan_rsp: false,
            };
            bleDriverEventCallback([advReportEvent]);

            sinon.assert.calledOnce(deviceDiscoveredSpy);
            assert.ok(_.isEqual(deviceDiscoveredSpy.lastCall.args[0].uuids, advReportUuids));

            const scanResponseUuids = ['0000180F-0000-1000-8000-00805F9B34FB'];
            advReportEvent = {
                id: this.bleDriver.BLE_GAP_EVT_ADV_REPORT,
                peer_addr: {address: 'CD:96:E6:E2:3A:EA'},
                data: {BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE: scanResponseUuids},
                scan_rsp: true,
            };
            bleDriverEventCallback([advReportEvent]);

            sinon.assert.calledTwice(deviceDiscoveredSpy);
            assert.ok(_.isEqual(deviceDiscoveredSpy.lastCall.args[0].uuids, scanResponseUuids));
            done();
        });
    });
});
