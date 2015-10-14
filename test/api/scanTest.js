'use strict';

var  sinon = require('sinon');
var assert = require('assert');
var lolex = require('lolex');
var _ = require('underscore');

var clock = lolex.install();

var proxyquire = require('proxyquire');

var Adapter = require('../../api/adapter');

describe('Scanning', () => {
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

    it('start and stop should provide callbacks with possible error and emit adapterStateChanged', () => {
        bleDriver.start_scan.yields(undefined);
        bleDriver.stop_scan.yields(undefined);

        let spy = sinon.spy();
        adapter.on('adapterStateChanged', spy);

        sinon.assert.notCalled(spy);

        let scanOptions = {};
        adapter.startScan(scanOptions, err => {
            assert.ifError(err);
        });

        sinon.assert.calledOnce(spy);
        assert.equal(true, spy.lastCall.args[0].scanning);

        adapter.stopScan(err => {
            assert.ifError(err);
        });

        sinon.assert.calledTwice(spy);
        assert.ifError(spy.lastCall.args[0].scanning);
    });

    it('After starting scanning we should receive deviceDiscovered and deviceChanged events', () => {
        bleDriver.start_scan.yields(undefined);

        let discoveredSpy = sinon.spy();
        adapter.on('deviceDiscovered', discoveredSpy);

        let changedSpy = sinon.spy();
        adapter.on('deviceChanged', changedSpy);

        let scanOptions = {};
        adapter.startScan(scanOptions, err => {
            assert.ifError(err);
        });

        sinon.assert.notCalled(discoveredSpy);
        sinon.assert.notCalled(changedSpy);

        const advReportUuids = ['0000180D-0000-1000-8000-00805F9B34FB'];
        let advReportEvent = {id: bleDriver.BLE_GAP_EVT_ADV_REPORT,
                              peer_addr: {address: 'CD:96:E6:E2:3A:EA'},
                              data: {BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE: advReportUuids},
                              scan_rsp: false};
        bleDriverEventCallback([advReportEvent]);

        sinon.assert.calledOnce(discoveredSpy);
        sinon.assert.notCalled(changedSpy);

        const scanResponseUuids = ['0000180F-0000-1000-8000-00805F9B34FB'];
        advReportEvent = {id: bleDriver.BLE_GAP_EVT_ADV_REPORT,
                              peer_addr: {address: 'CD:96:E6:E2:3A:EA'},
                              data: {BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE: scanResponseUuids},
                              scan_rsp: true};
        bleDriverEventCallback([advReportEvent]);

        sinon.assert.calledOnce(discoveredSpy);
        sinon.assert.calledOnce(changedSpy);

        assert.ok(_.isEqual(changedSpy.lastCall.args[0].uuids, advReportUuids.concat(scanResponseUuids)));
    });
});
