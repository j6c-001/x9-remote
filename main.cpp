#include "httplib.h"
#include <iostream>
#include <fstream>
#include <sstream>

std::string read_file(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
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
    svr.Get("/style.css", serve_file("style.css", "text/css"));
    svr.Get("/app.js", serve_file("app.js", "application/javascript"));
    svr.Get("/manifest.json", serve_file("manifest.json", "application/manifest+json"));
    svr.Get("/sw.js", serve_file("sw.js", "application/javascript"));

    svr.Get(R"(/vu_\d+\.webp)", [](const httplib::Request& req, httplib::Response& res) {
        std::string filename = req.path.substr(1);
        std::string content = read_file(filename);
        if (content.empty()) {
            content = read_file("../" + filename);
        }
        if (!content.empty()) {
            res.set_content(content, "image/webp");
        } else {
            res.status = 404;
            res.set_content(filename + " not found", "text/plain");
        }
    });

    svr.Get(R"(/icon-\d+\.png)", [](const httplib::Request& req, httplib::Response& res) {
        std::string filename = req.path.substr(1);
        std::string content = read_file(filename);
        if (content.empty()) {
            content = read_file("../" + filename);
        }
        if (!content.empty()) {
            res.set_content(content, "image/png");
        } else {
            res.status = 404;
            res.set_content(filename + " not found", "text/plain");
        }
    });

    svr.Get("/proxy", [](const httplib::Request& req, httplib::Response& res) {
        std::string url = req.get_param_value("url");
        if (url.empty()) {
            res.status = 400;
            res.set_content("Missing url parameter", "text/plain");
            return;
        }

        std::string host;
        std::string path;
        bool is_https = false;

        if (url.compare(0, 8, "https://") == 0) {
            is_https = true;
            size_t path_start = url.find('/', 8);
            if (path_start == std::string::npos) {
                host = url.substr(8);
                path = "/";
            } else {
                host = url.substr(8, path_start - 8);
                path = url.substr(path_start);
            }
        } else if (url.compare(0, 7, "http://") == 0) {
            size_t path_start = url.find('/', 7);
            if (path_start == std::string::npos) {
                host = url.substr(7);
                path = "/";
            } else {
                host = url.substr(7, path_start - 7);
                path = url.substr(path_start);
            }
        } else {
            res.status = 400;
            res.set_content("Invalid URL protocol", "text/plain");
            return;
        }

        if (is_https) {
#ifdef CPPHTTPLIB_OPENSSL_SUPPORT
            httplib::SSLClient cli(host);
            cli.enable_server_certificate_verification(false);
            cli.set_connection_timeout(10);
            cli.set_read_timeout(10);
            
            // Support older SSL/TLS versions often found on local network devices
            if (cli.ssl_context()) {
                SSL_CTX_set_security_level(cli.ssl_context(), 0);
            }

            if (auto result = cli.Get(path)) {
                res.status = result->status;
                std::string content_type = result->get_header_value("Content-Type");
                if (content_type.empty()) content_type = "application/octet-stream";
                res.set_content(result->body, content_type);
            } else {
                auto err = result.error();
                std::cerr << "Proxy HTTPS error: " << httplib::to_string(err) << " for URL: " << url << std::endl;
                res.status = 502;
                res.set_content("Proxy (HTTPS) error: " + httplib::to_string(err), "text/plain");
            }
#else
            res.status = 501;
            res.set_content("HTTPS not supported in this build", "text/plain");
#endif
        } else {
            httplib::Client cli(host);
            cli.set_connection_timeout(10);
            cli.set_read_timeout(10);
            if (auto result = cli.Get(path)) {
                res.status = result->status;
                std::string content_type = result->get_header_value("Content-Type");
                if (content_type.empty()) content_type = "application/octet-stream";
                res.set_content(result->body, content_type);
            } else {
                auto err = result.error();
                std::cerr << "Proxy HTTP error: " << httplib::to_string(err) << " for URL: " << url << std::endl;
                res.status = 502;
                res.set_content("Proxy (HTTP) error: " + httplib::to_string(err), "text/plain");
            }
        }
    });

    svr.set_mount_point("/", ".");

    std::cout << "Server started at http://localhost:8080" << std::endl;
    svr.listen("0.0.0.0", 8080);

    return 0;
}