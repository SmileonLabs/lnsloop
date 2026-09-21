import Foundation
import HealthKit
import UIKit
import ExpoModulesCore

@MainActor final class BackgroundShare {
  static let shared=BackgroundShare()
  private var observers:[HKObserverQuery]=[]
  private var running=false
  private var generation=0
  private let reader=HealthReader.shared
  func request(_ base:String,_ path:String,_ token:String,_ payload:[String:Any]?=nil) async throws -> Any {
    guard let url=URL(string:base+path),url.scheme=="https" || (url.host=="localhost" || url.host=="127.0.0.1") else {throw PrivateStore.failure("HTTPS required")}
    var request=URLRequest(url:url);request.timeoutInterval=20;request.setValue("Bearer "+token,forHTTPHeaderField:"Authorization")
    if let payload=payload {request.httpMethod="POST";request.setValue("application/json",forHTTPHeaderField:"Content-Type");request.httpBody=try JSONSerialization.data(withJSONObject:payload)}
    let (data,response)=try await URLSession.shared.data(for:request)
    guard let http=response as? HTTPURLResponse else {throw PrivateStore.failure("No response")}
    guard (200...299).contains(http.statusCode) else{throw NSError(domain:"LoopHTTP",code:http.statusCode)}
    return try JSONSerialization.jsonObject(with:data)
  }
  func configure(_ id:String,_ token:String,_ url:String) async throws {
    guard let study=try await request(url,"/studies/"+id,token) as? [String:Any],let config=study["config"] as? [String:Any],let types=config["types"] as? [String] else{throw PrivateStore.failure("Study unavailable")}
    let value:[String:Any]=["token":token,"url":url,"types":types]
    try PrivateStore.write("auto-"+id,String(data:JSONSerialization.data(withJSONObject:value),encoding:.utf8)!)
    await restore()
  }
  func restore() async {
    generation+=1
    for observer in observers{reader.store.stop(observer)};observers=[]
    guard HKHealthStore.isHealthDataAvailable() else{return}
    var names=Set<String>()
    for key in (try? PrivateStore.names()) ?? [] where key.hasPrefix("auto-") {
      if let value=try? PrivateStore.read(key),let data=value.data(using:.utf8),let config=try? JSONSerialization.jsonObject(with:data) as? [String:Any],let types=config["types"] as? [String] {names.formUnion(types)}
    }
    var seen=Set<String>()
    for name in names{for type in reader.queryTypes(name) where !seen.contains(type.identifier){
      seen.insert(type.identifier)
      let observer=HKObserverQuery(sampleType:type,predicate:nil){_,completion,error in
        guard error==nil else{completion();return}
        Task { @MainActor in await self.sync();completion() }
      }
      observers.append(observer);reader.store.execute(observer)
      reader.store.enableBackgroundDelivery(for:type,frequency:.hourly){_,_ in}
    }}
  }
  func cancel(_ id:String?=nil) async throws {
    generation+=1
    if let id=id{try PrivateStore.delete("auto-"+id)}else{for name in try PrivateStore.names() where name.hasPrefix("auto-"){try PrivateStore.delete(name)}}
    await restore()
    if observers.isEmpty{reader.store.disableAllBackgroundDelivery{_,_ in}}
  }
  func sync() async {
    guard !running else{return};running=true;defer{running=false}
    let currentGeneration=generation
    for key in (try? PrivateStore.names()) ?? [] where key.hasPrefix("auto-") {
      do {
        guard let raw=try PrivateStore.read(key),let saved=try JSONSerialization.jsonObject(with:Data(raw.utf8)) as? [String:Any],let token=saved["token"] as? String,let url=saved["url"] as? String else{continue}
        let id=String(key.dropFirst(5))
        guard let enrollments=try await request(url,"/enrollments",token) as? [[String:Any]],let enrollment=enrollments.first(where:{($0["study_id"] as? String)==id && $0["withdrawn_at"] is NSNull && ($0["auto_share"] as? Bool)==true}) else{continue}
        guard let study=try await request(url,"/studies/"+id,token) as? [String:Any],let version=study["version"] as? Int,version == (enrollment["version"] as? Int),(study["status"] as? String) == "published",let config=study["config"] as? [String:Any],let types=config["types"] as? [String] else{continue}
        guard let window=try await request(url,"/studies/"+id+"/window",token) as? [String:String],let startValue=window["start"],let endValue=window["end"] else{continue}
        let start=try HealthReader.date(startValue),end=min(try HealthReader.date(endValue),Date());if start>=end{continue}
        let records=try await reader.read(types,start,end)
        guard !records.isEmpty,currentGeneration==generation,(try PrivateStore.read(key)) != nil else{continue}
        _=try await request(url,"/submissions",token,["mode":"automatic","studyId":id,"version":version,"activity":"health","periodStart":startValue,"periodEnd":endValue,"records":records,"answers":[:]])
      }catch let error as NSError {
        if error.domain=="LoopHTTP" && [401,403,409].contains(error.code){try? PrivateStore.delete(key)}
      }
    }
  }
}
public class LoopHealthAppDelegate:ExpoAppDelegateSubscriber {
  public func application(_ application:UIApplication,didFinishLaunchingWithOptions launchOptions:[UIApplication.LaunchOptionsKey:Any]?=nil)->Bool {
    Task { @MainActor in await BackgroundShare.shared.restore() };return true
  }
  public func applicationDidBecomeActive(_ application:UIApplication){Task { @MainActor in await BackgroundShare.shared.sync() }}
}
