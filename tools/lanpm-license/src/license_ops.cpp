#include "license_ops.hpp"

#include <openssl/bio.h>
#include <openssl/buffer.h>
#include <openssl/evp.h>
#include <openssl/pem.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <sstream>

#if defined(_WIN32)
#include <windows.h>
#else
#include <unistd.h>
#endif

namespace {

std::string read_file_to_string(const std::string &path) {
  std::ifstream in(path);
  if (!in) return {};
  std::ostringstream ss;
  ss << in.rdbuf();
  return ss.str();
}

std::string sha256_hex(const std::string &input) {
  unsigned char hash[EVP_MAX_MD_SIZE];
  unsigned int len = 0;
  EVP_MD_CTX *ctx = EVP_MD_CTX_new();
  EVP_DigestInit_ex(ctx, EVP_sha256(), nullptr);
  EVP_DigestUpdate(ctx, input.data(), input.size());
  EVP_DigestFinal_ex(ctx, hash, &len);
  EVP_MD_CTX_free(ctx);
  std::ostringstream out;
  for (unsigned int i = 0; i < len; ++i) {
    out.width(2);
    out.fill('0');
    out << std::hex << static_cast<int>(hash[i]);
  }
  return out.str();
}

}  // namespace

std::string escape_json_string(const std::string &value) {
  std::string out;
  out.reserve(value.size() + 8);
  for (char c : value) {
    switch (c) {
      case '"': out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default: out += c; break;
    }
  }
  return out;
}

std::string get_hostname() {
  std::array<char, 256> buf{};
  if (gethostname(buf.data(), buf.size() - 1) == 0) {
    return std::string(buf.data());
  }
  return "unknown";
}

std::string get_platform_name() {
#if defined(_WIN32)
  return "win32";
#elif defined(__APPLE__)
  return "darwin";
#elif defined(__linux__)
  return "linux";
#else
  return "unknown";
#endif
}

std::string read_stable_platform_id() {
#if defined(__linux__)
  for (const char *path : {"/etc/machine-id", "/var/lib/dbus/machine-id"}) {
    std::string content = read_file_to_string(path);
    if (!content.empty()) {
      while (!content.empty() && (content.back() == '\n' || content.back() == '\r')) {
        content.pop_back();
      }
      return content;
    }
  }
#elif defined(__APPLE__)
  FILE *pipe = popen("ioreg -rd1 -c IOPlatformExpertDevice", "r");
  if (pipe) {
    std::string output;
    char buffer[512];
    while (fgets(buffer, sizeof(buffer), pipe)) {
      output += buffer;
    }
    pclose(pipe);
    const auto pos = output.find("\"IOPlatformUUID\"");
    if (pos != std::string::npos) {
      const auto start = output.find('"', pos + 16);
      const auto end = output.find('"', start + 1);
      if (start != std::string::npos && end != std::string::npos && end > start) {
        return output.substr(start + 1, end - start - 1);
      }
    }
  }
#elif defined(_WIN32)
  FILE *pipe = popen(
    "reg query \"HKLM\\SOFTWARE\\Microsoft\\Cryptography\" /v MachineGuid",
    "r");
  if (pipe) {
    std::string output;
    char buffer[512];
    while (fgets(buffer, sizeof(buffer), pipe)) {
      output += buffer;
    }
    pclose(pipe);
    const auto pos = output.find("MachineGuid");
    if (pos != std::string::npos) {
      const auto reg = output.find("REG_SZ", pos);
      if (reg != std::string::npos) {
        std::size_t i = reg + 6;
        while (i < output.size() && (output[i] == ' ' || output[i] == '\t')) ++i;
        std::size_t j = i;
        while (j < output.size() && output[j] != '\r' && output[j] != '\n') ++j;
        return output.substr(i, j - i);
      }
    }
  }
#endif
  return get_platform_name() + ":" + get_hostname();
}

std::string get_machine_id() {
  return "sha256:" + sha256_hex(read_stable_platform_id());
}

std::string canonicalize_license_payload(const UnsignedLicense &license) {
  std::vector<LicenseGrant> grants = license.grants;
  std::sort(grants.begin(), grants.end(), [](const LicenseGrant &a, const LicenseGrant &b) {
    return a.plugin_id < b.plugin_id;
  });

  std::ostringstream os;
  os << "{\"version\":" << license.version
     << ",\"machineId\":\"" << escape_json_string(license.machine_id) << "\""
     << ",\"issuedAt\":" << license.issued_at
     << ",\"term\":\"" << escape_json_string(license.term) << "\""
     << ",\"grants\":[";
  for (std::size_t i = 0; i < grants.size(); ++i) {
    const auto &g = grants[i];
    auto features = g.features;
    std::sort(features.begin(), features.end());
    if (i > 0) os << ',';
    os << "{\"pluginId\":\"" << escape_json_string(g.plugin_id) << "\""
       << ",\"features\":[";
    for (std::size_t f = 0; f < features.size(); ++f) {
      if (f > 0) os << ',';
      os << '"' << escape_json_string(features[f]) << '"';
    }
    os << ']';
    if (g.has_issued_at) os << ",\"issuedAt\":" << g.issued_at;
    if (g.has_expires_at) os << ",\"expiresAt\":" << g.expires_at;
    os << '}';
  }
  os << "],\"algorithm\":\"" << escape_json_string(license.algorithm) << "\"}";
  return os.str();
}

bool sign_license(UnsignedLicense &license, const std::string &private_key_pem, std::string &out_json) {
  const std::string canonical = canonicalize_license_payload(license);
  BIO *bio = BIO_new_mem_buf(private_key_pem.data(), static_cast<int>(private_key_pem.size()));
  EVP_PKEY *pkey = PEM_read_bio_PrivateKey(bio, nullptr, nullptr, nullptr);
  BIO_free(bio);
  if (!pkey) return false;

  EVP_MD_CTX *ctx = EVP_MD_CTX_new();
  std::size_t sig_len = 0;
  bool ok = EVP_DigestSignInit(ctx, nullptr, nullptr, nullptr, pkey) == 1 &&
            EVP_DigestSign(ctx, nullptr, &sig_len,
                           reinterpret_cast<const unsigned char *>(canonical.data()),
                           canonical.size()) == 1;
  if (!ok) {
    EVP_MD_CTX_free(ctx);
    EVP_PKEY_free(pkey);
    return false;
  }
  auto *sig = static_cast<unsigned char *>(OPENSSL_malloc(sig_len));
  ok = EVP_DigestSign(ctx, sig, &sig_len,
                      reinterpret_cast<const unsigned char *>(canonical.data()),
                      canonical.size()) == 1;
  EVP_MD_CTX_free(ctx);
  if (!ok) {
    OPENSSL_free(sig);
    EVP_PKEY_free(pkey);
    return false;
  }

  BIO *b64 = BIO_new(BIO_f_base64());
  BIO *mem = BIO_new(BIO_s_mem());
  b64 = BIO_push(b64, mem);
  BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);
  BIO_write(b64, sig, static_cast<int>(sig_len));
  BIO_flush(b64);
  BUF_MEM *bptr = nullptr;
  BIO_get_mem_ptr(b64, &bptr);
  std::string signature(bptr->data, bptr->length);
  BIO_free_all(b64);
  OPENSSL_free(sig);
  EVP_PKEY_free(pkey);

  out_json = canonical;
  if (!out_json.empty() && out_json.back() == '}') {
    out_json.pop_back();
  }
  out_json += ",\"signature\":\"" + escape_json_string(signature) + "\"}";
  return true;
}

bool verify_license_json(const std::string &json, const std::string &public_key_pem) {
  const auto sig_pos = json.find("\"signature\"");
  if (sig_pos == std::string::npos) return false;
  const auto colon = json.find(':', sig_pos);
  const auto q1 = json.find('"', colon + 1);
  const auto q2 = json.find('"', q1 + 1);
  if (q1 == std::string::npos || q2 == std::string::npos) return false;
  const std::string signature_b64 = json.substr(q1 + 1, q2 - q1 - 1);
  std::string unsigned_json = json.substr(0, sig_pos);
  while (!unsigned_json.empty() && (unsigned_json.back() == ' ' || unsigned_json.back() == '\n' ||
                                    unsigned_json.back() == '\r' || unsigned_json.back() == ',')) {
    unsigned_json.pop_back();
  }
  unsigned_json += '}';

  BIO *bio = BIO_new_mem_buf(public_key_pem.data(), static_cast<int>(public_key_pem.size()));
  EVP_PKEY *pkey = PEM_read_bio_PUBKEY(bio, nullptr, nullptr, nullptr);
  BIO_free(bio);
  if (!pkey) return false;

  std::string decoded;
  BIO *b64 = BIO_new(BIO_f_base64());
  BIO *mem = BIO_new_mem_buf(signature_b64.data(), static_cast<int>(signature_b64.size()));
  mem = BIO_push(b64, mem);
  BIO_set_flags(mem, BIO_FLAGS_BASE64_NO_NL);
  char buffer[512];
  int len = 0;
  while ((len = BIO_read(mem, buffer, sizeof(buffer))) > 0) {
    decoded.append(buffer, len);
  }
  BIO_free_all(mem);

  EVP_MD_CTX *ctx = EVP_MD_CTX_new();
  const bool ok = EVP_DigestVerifyInit(ctx, nullptr, nullptr, nullptr, pkey) == 1 &&
                  EVP_DigestVerify(ctx,
                                   reinterpret_cast<const unsigned char *>(decoded.data()),
                                   decoded.size(),
                                   reinterpret_cast<const unsigned char *>(unsigned_json.data()),
                                   unsigned_json.size()) == 1;
  EVP_MD_CTX_free(ctx);
  EVP_PKEY_free(pkey);
  return ok;
}

bool write_machine_request(const std::string &path) {
  const auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
                     std::chrono::system_clock::now().time_since_epoch())
                     .count();
  std::ostringstream os;
  os << "{\n"
     << "  \"version\": 1,\n"
     << "  \"machineId\": \"" << escape_json_string(get_machine_id()) << "\",\n"
     << "  \"hostname\": \"" << escape_json_string(get_hostname()) << "\",\n"
     << "  \"platform\": \"" << escape_json_string(get_platform_name()) << "\",\n"
     << "  \"collectedAt\": " << now << "\n"
     << "}\n";
  std::ofstream out(path);
  if (!out) return false;
  out << os.str();
  return true;
}

static std::string extract_json_string(const std::string &json, const std::string &key) {
  const auto pos = json.find('"' + key + '"');
  if (pos == std::string::npos) return {};
  const auto colon = json.find(':', pos);
  const auto q1 = json.find('"', colon + 1);
  const auto q2 = json.find('"', q1 + 1);
  if (q1 == std::string::npos || q2 == std::string::npos) return {};
  return json.substr(q1 + 1, q2 - q1 - 1);
}

bool issue_license_file(
  const std::string &request_path,
  const std::vector<std::string> &plugin_ids,
  const std::string &term,
  const std::string & /*expires_date*/,
  const std::string &private_key_pem,
  const std::string &out_path) {
  const std::string request_json = read_file_to_string(request_path);
  const std::string machine_id = extract_json_string(request_json, "machineId");
  if (machine_id.empty() || plugin_ids.empty()) return false;

  const auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
                     std::chrono::system_clock::now().time_since_epoch())
                     .count();
  const std::int64_t trial_ms = static_cast<std::int64_t>(90LL * 24 * 60 * 60 * 1000);

  UnsignedLicense license;
  license.machine_id = machine_id;
  license.issued_at = now;
  license.term = term;
  for (const auto &plugin_id : plugin_ids) {
    LicenseGrant grant;
    grant.plugin_id = plugin_id;
    grant.features = {"license.feature"};
    grant.issued_at = now;
    grant.has_issued_at = true;
    if (term == "trial") {
      grant.expires_at = now + trial_ms;
      grant.has_expires_at = true;
    }
    license.grants.push_back(grant);
  }

  std::string signed_json;
  if (!sign_license(license, private_key_pem, signed_json)) return false;
  std::ofstream out(out_path);
  if (!out) return false;
  out << signed_json << '\n';
  return true;
}
