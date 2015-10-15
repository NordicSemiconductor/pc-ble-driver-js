'use strict';

var sinon = require('sinon');
var assert = require('assert');
var _ = require('underscore');

var Adapter = require('../../api/adapter');

describe('Adapter - Scanning', () => {
    let adapter;
    let bleDriver;
    let bleDriverEventCallback;

    beforeEach(() => {
        bleDriver =
        {
            start_scan: sinon.stub(),
            stop_scan: sinon.stub(),
            open: (options, err) => {},
            BLE_GAP_EVT_ADV_REPORT: 27
        };
        let open = sinon.stub(bleDriver, 'open', (port, options, callback) => {
            bleDriverEventCallback = options.eventCallback;
            callback();
        });

        adapter = new Adapter(bleDriver, 'COM1', 'COM1');

        let options = {};
        adapter.open(options, err => {
            assert.ifError(err);
        });
    });

    it('start and stop should provide callbacks with possible error and emit adapterStateChanged', (done) => {
        bleDriver.start_scan.yieldsAsync(undefined);
        bleDriver.stop_scan.yieldsAsync(undefined);

        let adapterStateChangedSpy = sinon.spy();
        adapter.on('adapterStateChanged', adapterStateChangedSpy);

        sinon.assert.notCalled(adapterStateChangedSpy);

        let scanOptions = {};

        adapter.startScan(scanOptions, err => {
            assert.ifError(err);

            sinon.assert.calledOnce(adapterStateChangedSpy);
            assert.equal(true, adapterStateChangedSpy.lastCall.args[0].scanning);

            adapter.stopScan(err => {
                assert.ifError(err);

                sinon.assert.calledTwice(adapterStateChangedSpy);
                assert.ifError(adapterStateChangedSpy.lastCall.args[0].scanning);
                done();
            });
        });
    });

    it('After starting scanning we should receive deviceDiscovered and deviceChanged events', (done) => {
        bleDriver.start_scan.yieldsAsync(undefined);

        let deviceDiscoveredSpy = sinon.spy();
        adapter.on('deviceDiscovered', deviceDiscoveredSpy);

        let scanOptions = {};
        adapter.startScan(scanOptions, err => {
            assert.ifError(err);

            sinon.assert.notCalled(deviceDiscoveredSpy);

            const advReportUuids = ['0000180D-0000-1000-8000-00805F9B34FB'];
            let advReportEvent = {id: bleDriver.BLE_GAP_EVT_ADV_REPORT,
                                  peer_addr: {address: 'CD:96:E6:E2:3A:EA'},
                                  data: {BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE: advReportUuids},
                                  scan_rsp: false};
            bleDriverEventCallback([advReportEvent]);

            sinon.assert.calledOnce(deviceDiscoveredSpy);
            assert.ok(_.isEqual(deviceDiscoveredSpy.lastCall.args[0].uuids, advReportUuids));

            const scanResponseUuids = ['0000180F-0000-1000-8000-00805F9B34FB'];
            advReportEvent = {id: bleDriver.BLE_GAP_EVT_ADV_REPORT,
                                  peer_addr: {address: 'CD:96:E6:E2:3A:EA'},
                                  data: {BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE: scanResponseUuids},
                                  scan_rsp: true};
            bleDriverEventCallback([advReportEvent]);

            sinon.assert.calledTwice(deviceDiscoveredSpy);
            assert.ok(_.isEqual(deviceDiscoveredSpy.lastCall.args[0].uuids, scanResponseUuids));
            done();
        });
    });
});
