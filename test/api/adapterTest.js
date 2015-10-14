'use strict';

var  sinon = require('sinon');
var assert = require('assert');
var lolex = require('lolex');

var clock = lolex.install();

var proxyquire = require('proxyquire');

var adapterFactory = require('../../api/adapterFactory.js');

describe('AdapterFactory', function() {
    var bleDriver;
    var addedSpy;
    var removedSpy;
    var errorSpy;
    var adapterFactoryInstance;

    beforeEach(function() {
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

    it('should provide a callback with list of adapters received from driver', function () {
        var adapters = adapterFactoryInstance.getAdapters();
        assert.equal(Object.keys(adapters).length, 0);
    });

    it('should provide an event when a new adapter is added to the computer', function() {
        bleDriver.get_adapters.yields(undefined,
                    [{ serialNumber: 'test2222', comNumber: '6' }]);

        clock.tick(5001);

        sinon.assert.calledOnce(addedSpy);
        sinon.assert.notCalled(removedSpy);
        sinon.assert.notCalled(errorSpy);

        var adapters = adapterFactoryInstance.getAdapters();
        assert.equal(Object.keys(adapters).length, 1);
    });

    it('should provide an event when an adapter is removed from the computer', function() {
        var adapterA = { serialNumber: 'test1234', comNumber: '5' };
        bleDriver.get_adapters.yields(undefined, [adapterA]);

        clock.tick(5001);

        bleDriver.get_adapters.yields(undefined, []);

        addedSpy.reset();
        removedSpy.reset();
        errorSpy.reset();

        clock.tick(5001);

        sinon.assert.notCalled(addedSpy);
        sinon.assert.calledOnce(removedSpy);
        sinon.assert.notCalled(errorSpy);

        var adapters = adapterFactoryInstance.getAdapters();
        assert.equal(Object.keys(adapters).length, 0);
    });
});