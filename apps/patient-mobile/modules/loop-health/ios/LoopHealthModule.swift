import ExpoModulesCore
import HealthKit
import UIKit
import UserNotifications
public class LoopHealthModule:Module {
  private let reader=HealthReader.shared
  public func definition()->ModuleDefinition {
    Name("LoopHealth")
    AsyncFunction("availability") { [self] in ["available":HKHealthStore.isHealthDataAvailable(),"reason":"Apple Health requires a supported device"] as [String:Any] }
    AsyncFunction("capabilities") { [self] in ["types":reader.supported,"background":true,"history":true,"readPermissionObservable":false] as [String:Any] }
    AsyncFunction("rationaleRequested") {false}
    AsyncFunction("permissions") { [self] (names:[String]) async -> [String] in await reader.readableTypes(names) }
    AsyncFunction("requestPermissions") { [self] (names:[String]) async throws in try await reader.authorize(names) }
    AsyncFunction("requestHistory") { /* iOS uses its own per-type permission/history controls. */ }
    AsyncFunction("read") { [self] (names:[String],start:String,end:String) async throws -> [[String:Any]] in try await reader.read(names,HealthReader.date(start),HealthReader.date(end)) }
    AsyncFunction("aggregate") { [self] (names:[String],start:String,end:String) async throws -> [String:Any] in
      var result:[String:Any]=[:];if names.contains("steps"){result["steps"]=(try await reader.aggregateSteps(HealthReader.date(start),HealthReader.date(end))) as Any? ?? NSNull()};return result
    }
    AsyncFunction("openSettings") { await MainActor.run { if let url=URL(string:UIApplication.openSettingsURLString){UIApplication.shared.open(url)} } }
    AsyncFunction("install") { await MainActor.run {if let url=URL(string:"x-apple-health://"){UIApplication.shared.open(url)}} }
    AsyncFunction("writePrivate") { (key:String,value:String) throws in try PrivateStore.write(key,value) }
    AsyncFunction("readPrivate") { (key:String) throws -> String? in try PrivateStore.read(key) }
    AsyncFunction("deletePrivate") { (key:String) throws in try PrivateStore.delete(key) }
    AsyncFunction("configureAutomatic") { (id:String,token:String,url:String) async throws in try await BackgroundShare.shared.configure(id,token,url) }
    AsyncFunction("cancelAutomaticStudy") { (id:String) async throws in try await BackgroundShare.shared.cancel(id) }
    AsyncFunction("cancelAutomatic") { () async throws in try await BackgroundShare.shared.cancel();UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers:["loop-reminder"]);try PrivateStore.clear() }
    AsyncFunction("setReminders") { (enabled:Bool,language:String) async throws -> Bool in
      let center=UNUserNotificationCenter.current();center.removePendingNotificationRequests(withIdentifiers:["loop-reminder"])
      guard enabled else{try PrivateStore.delete("reminder");return false}
      guard try await center.requestAuthorization(options:[.alert,.sound]) else{return false}
      let content=UNMutableNotificationContent();content.title="LNS Loop";content.body=language=="ko" ? "앱에서 참여 활동을 확인해 주세요.":"Check your participation activities in the app."
      try await center.add(UNNotificationRequest(identifier:"loop-reminder",content:content,trigger:UNTimeIntervalNotificationTrigger(timeInterval:86400,repeats:true)));try PrivateStore.write("reminder","true");return true
    }
    AsyncFunction("getChangesToken") { (names:[String]) throws -> String in
      let value:[String:Any]=["types":names,"anchors":[:]];return try JSONSerialization.data(withJSONObject:value).base64EncodedString()
    }
    AsyncFunction("readChanges") { [self] (token:String) async throws -> [String:Any] in
      guard let data=Data(base64Encoded:token),var state=try JSONSerialization.jsonObject(with:data) as? [String:Any],let names=state["types"] as? [String] else{throw PrivateStore.failure("Invalid change token")}
      var anchors=state["anchors"] as? [String:String] ?? [:];var changes:[[String:Any]]=[]
      for name in names{for type in reader.queryTypes(name){
        let anchor=try anchors[type.identifier].flatMap{Data(base64Encoded:$0)}.flatMap{try NSKeyedUnarchiver.unarchivedObject(ofClass:HKQueryAnchor.self,from:$0)}
        let result:([HKSample],[HKDeletedObject],HKQueryAnchor?)=try await withCheckedThrowingContinuation{continuation in
          reader.store.execute(HKAnchoredObjectQuery(type:type,predicate:nil,anchor:anchor,limit:HKObjectQueryNoLimit){_,samples,deleted,next,error in if let error=error{continuation.resume(throwing:error)}else{continuation.resume(returning:(samples ?? [],deleted ?? [],next))}})
        }
        for sample in result.0{changes.append(["kind":"upsert","id":sample.uuid.uuidString,"type":name])};for deleted in result.1{changes.append(["kind":"delete","id":deleted.uuid.uuidString])}
        if let next=result.2{anchors[type.identifier]=try NSKeyedArchiver.archivedData(withRootObject:next,requiringSecureCoding:true).base64EncodedString()}
      }}
      state["anchors"]=anchors;return ["nextToken":try JSONSerialization.data(withJSONObject:state).base64EncodedString(),"hasMore":false,"expired":false,"changes":changes]
    }
  }
}
