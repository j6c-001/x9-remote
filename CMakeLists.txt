cmake_minimum_required(VERSION 4.1)
project(x9)

set(CMAKE_CXX_STANDARD 20)

find_package(Threads REQUIRED)

add_executable(x9 main.cpp)
target_link_libraries(x9 PRIVATE Threads::Threads)
