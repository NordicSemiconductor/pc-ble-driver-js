'use strict';

class AdType {
    /**
     * @brief Converts advertisement object to buffer
     *
     */
    static convertToBuffer(obj) {
        let buffer = new Buffer(32);
        let bufferPosition = 0;

        var keys = Object.keys(obj);

        for(let key of keys) {
            //console.log('key:' + key);
        }

        return buffer;
    }

    /**
     * @brief Generates a decoded representation of the data in the buffer
     *
     */
    static convertFromBuffer(buffer) {

    }
}


module.exports = AdType;