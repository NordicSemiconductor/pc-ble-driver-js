const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const sinon = require('sinon');

// Use old style 'function' here or else this.timeout won't work
describe('Connection', function(){
    this.timeout(10000);
    it('should be able to connect and disconnect without errors', (done)=>{
        console.log('env: ' + process.env.testPeripheral);
        const errorSpy = sinon.spy();
        testLib._adapter.once('error', errorSpy);
        testLib.connectToPeripheral(process.env.testPeripheral)
            .then(() =>{
                assert(!errorSpy.calledOnce);
                done();
            });
      });

});