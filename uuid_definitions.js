/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

 {
    // Start Predefined names
    //
    {'uuid': 0x1800, 'name': 'GenericAccessProfile'},
    {'uuid': 0x1801, 'name': 'GenericAttributeProfile'},
    // GAP Defined Attribute UUIDs
    {'uuid': 0x2A00, 'name': 'DeviceName'},
    {'uuid': 0x001E, 'name': 'VersionInformation'},
    {'uuid': 0x2A01, 'name': '#Icon'},
    {'uuid': 0x2A01, 'name': 'Appearance'},
    {'uuid': 0x0020, 'name': 'VendorAndProductInformation'},
    {'uuid': 0x2A04, 'name': 'SlavePreferredConnectionParameters'},
    //GATT Defined Attribute UUIDs
    //{'uuid': 0x2800, 'name': 'ServiceGroup'},
    {'uuid': 0x2800, 'name': 'PrimaryService'},
    {'uuid': 0x2801, 'name': 'SecondaryService'},
    {'uuid': 0x2802, 'name': 'Include'},
    {'uuid': 0x2803, 'name': 'CharacteristicDeclaration'},
    {'uuid': 0x0017, 'name': 'AttributeVersionInformation'},
    {'uuid': 0x0018, 'name': 'AttributeHandlesChanged'},
    {'uuid': 0x2A05, 'name': 'ServiceChanged'},
    {'uuid': 0x001A, 'name': 'AttributeOpcodesSupported'},
    {'uuid': 0x001B, 'name': 'NumberOfPrepareWriteValuesSupported'},
    {'uuid': 0x2901, 'name': 'CharacteristicUserDescription'},
    {'uuid': 0x2904, 'name': 'CharacteristicFormat'},
    {'uuid': 0x2905, 'name': 'CharacteristicAggregateFormat'},
    {'uuid': 0x2906, 'name': 'Characteristic Valid Range'},
    {'uuid': 0x2900, 'name': 'CharacteristicExtendedProperties'},
    {'uuid': 0x2902, 'name': 'ClientCharacteristicConfiguration'},
    {'uuid': 0x2903, 'name': 'ServerCharacteristicConfiguration'},
    // Attribute protocol test
    {'uuid': 0x0024, 'name': 'AttributeProtocolTest'},
    {'uuid': 0x0025, 'name': 'ReadWriteTestOpen'},
    {'uuid': 0x0026, 'name': 'ReadWriteTestAuthenticated'},
    {'uuid': 0x0027, 'name': 'BroadcastTest'},
    {'uuid': 0x0028, 'name': 'AuthenticatedReadTest'},
    // End Predefined names

    // "Userdefined" names
    {'uuid': 0x180A, 'name': 'Device Information'},
    {'uuid': 0x1809, 'name': 'Health Thermometer'},
    {'uuid': 0x1802, 'name': 'Immediate Alert'},
    {'uuid': 0x1803, 'name': 'Link Loss'},
    {'uuid': 0x1804, 'name': 'TxPower'},
    {'uuid': 0x1805, 'name': 'Current Time'},
    {'uuid': 0x1807, 'name': 'DST Change'},
    {'uuid': 0x1800, 'name': 'Generic Access'},
    {'uuid': 0x1801, 'name': 'Generic Attribute'},
    {'uuid': 0x180B, 'name': 'Network Availability'},
    {'uuid': 0x1806, 'name': 'Reference Time Update'},
    {'uuid': 0x180C, 'name': 'Watchdog'},
    {'uuid': 0x180D, 'name': 'Heart Rate'},
    {'uuid': 0x180F, 'name': 'BatteryService'},
    {'uuid': 0x1812, 'name': 'HID Service'},
    {'uuid': 0x1814, 'name': 'Running Speed and Cadence'},
    {'uuid': 0x2A53, 'name': 'RSC Measurement'},
    {'uuid': 0x2A54, 'name': 'RSC Feature'},
    {'uuid': 0x1816, 'name': 'Cycling Speed and Cadence'},
    {'uuid': 0x2A5B, 'name': 'CSC Measurement'},
    {'uuid': 0x2A5C, 'name': 'CSC Feature'},
    {'uuid': 0x2A5D, 'name': 'SC Sensor Location'},
    {'uuid': 0x2A55, 'name': 'SC Control Point'},
    {'uuid': 0x2A07, 'name': 'TxPowerLevel'},
    {'uuid': 0x180B, 'name': 'NetworkAvailability'},
    {'uuid': 0x180e, 'name': 'Phone Alert Status'},
    {'uuid': 0x1808, 'name': 'Glucose'},
    {'uuid': 0x1810, 'name': 'Blood Pressure'},
    {'uuid': 0x2A08, 'name': 'Date Time'},
    {'uuid': 0x2A26, 'name': 'Firmware Revision String'},
    {'uuid': 0x2A27, 'name': 'Hardware Revision String'},
    {'uuid': 0x2A2A, 'name': 'IEEE Certification Data'},
    {'uuid': 0x2A1E, 'name': 'Intermediate Temperature'},
    {'uuid': 0x2A29, 'name': 'Manufacturer Name String'},
    {'uuid': 0x2A21, 'name': 'Measurement Interval'},
    {'uuid': 0x2A24, 'name': 'Model Number String'},
    {'uuid': 0x2A25, 'name': 'Serial Number String'},
    {'uuid': 0x2A28, 'name': 'Software Revision String'},
    {'uuid': 0x2A23, 'name': 'System ID'},
    {'uuid': 0x2A1C, 'name': 'Temperature Measurement'},
    {'uuid': 0x2A1D, 'name': 'Temperature Type'},
    {'uuid': 0x2A06, 'name': 'AlertLevel'},
    {'uuid': 0x2A19, 'name': 'Battery Level'},
    {'uuid': 0x2A1B, 'name': 'Battery Level State'},
    {'uuid': 0x2A1A, 'name': 'Battery State'},
    {'uuid': 0x2A35, 'name': 'Blood Pressure Measurement'},
    {'uuid': 0x2A18, 'name': 'Boolean'},
    {'uuid': 0x2A2B, 'name': 'Current Time'},
    {'uuid': 0x2A09, 'name': 'Day of Week'},
    {'uuid': 0x2A0D, 'name': 'Daylight Saving Time'},
    {'uuid': 0x2A2C, 'name': 'Elevation'},
    {'uuid': 0x2A0B, 'name': 'Exact Time 100'},
    {'uuid': 0x2A0C, 'name': 'Exact Time 256'},
    {'uuid': 0x2A39, 'name': 'Heart Rate Control Point'},
    {'uuid': 0x2A37, 'name': 'Heart Rate Measurement'},
    {'uuid': 0x2A38, 'name': 'Heart Rate Sensor Location'},
    {'uuid': 0x2A33, 'name': 'HID Version'},
    {'uuid': 0x2A4E, 'name': 'HID Protocol Mode'},
    {'uuid': 0x2A4D, 'name': 'HID Report'},
    {'uuid': 0x2908, 'name': 'HID Report Reference'},
    {'uuid': 0x2A4B, 'name': 'HID Report Map'},
    {'uuid': 0x2907, 'name': 'HID External Report Reference'},
    {'uuid': 0x2A22, 'name': 'HID Boot Keyboard Input Report'},
    {'uuid': 0x2A32, 'name': 'HID Boot Keyboard Output Report'},
    {'uuid': 0x2A33, 'name': 'HID Boot Mouse Input Report'},
    {'uuid': 0x2A4A, 'name': 'HID Information'},
    {'uuid': 0x2A4C, 'name': 'HID Control Point'},
    {'uuid': 0x2A36, 'name': 'Intermediate Blood Pressure'},
    {'uuid': 0x2A2D, 'name': 'Latitude'},
    {'uuid': 0x2A0F, 'name': 'Local Time Information'},
    {'uuid': 0x2A2E, 'name': 'Longitude'},
    {'uuid': 0x2A2F, 'name': 'Position 2D'},
    {'uuid': 0x2A30, 'name': 'Position 3D'},
    {'uuid': 0x2A32, 'name': 'Product ID'},
    {'uuid': 0x2A14, 'name': 'Reference Time Information'},
    {'uuid': 0x2A10, 'name': 'Secondary Time Zone'},
    {'uuid': 0x2A1F, 'name': 'Temperature in Celsius'},
    {'uuid': 0x2A20, 'name': 'Temperature in Fahrenheit'},
    {'uuid': 0x2A0A, 'name': 'Time'},
    {'uuid': 0x2A12, 'name': 'Time Accuracy'},
    {'uuid': 0x2A15, 'name': 'Time Broadcast'},
    {'uuid': 0x2A13, 'name': 'Time Source'},
    {'uuid': 0x2A16, 'name': 'Time Update Control Point'},
    {'uuid': 0x2A17, 'name': 'Time Update State'},
    {'uuid': 0x2A11, 'name': 'Time with Daylight Saving Time'},
    {'uuid': 0x2A0E, 'name': 'Time Zone'},
    {'uuid': 0x2A31, 'name': 'Vendor ID'},
    {'uuid': 0x2A34, 'name': 'Vendor ID Source'},
    {'uuid': 0x2a40, 'name': 'Ringer Control Point'},
    {'uuid': 0x2a3f, 'name': 'Alert Status'},
    {'uuid': 0x2a41, 'name': 'Ringer Setting'},
    {'uuid': 0x2a52, 'name': 'Glucose Control Point'},
    {'uuid': 0x2a18, 'name': 'Glucose Measurement'},
    {'uuid': 0x2a51, 'name': 'Glucose Feature'},
    {'uuid': 0x2a49, 'name': 'Blood Pressure Feature'},
    {'uuid': 0x1815, 'name': 'Automation IO'},
    {'uuid': 0x2A56, 'name': 'Digital'},
    {'uuid': 0x2A58, 'name': 'Analog'},
    {'uuid': 0x2A5A, 'name': 'Aggregate'},
    {'uuid': 0x6E400001B5A3F393E0A9E50E24DCCA9E, 'name': 'UART over BLE'},
    {'uuid': 0x6E400002B5A3F393E0A9E50E24DCCA9E, 'name': 'UART RX'},
    {'uuid': 0x6E400003B5A3F393E0A9E50E24DCCA9E, 'name': 'UART TX'},
    {'uuid': 0x000015301212EFDE1523785FEABCD123, 'name': 'DFU'},
    {'uuid': 0x000015311212EFDE1523785FEABCD123, 'name': 'DFU Control Point'},
    {'uuid': 0x000015321212EFDE1523785FEABCD123, 'name': 'DFU Packet'},
    {'uuid': 0x7905F431B5CE4E99A40F4B1E122D00D0, 'name': 'ANCS'},
    {'uuid': 0x9FBF120D630142D98C5825E699A21DBD, 'name': 'ANCS Notification Source'},
    {'uuid': 0x69D1D8F345E149A898219BBDFDAAD9D9, 'name': 'ANCS Control Point'},
    {'uuid': 0x22EAC6E924D64BB5BE44B36ACE7C7BFB, 'name': 'ANCS Data Source'}
}
