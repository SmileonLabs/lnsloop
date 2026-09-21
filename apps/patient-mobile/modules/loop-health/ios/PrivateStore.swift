import Foundation
import CryptoKit
import Security

enum PrivateStore {
  private static let service = "com.lnsloop.health.encryption"
  private static func key() throws -> SymmetricKey {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: "key", kSecReturnData as String: true]
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecSuccess, let data = result as? Data { return SymmetricKey(data: data) }
    guard status == errSecItemNotFound else { throw failure("Keychain unavailable") }
    let key = SymmetricKey(size: .bits256)
    let data = key.withUnsafeBytes { Data($0) }
    let attributes: [String: Any] = [kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:"key",kSecValueData as String:data,kSecAttrAccessible as String:kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
    let added = SecItemAdd(attributes as CFDictionary, nil)
    if added == errSecDuplicateItem { return try self.key() }
    guard added == errSecSuccess else { throw failure("Unable to protect data") }
    return key
  }
  static func failure(_ message:String) -> NSError { NSError(domain:"LNSLoop",code:1,userInfo:[NSLocalizedDescriptionKey:message]) }
  private static func directory() throws -> URL {
    var url = try FileManager.default.url(for:.applicationSupportDirectory,in:.userDomainMask,appropriateFor:nil,create:true).appendingPathComponent("loop-private",isDirectory:true)
    try FileManager.default.createDirectory(at:url,withIntermediateDirectories:true)
    var values=URLResourceValues();values.isExcludedFromBackup=true;try url.setResourceValues(values)
    return url
  }
  private static func file(_ name:String) throws -> URL {
    guard name.range(of:"^[a-zA-Z0-9-]+$",options:.regularExpression) != nil else {throw failure("Invalid storage key")}
    return try directory().appendingPathComponent(name)
  }
  static func write(_ name:String,_ value:String) throws {
    let sealed = try AES.GCM.seal(Data(value.utf8),using:key())
    guard let data=sealed.combined else {throw failure("Encryption failed")}
    let url=try file(name);try data.write(to:url,options:[.atomic,.completeFileProtectionUntilFirstUserAuthentication])
  }
  static func read(_ name:String) throws -> String? {
    let url=try file(name);guard FileManager.default.fileExists(atPath:url.path) else{return nil}
    let data=try AES.GCM.open(AES.GCM.SealedBox(combined:Data(contentsOf:url)),using:key())
    return String(data:data,encoding:.utf8)
  }
  static func delete(_ name:String) throws {let url=try file(name);if FileManager.default.fileExists(atPath:url.path){try FileManager.default.removeItem(at:url)}}
  static func names() throws -> [String] {try FileManager.default.contentsOfDirectory(atPath:directory().path)}
  static func clear() throws {for name in try names(){try delete(name)}}
}
