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
        let checkIfCalledStub = sinon.spy();

        this.adapter.on('adapterStateChanged', stateChangeCallback);

        this.adapter.open({'baudRate': 115211, 'parity': 'none', 'flowControl': 'uhh'}, (err) => {
            if(err) {
                assert.fail('There should be no error');
            }

            sinon.assert.calledOnce(this.bleDriver.open);
            checkIfCalledStub();
        });

        sinon.assert.calledOnce(checkIfCalledStub);

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
        assert.equal(stateCallbackArgs[0].available, true);
    });
});

describe('adapter.close', function() {
    beforeEach(function() {
        this.clock = sinon.useFakeTimers();

        this.bleDriver =
        {
            get_adapters: sinon.stub(),
            open: sinon.stub(),
            get_version: sinon.stub(),
            gap_get_device_name: sinon.stub(),
            gap_get_address: sinon.stub(),
            close: sinon.stub()
        };

        this.bleDriver.get_adapters.yields(undefined, [{ serialNumber: 'test', comName: '6' }]);
        this.bleDriver.open.yields(undefined);
        this.bleDriver.get_version.yields('999.999', undefined);
        this.bleDriver.gap_get_device_name.yields('MyCoolDeviceName', undefined);
        this.bleDriver.gap_get_address.yields('FF:FF:FF:FF:FF:FF', undefined);
        this.bleDriver.close.yields(undefined);

        // Provide an array of adapters for the first call
        var adapterFactory = new AdapterFactory(this.bleDriver);
        this.adapter = adapterFactory.getAdapters().test;
    });

    afterEach(function() {
        this.clock.restore();
    });

    it('should close the driver and emit adapterStateChanged event', function() {
        let checkIfCalledStub = sinon.spy();
        let stateChangeCallback = sinon.spy();

        this.adapter.on('adapterStateChanged', stateChangeCallback);

        this.adapter.open({'baudRate': 115211, 'parity': 'none', 'flowControl': 'uhh'}, (err) => {
            if(err) {
                assert.fail('There should be no error');
            }

            this.adapter.close(function(err) {
                if(err) {
                    assert.fail('There should be no error');
                }

                checkIfCalledStub();
            });
        });

        sinon.assert.calledOnce(checkIfCalledStub);

        // 1: UART settings, 2: opening driver, 3: closing driver
        assert.equal(stateChangeCallback.callCount, 3);

        let stateCallbackArgs = stateChangeCallback.lastCall.args;
        assert.equal(stateCallbackArgs[0].available, false);
    });

    it('should emit error when closing the driver yields an error', function() {
        let checkIfCalledStub = sinon.spy();
        let stateChangeCallback = sinon.spy();
        let errorCallback = sinon.spy();

        this.bleDriver.close.yields('ERROR!');

        this.adapter.on('adapterStateChanged', stateChangeCallback);
        this.adapter.on('error', errorCallback);

        this.adapter.open({'baudRate': 115211, 'parity': 'none', 'flowControl': 'uhh'}, (err) => {
            if(err) {
                assert.fail('There should be no error');
            }

            this.adapter.close(function(err) {
                assert.equal(err, 'ERROR!');
                checkIfCalledStub();
            });
        });

        sinon.assert.calledOnce(checkIfCalledStub);

        // 1: UART settings, 2: opening driver, 3: closing the driver
        assert.equal(stateChangeCallback.callCount, 3);

        let stateCallbackArgs = stateChangeCallback.lastCall.args;
        assert.equal(stateCallbackArgs[0].available, false);
    });
});

describe('adapter.getAdapterState', function() {
    beforeEach(function() {
        this.clock = sinon.useFakeTimers();

        this.bleDriver =
        {
            get_adapters: sinon.stub(),
            open: sinon.stub(),
            get_version: sinon.stub(),
            gap_get_device_name: sinon.stub(),
            gap_get_address: sinon.stub(),
            close: sinon.stub()
        };

        this.bleDriver.get_adapters.yields(undefined, [{ serialNumber: 'test', comName: '6' }]);
        this.bleDriver.open.yields(undefined);
        this.bleDriver.get_version.yields('991.911', undefined);
        this.bleDriver.gap_get_device_name.yields('Octopus', undefined);
        this.bleDriver.gap_get_address.yields('FF:FF:FF:FF:FF:FF', undefined);
        this.bleDriver.close.yields(undefined);

        // Provide an array of adapters for the first call
        var adapterFactory = new AdapterFactory(this.bleDriver);
        this.adapter = adapterFactory.getAdapters().test;
    });

    afterEach(function() {
        this.clock.restore();
    });

    it('should provide information from the driver and device', function() {
        let checkIfCalledStub = sinon.spy();

        this.adapter.open({'baudRate': 115211, 'parity': 'none', 'flowControl': 'yes please'}, (err) => {
        });

        this.adapter.getAdapterState(function(err, adapterState) {
            checkIfCalledStub();

            assert.equal(adapterState.baudRate, 115211);
            assert.equal(adapterState.parity, 'none');
            assert.equal(adapterState.flowControl, 'yes please');
            assert.equal(adapterState.address, 'FF:FF:FF:FF:FF:FF');
            assert.equal(adapterState.firmwareVersion, '991.911');
            assert.equal(adapterState.name, 'Octopus');
            assert.equal(adapterState.available, true);
            assert.equal(adapterState.port, '6');
            // TODO: add instanceId check here ?
            assert.equal(adapterState.available, true);
            assert.equal(adapterState.scanning, false);
            assert.equal(adapterState.advertising, false);
            assert.equal(adapterState.connecting, false);
        });

        sinon.assert.calledOnce(checkIfCalledStub);
    });

    it('should emit error if not able to provide information from the driver and device', function() {
        let checkIfCalledStub = sinon.spy();
        let errorCallback = sinon.spy();

        this.adapter.open({'baudRate': 115211, 'parity': 'none', 'flowControl': 'yes please'}, (err) => {
        });

        this.bleDriver.get_version.yields(undefined, 'ONE ERROR!');

        this.adapter.on('error', errorCallback);

        this.adapter.getAdapterState(function(err, adapterState) {
            checkIfCalledStub();
            assert.equal(err.description, 'ONE ERROR!');
        });

        sinon.assert.calledOnce(checkIfCalledStub);
        sinon.assert.calledOnce(errorCallback);
    });
});