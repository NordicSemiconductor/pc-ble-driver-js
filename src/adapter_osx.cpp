/**
 *
 *
 *
 * Portions of this code is from the node-serialport project: https://github.com/voodootikigod/node-serialport
 *
 * The license that code is release under is:
 *
 * Copyright 2010, 2011, 2012 Christopher Williams. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 */


#include "adapter.h"
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <termios.h>

#include <AvailabilityMacros.h>
#include <sys/param.h>
#include <IOKit/IOKitLib.h>
#include <IOKit/IOCFPlugIn.h>
#include <IOKit/usb/IOUSBLib.h>
#include <IOKit/serial/IOSerialKeys.h>

uv_mutex_t list_mutex;
Boolean lockInitialised = FALSE;
const char* TTY_PATH_PREFIX = "/dev/tty.";

#if defined(MAC_OS_X_VERSION_10_4) && (MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_4)
#include <sys/ioctl.h>
#include <IOKit/serial/ioss.h>
#include <errno.h>
#endif

typedef struct SerialDevice {
    char port[MAXPATHLEN];
    char locationId[MAXPATHLEN];
    char vendorId[MAXPATHLEN];
    char productId[MAXPATHLEN];
    char manufacturer[MAXPATHLEN];
    char serialNumber[MAXPATHLEN];
} stSerialDevice;

typedef struct DeviceListItem {
    struct SerialDevice value;
    struct DeviceListItem *next;
    int* length;
} stDeviceListItem;

// Function prototypes
static kern_return_t FindModems(io_iterator_t *matchingServices);
static io_registry_entry_t GetUsbDevice(char *pathName);
static stDeviceListItem* GetSerialDevices();

static kern_return_t FindModems(io_iterator_t *matchingServices)
{
    kern_return_t     kernResult;
    CFMutableDictionaryRef  classesToMatch;
    classesToMatch = IOServiceMatching(kIOSerialBSDServiceValue);
    if (classesToMatch != NULL)
    {
        CFDictionarySetValue(classesToMatch,
                             CFSTR(kIOSerialBSDTypeKey),
                             CFSTR(kIOSerialBSDAllTypes));
    }

    kernResult = IOServiceGetMatchingServices(kIOMasterPortDefault, classesToMatch, matchingServices);

    return kernResult;
}

static io_registry_entry_t GetUsbDevice(char* pathName)
{
    io_registry_entry_t device = 0;

    CFMutableDictionaryRef classesToMatch = IOServiceMatching(kIOUSBDeviceClassName);
    if (classesToMatch != NULL)
    {
        io_iterator_t matchingServices;
        kern_return_t kernResult = IOServiceGetMatchingServices(kIOMasterPortDefault, classesToMatch, &matchingServices);
        if (KERN_SUCCESS == kernResult)
        {
            io_service_t service;
            Boolean deviceFound = false;

            while ((service = IOIteratorNext(matchingServices)) && !deviceFound)
            {
                CFStringRef bsdPathAsCFString = (CFStringRef) IORegistryEntrySearchCFProperty(service, kIOServicePlane, CFSTR(kIOCalloutDeviceKey), kCFAllocatorDefault, kIORegistryIterateRecursively);

                if (bsdPathAsCFString)
                {
                    Boolean result;
                    char    bsdPath[MAXPATHLEN];

                    // Convert the path from a CFString to a C (NULL-terminated)
                    result = CFStringGetCString(bsdPathAsCFString,
                                                bsdPath,
                                                sizeof(bsdPath),
                                                kCFStringEncodingUTF8);

                    CFRelease(bsdPathAsCFString);

                    if (result && (strcmp(bsdPath, pathName) == 0))
                    {
                        deviceFound = true;
                        device = service;
                    }
                    else
                    {
                       // Release the object which are no longer needed
                       (void) IOObjectRelease(service);
                    }
                }
            }
            // Release the iterator.
            IOObjectRelease(matchingServices);
        }
    }

    return device;
}

static void ExtractUsbInformation(stSerialDevice *serialDevice, IOUSBDeviceInterface  **deviceInterface)
{
    kern_return_t kernResult;
    UInt32 locationID;
    kernResult = (*deviceInterface)->GetLocationID(deviceInterface, &locationID);
    if (KERN_SUCCESS == kernResult)
    {
        snprintf(serialDevice->locationId, 11, "0x%08x", locationID);
    }

    UInt16 vendorID;
    kernResult = (*deviceInterface)->GetDeviceVendor(deviceInterface, &vendorID);
    if (KERN_SUCCESS == kernResult)
    {
        snprintf(serialDevice->vendorId, 7, "0x%04x", vendorID);
    }

    UInt16 productID;
    kernResult = (*deviceInterface)->GetDeviceProduct(deviceInterface, &productID);
    if (KERN_SUCCESS == kernResult)
    {
        snprintf(serialDevice->productId, 7, "0x%04x", productID);
    }
}

static stDeviceListItem* GetSerialDevices()
{
    kern_return_t kernResult;
    io_iterator_t serialPortIterator;
    char bsdPath[MAXPATHLEN];

    FindModems(&serialPortIterator);

    io_service_t modemService;
    kernResult = KERN_FAILURE;
    Boolean modemFound = false;

    // Initialize the returned path
    *bsdPath = '\0';

    stDeviceListItem* devices = NULL;
    stDeviceListItem* lastDevice = NULL;
    int length = 0;

    while ((modemService = IOIteratorNext(serialPortIterator)))
    {
        CFTypeRef bsdPathAsCFString;

        bsdPathAsCFString = IORegistryEntrySearchCFProperty(modemService, kIOServicePlane, CFSTR(kIOCalloutDeviceKey), kCFAllocatorDefault, kIORegistryIterateRecursively);

        if (bsdPathAsCFString)
        {
            Boolean result;

            // Convert the path from a CFString to a C (NUL-terminated)

            result = CFStringGetCString((CFStringRef) bsdPathAsCFString,
                                        bsdPath,
                                        sizeof(bsdPath),
                                        kCFStringEncodingUTF8);
            CFRelease(bsdPathAsCFString);

            if (result)
            {
                stDeviceListItem *deviceListItem = (stDeviceListItem*) malloc(sizeof(stDeviceListItem));
                stSerialDevice *serialDevice = &(deviceListItem->value);

                // Apparently the cu.X prefix is wrong, it should be tty.X. This is a hack to do that.
                strcpy(serialDevice->port, TTY_PATH_PREFIX);
                strcpy(serialDevice->port + strlen(TTY_PATH_PREFIX), bsdPath + strlen("/dev/cu."));

                memset(serialDevice->locationId, 0, sizeof(serialDevice->locationId));
                memset(serialDevice->vendorId, 0, sizeof(serialDevice->vendorId));
                memset(serialDevice->productId, 0, sizeof(serialDevice->productId));
                
                serialDevice->manufacturer[0] = '\0';
                serialDevice->serialNumber[0] = '\0';
                deviceListItem->next = NULL;
                deviceListItem->length = &length;

                if (devices == NULL) {
                    devices = deviceListItem;
                }
                else {
                    lastDevice->next = deviceListItem;
                }

                lastDevice = deviceListItem;
                length++;

                modemFound = true;
                kernResult = KERN_SUCCESS;

                uv_mutex_lock(&list_mutex);

                io_registry_entry_t device = GetUsbDevice(bsdPath);

                if (device) {
                    CFStringRef manufacturerAsCFString = (CFStringRef) IORegistryEntrySearchCFProperty(device,
                                          kIOServicePlane,
                                          CFSTR(kUSBVendorString),
                                          kCFAllocatorDefault,
                                          kIORegistryIterateRecursively);

                    if (manufacturerAsCFString)
                    {
                        Boolean result;
                        char    manufacturer[MAXPATHLEN];

                        // Convert from a CFString to a C (NUL-terminated)
                        result = CFStringGetCString(manufacturerAsCFString,
                                                    manufacturer,
                                                    sizeof(manufacturer),
                                                    kCFStringEncodingUTF8);

                        if (result) {
                          strcpy(serialDevice->manufacturer, manufacturer);
                        }

                        CFRelease(manufacturerAsCFString);
                    }

                    CFStringRef serialNumberAsCFString = (CFStringRef) IORegistryEntrySearchCFProperty(device,
                                          kIOServicePlane,
                                          CFSTR(kUSBSerialNumberString),
                                          kCFAllocatorDefault,
                                          kIORegistryIterateRecursively);

                    if (serialNumberAsCFString)
                    {
                        Boolean result;
                        char    serialNumber[MAXPATHLEN];

                        // Convert from a CFString to a C (NUL-terminated)
                        result = CFStringGetCString(serialNumberAsCFString,
                                                    serialNumber,
                                                    sizeof(serialNumber),
                                                    kCFStringEncodingUTF8);

                        if (result) {
                          strcpy(serialDevice->serialNumber, serialNumber);
                        }

                        CFRelease(serialNumberAsCFString);
                    }

                    IOCFPlugInInterface **plugInInterface = NULL;
                    SInt32        score;
                    HRESULT       res;

                    IOUSBDeviceInterface  **deviceInterface = NULL;

                    kernResult = IOCreatePlugInInterfaceForService(device, kIOUSBDeviceUserClientTypeID, kIOCFPlugInInterfaceID,
                                                           &plugInInterface, &score);

                    if ((kIOReturnSuccess != kernResult) || !plugInInterface) {
                        continue;
                    }

                    // Use the plugin interface to retrieve the device interface.
                    res = (*plugInInterface)->QueryInterface(plugInInterface, CFUUIDGetUUIDBytes(kIOUSBDeviceInterfaceID),
                                                             (LPVOID*) &deviceInterface);

                    // Now done with the plugin interface.
                    (*plugInInterface)->Release(plugInInterface);

                    if (res || deviceInterface == NULL) {
                        continue;
                    }

                    // Extract the desired Information
                    ExtractUsbInformation(serialDevice, deviceInterface);

                    // Release the Interface
                    (*deviceInterface)->Release(deviceInterface);

                    // Release the device
                    (void) IOObjectRelease(device);
                }

                uv_mutex_unlock(&list_mutex);
            }
        }

        // Release the io_service_t now that we are done with it.
        (void) IOObjectRelease(modemService);
    }

    IOObjectRelease(serialPortIterator);  // Release the iterator.

    return devices;
}

void GetAdapterList(uv_work_t* req) {
    if(!lockInitialised)
    {
        uv_mutex_init(&list_mutex);
        lockInitialised = TRUE;
    }

    AdapterListBaton* data = static_cast<AdapterListBaton*>(req->data);

    stDeviceListItem* devices = GetSerialDevices();

    if (*(devices->length) > 0)
    {
        stDeviceListItem* next = devices;

        for (int i = 0, len = *(devices->length); i < len; i++) 
        {
            stSerialDevice device = (* next).value;

            if(strcmp(device.manufacturer,"SEGGER") == 0)
            {
                AdapterListResultItem* resultItem = new AdapterListResultItem();

                resultItem->comName = device.port;

                if (device.locationId != NULL) {
                    resultItem->locationId = device.locationId;
                }
                if (device.vendorId != NULL) {
                    resultItem->vendorId = device.vendorId;
                }
                if (device.productId != NULL) {
                    resultItem->productId = device.productId;
                }
                if (device.manufacturer != NULL) {
                    resultItem->manufacturer = device.manufacturer;
                }
                if (device.serialNumber != NULL) {
                    resultItem->serialNumber = device.serialNumber;
                }

                data->results.push_back(resultItem);
            }

            stDeviceListItem* current = next;

            if (next->next != NULL)
            {
                next = next->next;
            }

            free(current);
        }
    }
}
