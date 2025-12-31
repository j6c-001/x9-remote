cmake_minimum_required(VERSION 4.1)
project(x9)

set(CMAKE_CXX_STANDARD 20)

# Put the executable into /bin
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)

add_executable(x9 main.cpp)
target_link_libraries(x9 PRIVATE Threads::Threads OpenSSL::SSL OpenSSL::Crypto)
target_compile_definitions(x9 PRIVATE CPPHTTPLIB_OPENSSL_SUPPORT)

# Resources to copy into the build directory each time we build
set(RESOURCE_FILES
        index.html
        style.css
        app.js
        manifest.json
        sw.js
        icon-180.png
        icon-192.png
        icon-512.png
)

# Collect all vu_*.webp files
file(GLOB VU_IMAGES RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} "vu_*.webp")
list(APPEND RESOURCE_FILES ${VU_IMAGES})

foreach(FILENAME ${RESOURCE_FILES})
    add_custom_command(TARGET x9 POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_if_different
            ${CMAKE_CURRENT_SOURCE_DIR}/${FILENAME}
            ${CMAKE_BINARY_DIR}/${FILENAME}
            COMMENT "Copying ${FILENAME} to build directory"
    )
endforeach()
