const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const sinon = require('sinon');

// Use old style 'function' here or else this.timeout won't work
describe('Adapter Connect', function() {
    this.timeout(10000);
    it('should be able to connect and disconnect without errors', (done)=> {
        const errorSpy = sinon.spy();
        testLib._adapter.once('error', errorSpy);
        testLib.connectToPeripheral(process.env.testPeripheral)
            .then((device) => {
                assert(!errorSpy.calledOnce);
                assert.equal(device.address, process.env.testPeripheral);
                return device;
            })
            .then((device) => {
                testLib.disconnect(device.instanceId);
                return device;
            })
            .then((device) => {
                assert(!errorSpy.calledOnce);
                assert.equal(device.address, process.env.testPeripheral);
                done();
            })
            .catch(done);
    });

    it('should be able to cancel a connect. connect handler should not be called', (done) => {
        const errorSpy = sinon.spy();
        testLib._adapter.once('error', errorSpy);

        testLib.connectToPeripheral(process.env.testPeripheral)
            .then((device) => {
                assert(!errorSpy.calledOnce);
                assert(false, 'should not reach connect handler when canceling connect');
                done();
            });
        testLib.cancelConnect()
            .then(() => {
            })
            .catch(done);

        setTimeout(done, 1000); // Let the event loop run a while to catch a(n erronous) connect event.
    });

 
});
