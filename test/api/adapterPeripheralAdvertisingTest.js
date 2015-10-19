'use strict';

var  sinon = require('sinon');
var assert = require('assert');

var proxyquire = require('proxyquire');

var Adapter = require('../../api/adapter.js');
var AdapterFactory = require('../../api/adapterFactory.js');

const commonStubs = require('./commonStubs.js');

describe('adapter.startAdvertising', function() {
    beforeEach(function() {
        this.clock = sinon.useFakeTimers();

        this.bleDriver = commonStubs.createBleDriver();

        this.bleDriver.gap_get_address.yields('FF:FF:FF:FF:FF:FF', undefined);

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
        let checkIfCalledStub = sinon.spy();

        this.adapter.on('adapterStateChanged', stateChangeCallback);

        // Order is of importance here, create byte array in the order attributes appear
        var advertisingData = {
            shortenedLocalName: 'MyCoolName', 
            flags: ['leGeneralDiscMode', 'leLimitedDiscMode', 'brEdrNotSupported'],
            txPowerLevel: 0 // type: 0x0a "Tx Power Level"
        };

        var scanResponseData = {
            completeLocalName: 'MyCoolName', 
        };

        var options ={
            channelMask: [37, 39, 39], // if channel_mask is not present or null, all channels
            whitelist: ['FF-FF-FF-FF-FF-FF'], // if whitelist not present, whitelist is not used. Can be empty array.
            whilelistPolicy: ['connection', 'scanRequest'], // if whitelistPolicy is not present or null, whitelist is not used
            interval: 1, // in seconds
            timeout: 10, // in seconds
            peerAddr: 'FF-FF-FF-FF-FF-FF', // TODO: sets directed if connectable == true ? invalidates advertisingData if directed.
            connectable: true, // if false: not connectable
            scannable: false
        };

        this.adapter.startAdvertising(advertisingData, scanResponseData, options, function(err) {
            //sinon.assert.calledOnce(checkIfCalledStub);
            //assert.ifError(err);
        });

        //sinon.assert.calledOnce(checkIfCalledStub);
    });
});
