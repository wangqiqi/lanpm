#include "license_ops.hpp"

#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace {

const char *DEFAULT_PUBLIC_KEY = R"(-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAB0/TvKbxPF+jqx6WbRXPmeNwND7dPuanSUZkx4xUQxc=
-----END PUBLIC KEY-----
)";

void print_usage() {
  std::cerr
    << "lanpm-license — offline plugin license tool\n\n"
    << "Usage:\n"
    << "  lanpm-license collect -o <machine-request.json>\n"
    << "  lanpm-license issue --request <machine-request.json> --plugin <id> [--plugin <id>...]\n"
    << "         --term trial|perpetual --key <issuer-private.pem> -o <license.json>\n"
    << "  lanpm-license verify <license.json> [--pubkey <issuer-public.pem>]\n";
}

std::string read_file(const std::string &path) {
  std::ifstream in(path);
  std::ostringstream ss;
  ss << in.rdbuf();
  return ss.str();
}

}  // namespace

int main(int argc, char **argv) {
  if (argc < 2) {
    print_usage();
    return 1;
  }
  const std::string cmd = argv[1];
  if (cmd == "collect") {
    std::string out = "machine-request.json";
    for (int i = 2; i < argc; ++i) {
      if (std::string(argv[i]) == "-o" && i + 1 < argc) {
        out = argv[++i];
      }
    }
    if (!write_machine_request(out)) {
      std::cerr << "collect failed\n";
      return 1;
    }
    std::cout << "wrote " << out << " machineId=" << get_machine_id() << '\n';
    return 0;
  }

  if (cmd == "issue") {
    std::string request;
    std::string key_path;
    std::string out = "license.json";
    std::string term = "trial";
    std::vector<std::string> plugins;
    for (int i = 2; i < argc; ++i) {
      const std::string arg = argv[i];
      if (arg == "--request" && i + 1 < argc) request = argv[++i];
      else if (arg == "--key" && i + 1 < argc) key_path = argv[++i];
      else if (arg == "--plugin" && i + 1 < argc) plugins.push_back(argv[++i]);
      else if (arg == "--term" && i + 1 < argc) term = argv[++i];
      else if (arg == "-o" && i + 1 < argc) out = argv[++i];
    }
    if (request.empty() || key_path.empty() || plugins.empty()) {
      print_usage();
      return 1;
    }
    if (term != "trial" && term != "perpetual") {
      std::cerr << "term must be trial or perpetual\n";
      return 1;
    }
    const std::string private_pem = read_file(key_path);
    if (!issue_license_file(request, plugins, term, "", private_pem, out)) {
      std::cerr << "issue failed\n";
      return 1;
    }
    std::cout << "wrote " << out << '\n';
    return 0;
  }

  if (cmd == "verify") {
    if (argc < 3) {
      print_usage();
      return 1;
    }
    const std::string license_path = argv[2];
    std::string public_pem = DEFAULT_PUBLIC_KEY;
    for (int i = 3; i < argc; ++i) {
      if (std::string(argv[i]) == "--pubkey" && i + 1 < argc) {
        public_pem = read_file(argv[++i]);
      }
    }
    const std::string json = read_file(license_path);
    if (!verify_license_json(json, public_pem)) {
      std::cerr << "verify failed\n";
      return 1;
    }
    std::cout << "verify OK\n";
    return 0;
  }

  print_usage();
  return 1;
}
