'use strict';

var  sinon = require('sinon');
var assert = require('assert');

var proxyquire = require('proxyquire');

var Adapter = require('../../api/adapter.js');
var AdapterFactory = require('../../api/adapterFactory.js');

describe('adapter.open', function() {
    beforeEach(function() {
        this.clock = sinon.useFakeTimers();

        this.bleDriver =
        {
            get_adapters: sinon.stub(),
            open: sinon.stub(),
            get_version: sinon.stub(),
            gap_get_device_name: sinon.stub(),
            gap_get_address: sinon.stub()
        };

        this.bleDriver.get_adapters.yields(undefined, [{ serialNumber: 'test', comName: '6' }]);
        this.bleDriver.open.yields(undefined);
        this.bleDriver.get_version.yields('999.999', undefined);
        this.bleDriver.gap_get_device_name.yields('MyCoolDeviceName', undefined);
        this.bleDriver.gap_get_address.yields('FF:FF:FF:FF:FF:FF', undefined);

        // Provide an array of adapters for the first call
        var adapterFactory = new AdapterFactory(this.bleDriver);
        this.adapter = adapterFactory.getAdapters().test;
    });

    afterEach(function() {
        this.clock.restore();
    });

    it('with valid options should open the underlaying driver', function () {
        let stateChangeCallback = sinon.spy();

        this.adapter.on('adapterStateChanged', stateChangeCallback);

        this.adapter.open({'baudRate': 115211, 'parity': 'none', 'flowControl': 'uhh'}, (err) => {
            if(err) {
                assert.fail('There should be no error');
            }

            sinon.assert.calledOnce(this.bleDriver.open);
        });

        let args = this.bleDriver.open.lastCall.args;

        assert.equal(args[0], '6');
        assert.equal(args[1].baudRate, 115211);
        assert.equal(args[1].parity, 'none');
        assert.equal(args[1].flowControl, 'uhh');
        assert(args[1].logCallback !== undefined);
        assert(args[1].eventCallback !== undefined);

        sinon.assert.calledTwice(stateChangeCallback);

        let stateCallbackArgs = stateChangeCallback.lastCall.args;

        assert.equal(stateCallbackArgs[0].address, 'FF:FF:FF:FF:FF:FF');
        assert.equal(stateCallbackArgs[0].firmwareVersion, '999.999');
        assert.equal(stateCallbackArgs[0].name, 'MyCoolDeviceName');
    });
});
