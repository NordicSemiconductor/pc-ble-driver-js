cmake_minimum_required(VERSION 3.3)

# Name of the project (will be the name of the plugin)
project (pc-ble-driver-js)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(nrf-ble-driver 4.1.0 REQUIRED)

set(UECC_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src/uECC)

# Specify source files
file (GLOB SOURCE_FILES
    "src/adapter.cpp"
    "src/serialadapter.cpp"
    "src/common.cpp"
    "src/driver.cpp"
    "src/driver_gap.cpp"
    "src/driver_gatt.cpp"
    "src/driver_gattc.cpp"
    "src/driver_gatts.cpp"
    "src/driver_uecc.cpp"
    "src/*.h"
)

file (GLOB UECC_SOURCE_FILES
    "src/uECC/*.c"
)

# Force .c files to be compiled with the C++ compiler
set_source_files_properties(
    ${UECC_SOURCE_FILES}
    PROPERTIES
    LANGUAGE CXX
)

# Build the pc-ble-driver as a static library
add_definitions(
    -DPC_BLE_DRIVER_STATIC
)

# Compiler specific
if(MSVC)
    include(${CMAKE_CURRENT_LIST_DIR}/cmake/msvc.cmake)
elseif(APPLE)
    include(${CMAKE_CURRENT_LIST_DIR}/cmake/apple.cmake)
else()
    # Linux
    include(${CMAKE_CURRENT_LIST_DIR}/cmake/gcc.cmake)
endif()

# There are several nrf-ble-driver libraies corresponding to SoftDevices. They
# expose a common API with some difference in features available. For now, we
# statially link to each one we need be creating several libraries, and select
# which resulting functions to use in JS code. We need more than one because
# nRF51 devices are not supported by SoftDevices v3 and above, but we need later
# SoftDevices for features for nRF52.
#
# Compile a node library with SD API v2 for nRF51, and one with v3 for nRF52.
foreach(SD_API_VER "2" "3")
    set(CURRENT_TARGET pc-ble-driver-js-sd_api_v${SD_API_VER})

    add_library(${CURRENT_TARGET} SHARED ${SOURCE_FILES} ${UECC_SOURCE_FILES})

    # This line will give our library file a .node extension without any "lib" prefix
    set_target_properties(${CURRENT_TARGET}
        PROPERTIES
        COMPILE_FLAGS "${CMAKE_CXX_FLAGS} -DBUILDING_NODE_EXTENSION"
        PREFIX ""
        SUFFIX ".node")

    set_target_properties(${CURRENT_TARGET} PROPERTIES COMPILE_OPTIONS -DNRF_SD_BLE_API_VERSION=${SD_API_VER})

    target_include_directories(${CURRENT_TARGET} PRIVATE ${CMAKE_JS_INC} ${UECC_INCLUDE_DIR})

    if(WIN32)
        # suppress C4251 v8/msvc related warning, for more info: https://github.com/nodejs/node/pull/15570
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /wd4251")

        target_include_directories(${CURRENT_TARGET} PRIVATE "${CMAKE_JS_INC}/win")
        set_target_properties(${CURRENT_TARGET} PROPERTIES COMPILE_DEFINITIONS "_CRT_SECURE_NO_WARNINGS")
    elseif(APPLE)
        target_link_libraries(${CURRENT_TARGET} "-framework CoreFoundation")
        target_link_libraries(${CURRENT_TARGET} "-framework IOKit")
        set_property(TARGET ${CURRENT_TARGET} PROPERTY MACOSX_RPATH ON)
    else()
        # Assume Linux
        target_link_libraries(${CURRENT_TARGET} "udev")
    endif()

    target_link_libraries(${CURRENT_TARGET} PRIVATE ${CMAKE_JS_LIB} nrf::nrf_ble_driver_sd_api_v${SD_API_VER}_static)
endforeach(SD_API_VER)
