jest.mock('fs', () => {});
jest.mock('jszip', () => {});

import Dfu from '../dfu';

describe('constructor', () => {

    describe('when initialized without adapter', () => {

        const constructorCall = () => {
            new Dfu();
        };

        it('throws missing argument error', () => {
            expect(constructorCall).toThrowError('Missing argument adapter.');
        });
    });

    describe('when initialized without zip file', () => {

        const constructorCall = () => {
            new Dfu({});
        };

        it('throws missing argument error', () => {
            expect(constructorCall).toThrowError('Missing argument zipFile.');
        });
    });

});
