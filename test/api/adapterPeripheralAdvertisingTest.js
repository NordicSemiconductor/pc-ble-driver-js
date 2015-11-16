'use strict';

const  sinon = require('sinon');
const assert = require('assert');

const proxyquire = require('proxyquire');

const Adapter = require('../../api/adapter');
const AdapterFactory = require('../../api/adapterFactory');

const commonStubs = require('./commonStubs');

describe('adapter.startAdvertising', function() {
    beforeEach(function() {
        this.clock = sinon.useFakeTimers();

        this.bleDriver = commonStubs.createBleDriver();

        this.bleDriver.gap_set_advertising_data.yields(undefined);
        this.bleDriver.gap_start_advertising.yields(undefined);
        this.bleDriver.gap_stop_advertising.yields(undefined);

        // Provide an array of adapters for the first call
        var adapterFactory = AdapterFactory.getInstance(this.bleDriver);

        // Sorry! The singleton keeps the first bleDriver it gets otherwise
        adapterFactory.clearForNextUnitTest(this.bleDriver);

        this.adapter = undefined;

        adapterFactory.getAdapters((err, adapters) => {
            this.adapter = adapters.test;
        });
        this.adapter.open({baudRate: 115211, parity: 'none', flowControl: 'uhh'}, function(err) {});
    });

    afterEach(function() {
        this.clock.restore();
    });

    it('with valid arguments should start advertising and emit stateChange', function() {
        let stateChangeCallback = sinon.spy();
        let startAdvertisingCallback = sinon.spy();

        this.adapter.on('stateChanged', stateChangeCallback);

        var advertisingData = {
            shortenedLocalName: 'MyCoolName',
            flags: ['leGeneralDiscMode', 'leLimitedDiscMode', 'brEdrNotSupported'],
            txPowerLevel: -10,
        };

        var scanResponseData = {
            completeLocalName: 'MyCoolName',
        };

        var options = {
            channelMask: ['ch37off', 'ch38off'],
            interval: 1,
            timeout: 1,
            connectable: true,
            scannable: false,
        };

        this.adapter.startAdvertising(advertisingData, scanResponseData, options, function(err) {
            assert.ifError(err);
            startAdvertisingCallback();
        });

        sinon.assert.calledOnce(startAdvertisingCallback);
        sinon.assert.calledOnce(stateChangeCallback);

        assert.equal(this.bleDriver.gap_set_advertising_data.callCount, 1);
        assert.equal(this.bleDriver.gap_start_advertising.callCount, 1);
    });
});

describe('adapter.stopAdvertising', function() {
    beforeEach(function() {
        this.clock = sinon.useFakeTimers();

        this.bleDriver = commonStubs.createBleDriver();

        this.bleDriver.gap_set_advertising_data.yields(undefined);
        this.bleDriver.gap_start_advertising.yields(undefined);
        this.bleDriver.gap_stop_advertising.yields(undefined);

        // Provide an array of adapters for the first call
        var adapterFactory = AdapterFactory.getInstance(this.bleDriver);

        // Sorry! The singleton keeps the first bleDriver it gets otherwise
        adapterFactory.clearForNextUnitTest(this.bleDriver);

        adapterFactory.getAdapters((err, adapters) => {
            this.adapter = adapters.test;
        });
        this.adapter.open({baudRate: 115211, parity: 'none', flowControl: 'uhh'}, function(err) {});
    });

    afterEach(function() {
        this.clock.restore();
    });

    it('should stop advertising and emit stateChange', function() {
        let stateChangeCallback = sinon.spy();
        let stopAdvertisingCallback = sinon.spy();

        this.adapter.on('stateChanged', stateChangeCallback);

        var advertisingData = {
            shortenedLocalName: 'MyCoolName',
            flags: ['leGeneralDiscMode', 'leLimitedDiscMode', 'brEdrNotSupported'],
            txPowerLevel: 0,
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

        assert.equal(this.bleDriver.gap_stop_advertising.callCount, 1);
    });
});
