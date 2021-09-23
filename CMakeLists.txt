cmake_minimum_required(VERSION 3.12)

if(DEFINED ENV{VCPKG_ROOT} AND NOT DEFINED CMAKE_TOOLCHAIN_FILE)
  set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake"
      CACHE STRING "")
endif()

# Name of the project (will be the name of the plugin)
project (pc-ble-driver-js)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(nrf-ble-driver 4.1.4 EXACT REQUIRED)

if (NOT DEFINED CMAKE_JS_INC)
    message (
        FATAL_ERROR
        "-DCMAKE_JS_INC (plus -DCMAKE_JS_LIB on Windows) must be "
        "provided. To build this project, run `npm install` "
        "instead of running cmake directly."
    )
endif ()

set(UECC_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src/uECC)

file (GLOB SOURCE_FILES
    "src/adapter.cpp"
    "src/adapter.h"
    "src/circular_fifo.h"
    "src/circular_fifo_unsafe.h"
    "src/common.cpp"
    "src/common.h"
    "src/driver.cpp"
    "src/driver.h"
    "src/driver_gap.cpp"
    "src/driver_gap.h"
    "src/driver_gatt.cpp"
    "src/driver_gatt.h"
    "src/driver_gattc.cpp"
    "src/driver_gattc.h"
    "src/driver_gatts.cpp"
    "src/driver_gatts.h"
    "src/driver_uecc.cpp"
    "src/driver_uecc.h"
    "src/serialadapter.cpp"
    "src/serialadapter.h"
    "src/serialadapter_linux.h"
    "src/serialadapter_osx.h"
)

file (GLOB UECC_SOURCE_FILES
    "src/uECC/uECC.c"
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
# Compile a node library with SD API v2 for nRF51, and one with v5 for nRF52.
foreach(SD_API_VER "2" "5")
    set(CURRENT_TARGET pc-ble-driver-js-sd_api_v${SD_API_VER})

    add_library(${CURRENT_TARGET} SHARED ${SOURCE_FILES} ${UECC_SOURCE_FILES} ${CMAKE_JS_SRC})

    # Since the binding is very old, it will not handle making deprecation warnings (they turn into errors)
    # When the binding is updated, the following defines should be set
    # -DV8_DEPRECATION_WARNINGS=1 -DV8_DEPRECATION_WARNINGS -DV8_IMMINENT_DEPRECATION_WARNINGS

    set(COMPILE_FLAGS "-DUSING_UV_SHARED=1 -DUSING_V8_SHARED=1")

    # If using Electron, add specific compile flags as described here:
    # https://github.com/cmake-js/cmake-js/issues/222#issuecomment-732746074
    if("${NODE_RUNTIME}" STREQUAL "electron")
        if("${NODE_RUNTIMEVERSION}" VERSION_GREATER_EQUAL "9.0.0")
            if("${NODE_ARCH}" STREQUAL "x64")
                # If the binding is compiled for 64 bit arch, pointer compression is used in Electron:
                # https://github.com/electron/electron/pull/21468/files
                # More information: https://v8.dev/blog/pointer-compression
                set(COMPILE_FLAGS "${COMPILE_FLAGS} -DV8_COMPRESS_POINTERS")
            endif()

            set(COMPILE_FLAGS "${COMPILE_FLAGS} -DV8_31BIT_SMIS_ON_64BIT_ARCH")

            if("${NODE_RUNTIMEVERSION}" VERSION_GREATER_EQUAL "11.0.0")
                set(COMPILE_FLAGS "${COMPILE_FLAGS} -DV8_REVERSE_JSARGS")
            endif()
        endif()
    endif()

    set_target_properties(${CURRENT_TARGET}
        PROPERTIES
        COMPILE_FLAGS "${CMAKE_CXX_FLAGS} ${COMPILE_FLAGS}"
        COMPILE_OPTIONS -DNRF_SD_BLE_API_VERSION=${SD_API_VER}
        PREFIX ""
        SUFFIX ".node")

    target_include_directories(${CURRENT_TARGET} PRIVATE ${CMAKE_JS_INC} ${UECC_INCLUDE_DIR})

    if(WIN32)
        # Copied flags from node-gyp: 
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /wd4351 /wd4355 /wd4800 /wd4251 /wd4275 /wd4244 /wd4267 /EHsc")
        set_target_properties(${CURRENT_TARGET} PROPERTIES COMPILE_DEFINITIONS "_CRT_SECURE_NO_WARNINGS")
    elseif(APPLE)
        target_link_libraries(${CURRENT_TARGET} PRIVATE "-framework CoreFoundation")
        target_link_libraries(${CURRENT_TARGET} PRIVATE "-framework IOKit")
        set_property(TARGET ${CURRENT_TARGET} PROPERTY MACOSX_RPATH ON)
    else()
        # Assume Linux
        target_link_libraries(${CURRENT_TARGET} PRIVATE "udev")
    endif()

    target_link_libraries(${CURRENT_TARGET} PRIVATE ${CMAKE_JS_LIB} nrf::nrf_ble_driver_sd_api_v${SD_API_VER}_static)

    get_target_property(ble_driver_if_dir nrf::nrf_ble_driver_sd_api_v${SD_API_VER}_static INTERFACE_INCLUDE_DIRECTORIES)
    set(CONNECTIVITY_SD_API_V${SD_API_VER}_PATH "${ble_driver_if_dir}/../../share/nrf-ble-driver/hex/sd_api_v${SD_API_VER}/*.hex" CACHE FILEPATH "Path with wildcards to connectivity firmware files")
    file(GLOB_RECURSE connectivity_firmware ${CONNECTIVITY_SD_API_V${SD_API_VER}_PATH})

    set_property(
        TARGET ${CURRENT_TARGET}
        PROPERTY RESOURCE ${connectivity_firmware}
    )

    set(CMAKE_INSTALL_PREFIX ${CMAKE_CURRENT_SOURCE_DIR}/build/${CMAKE_BUILD_TYPE})
    install(
        TARGETS ${CURRENT_TARGET}
            RUNTIME DESTINATION ${CMAKE_INSTALL_PREFIX}
            LIBRARY DESTINATION ${CMAKE_INSTALL_PREFIX}
            RESOURCE DESTINATION "${CMAKE_INSTALL_PREFIX}/pc-ble-driver/hex/"
    )
endforeach(SD_API_VER)
