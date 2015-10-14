'use strict';

var  sinon = require('sinon');
var assert = require('assert');
var lolex = require('lolex');

var clock = lolex.install();

var proxyquire = require('proxyquire');

var Adapter = require('../../api/adapter');

describe('Scanning', function() {
    let adapter;
    let bleDriver;
    let bleDriverEventCallback;

    beforeEach(function() {
        bleDriver =
        {
            // TODO: scan_start, scan_stop, open, adv_report_evt

            start_scan: sinon.stub(),
            stop_scan: sinon.stub()
        };
        var open = sinon.stub(bleDriver, 'open', (port, options, callback) => {
            bleDriverEventCallback = options.eventCallback;

            setTimeout(callback(), 10);
        });
        adapter = new Adapter(bleDriver, 'COM1', 'COM1');

        let logCallback = (serverity, message) => {

        };
        let eventCallback = eventArray => {

        };

        let options = {baudRate: 1000000, parity: false, flowControl: false, logCallback: logCallback, eventCallback: eventCallback};
        adapter.open(options, err => {
            if (err) {
                assert.ifError(err);
            }
        });
    });

    it('start should provide a callback with possible error', function () {

    });
});
