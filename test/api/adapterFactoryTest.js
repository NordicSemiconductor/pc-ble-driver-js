'use strict';

var  sinon = require('sinon');
var assert = require('assert');

var proxyquire = require('proxyquire');

var adapterFactory = require('../../api/adapterFactory.js');

describe('AdapterFactory', function() {
    var bleDriver;

    var addedSpy;
    var removedSpy;
    var errorSpy;

    var adapterFactoryInstance;

    beforeEach(function() {
        console.log('beforeEach called');

        this.clock = sinon.useFakeTimers();

        bleDriver =
        {
            get_adapters: sinon.stub()
        };

        // Provide an empty array adapters for the first call
        bleDriver.get_adapters.yields(undefined, []);
        adapterFactoryInstance = new adapterFactory(bleDriver);

        addedSpy = sinon.spy();
        removedSpy = sinon.spy();
        errorSpy = sinon.spy();

        adapterFactoryInstance.on('added', addedSpy);
        adapterFactoryInstance.on('removed', removedSpy);
        adapterFactoryInstance.on('error', errorSpy);
    });

    afterEach(function() {
        this.clock.restore();
    });

    it('should provide a list of adapters connected to the computer', function () {
        var adapters = adapterFactoryInstance.getAdapters();
        assert.equal(Object.keys(adapters).length, 0);
    });

    it('should provide an event when a new adapter is added to the computer', function() {
        bleDriver.get_adapters.yields(undefined,
                    [{ serialNumber: 'test2222', comNumber: '6' }]);

        this.clock.tick(5001);

        sinon.assert.calledOnce(addedSpy);
        sinon.assert.notCalled(removedSpy);
        sinon.assert.notCalled(errorSpy);

        var adapters = adapterFactoryInstance.getAdapters();
        assert.equal(Object.keys(adapters).length, 1);
    });

    it('should provide an event when an adapter is removed from the computer', function() {
        var adapterA = { serialNumber: 'test1234', comNumber: '5' };
        bleDriver.get_adapters.yields(undefined, [adapterA]);

        this.clock.tick(5001);

        bleDriver.get_adapters.yields(undefined, []);

        addedSpy.reset();
        removedSpy.reset();
        errorSpy.reset();

        this.clock.tick(5001);

        sinon.assert.notCalled(addedSpy);
        sinon.assert.calledOnce(removedSpy);
        sinon.assert.notCalled(errorSpy);

        var adapters = adapterFactoryInstance.getAdapters();
        assert.equal(Object.keys(adapters).length, 0);
    });
});

