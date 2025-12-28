#include "httplib.h"
#include <iostream>
#include <fstream>
#include <sstream>

std::string read_file(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) return "";
    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}

int main() {
    httplib::Server svr;

    auto serve_file = [](const std::string& filename, const std::string& content_type) {
        return [filename, content_type](const httplib::Request&, httplib::Response& res) {
            std::string content = read_file(filename);
            if (content.empty()) {
                content = read_file("../" + filename);
            }
            if (!content.empty()) {
                res.set_header("Cache-Control", "no-cache");
                res.set_content(content, content_type);
            } else {
                res.status = 404;
                res.set_content(filename + " not found", "text/plain");
            }
        };
    };

    svr.Get("/", serve_file("index.html", "text/html"));
    svr.Get("/manifest.json", serve_file("manifest.json", "application/json"));
    svr.Get("/sw.js", serve_file("sw.js", "application/javascript"));

    svr.set_mount_point("/", ".");

    std::cout << "Server started at http://localhost:8080" << std::endl;
    svr.listen("0.0.0.0", 8080);

    return 0;
}