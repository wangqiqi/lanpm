#pragma once

#include <cstdint>
#include <string>
#include <vector>

struct LicenseGrant {
  std::string plugin_id;
  std::vector<std::string> features;
  std::int64_t issued_at = 0;
  bool has_issued_at = false;
  std::int64_t expires_at = 0;
  bool has_expires_at = false;
};

struct UnsignedLicense {
  int version = 1;
  std::string machine_id;
  std::int64_t issued_at = 0;
  std::string term;
  std::vector<LicenseGrant> grants;
  std::string algorithm = "ed25519";
};

struct MachineRequest {
  int version = 1;
  std::string machine_id;
  std::string hostname;
  std::string platform;
  std::int64_t collected_at = 0;
};

std::string get_machine_id();
std::string get_hostname();
std::string get_platform_name();

std::string canonicalize_license_payload(const UnsignedLicense &license);
std::string escape_json_string(const std::string &value);

bool sign_license(UnsignedLicense &license, const std::string &private_key_pem, std::string &out_json);
bool verify_license_json(const std::string &json, const std::string &public_key_pem);

bool write_machine_request(const std::string &path);
bool issue_license_file(
  const std::string &request_path,
  const std::vector<std::string> &plugin_ids,
  const std::string &term,
  const std::string &expires_date,
  const std::string &private_key_pem,
  const std::string &out_path);
