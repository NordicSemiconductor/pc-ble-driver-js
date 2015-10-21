'use strict';

var  sinon = require('sinon');
var assert = require('assert');

var proxyquire = require('proxyquire');

var Adapter = require('../../api/adapter');
var AdapterFactory = require('../../api/adapterFactory');

const commonStubs = require('./commonStubs');

describe('adapter.startAdvertising', function() {
    beforeEach(function() {
        this.clock = sinon.useFakeTimers();

        this.bleDriver = commonStubs.createBleDriver();

        this.bleDriver.gap_set_adv_data.yields(undefined);
        this.bleDriver.gap_start_advertisement.yields(undefined);
        this.bleDriver.gap_stop_advertisement.yields(undefined);

        // Provide an array of adapters for the first call
        var adapterFactory = new AdapterFactory(this.bleDriver);
        this.adapter = adapterFactory.getAdapters().test;
        this.adapter.open({'baudRate': 115211, 'parity': 'none', 'flowControl': 'uhh'}, function(err) {});
    });

    afterEach(function() {
        this.clock.restore();
    });

    it('with valid arguments should start advertising and emit adapterStateChange', function () {
        let stateChangeCallback = sinon.spy();
        let startAdvertisingCallback = sinon.spy();

        this.adapter.on('adapterStateChanged', stateChangeCallback);

        var advertisingData = {
            shortenedLocalName: 'MyCoolName',
            flags: ['leGeneralDiscMode', 'leLimitedDiscMode', 'brEdrNotSupported'],
            txPowerLevel: -10
        };

        var scanResponseData = {
            completeLocalName: 'MyCoolName'
        };

        var options = {
            channelMask: ['ch37off', 'ch38off'],
            interval: 1,
            timeout: 1,
            connectable: true,
            scannable: false
        };

        this.adapter.startAdvertising(advertisingData, scanResponseData, options, function(err) {
            assert.ifError(err);
            startAdvertisingCallback();
        });

        sinon.assert.calledOnce(startAdvertisingCallback);
        sinon.assert.calledOnce(stateChangeCallback);

        assert.equal(this.bleDriver.gap_set_adv_data.callCount, 1);
        assert.equal(this.bleDriver.gap_start_advertisement.callCount, 1);
    });
});

describe('adapter.stopAdvertising', function() {
    beforeEach(function() {
        this.clock = sinon.useFakeTimers();

        this.bleDriver = commonStubs.createBleDriver();

        this.bleDriver.gap_set_adv_data.yields(undefined);
        this.bleDriver.gap_start_advertisement.yields(undefined);
        this.bleDriver.gap_stop_advertisement.yields(undefined);

        // Provide an array of adapters for the first call
        var adapterFactory = new AdapterFactory(this.bleDriver);
        this.adapter = adapterFactory.getAdapters().test;
        this.adapter.open({'baudRate': 115211, 'parity': 'none', 'flowControl': 'uhh'}, function(err) {});
    });

    afterEach(function() {
        this.clock.restore();
    });

    it('should stop advertising and emit adapterStateChange', function () {
        let stateChangeCallback = sinon.spy();
        let stopAdvertisingCallback = sinon.spy();

        this.adapter.on('adapterStateChanged', stateChangeCallback);

        var advertisingData = {
            shortenedLocalName: 'MyCoolName',
            flags: ['leGeneralDiscMode', 'leLimitedDiscMode', 'brEdrNotSupported'],
            txPowerLevel: 0 // type: 0x0a "Tx Power Level"
        };

        var scanResponseData = {
            completeLocalName: 'MyCoolName',
        };

        var options = {
            channelMask: ['ch37off', 'ch38off', 'ch39off'],
            interval: 1, // in seconds
            timeout: 10, // in seconds
            connectable: true,
            scannable: false,
        };

        this.adapter.startAdvertising(advertisingData, scanResponseData, options, err => {
            assert.ifError(err);
            stateChangeCallback.reset();

            this.adapter.stopAdvertising(err => {
                assert.ifError(err);
                stopAdvertisingCallback();
            });
        });

        sinon.assert.calledOnce(stopAdvertisingCallback);
        sinon.assert.calledOnce(stateChangeCallback);

        assert.equal(this.bleDriver.gap_stop_advertisement.callCount, 1);
    });
});

