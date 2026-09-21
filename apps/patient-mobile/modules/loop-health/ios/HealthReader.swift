import Foundation
import HealthKit

final class HealthReader {
  static let shared=HealthReader()
  let store=HKHealthStore()
  let quantities:[String:(HKQuantityTypeIdentifier,HKUnit,String,String)]=[
    "steps":(.stepCount,.count(),"count","count"),
    "distance":(.distanceWalkingRunning,.meter(),"m","distance"),
    "activeCalories":(.activeEnergyBurned,.kilocalorie(),"kcal","energy"),
    "heartRate":(.heartRate,HKUnit.count().unitDivided(by:.minute()),"bpm","bpm"),
    "restingHeartRate":(.restingHeartRate,HKUnit.count().unitDivided(by:.minute()),"bpm","bpm"),
    "hrv":(.heartRateVariabilitySDNN,.secondUnit(with:.milli),"ms","sdnn"),
    "height":(.height,.meter(),"m","height"),"weight":(.bodyMass,.gramUnit(with:.kilo),"kg","weight"),
    "bodyFat":(.bodyFatPercentage,.percent(),"percent","percentage"),
    "bloodGlucose":(.bloodGlucose,HKUnit.moleUnit(with:.milli,molarMass:HKUnitMolarMassBloodGlucose).unitDivided(by:.liter()),"mmol/L","level"),
    "oxygenSaturation":(.oxygenSaturation,.percent(),"percent","percentage"),
    "respiratoryRate":(.respiratoryRate,HKUnit.count().unitDivided(by:.minute()),"perMinute","rate"),
    "temperature":(.bodyTemperature,.degreeCelsius(),"celsius","temperature"),
    "hydration":(.dietaryWater,.liter(),"liters","volume")
  ]
  let nutrients:[(HKQuantityTypeIdentifier,HKUnit,String)]=[(.dietaryEnergyConsumed,.kilocalorie(),"energyKcal"),(.dietaryProtein,.gram(),"proteinGrams"),(.dietaryCarbohydrates,.gram(),"carbohydrateGrams"),(.dietaryFatTotal,.gram(),"fatGrams")]
  var supported:[String] {Array(quantities.keys)+["exercise","sleep","bloodPressure","nutrition"]}
  func queryTypes(_ name:String)->[HKSampleType] {
    if let q=quantities[name],let t=HKQuantityType.quantityType(forIdentifier:q.0){return [t]}
    switch name {
    case "exercise":return [HKObjectType.workoutType()]
    case "sleep":return [HKObjectType.categoryType(forIdentifier:.sleepAnalysis)!]
    case "bloodPressure":return [HKObjectType.correlationType(forIdentifier:.bloodPressure)!]
    case "nutrition":return nutrients.compactMap{HKQuantityType.quantityType(forIdentifier:$0.0)}
    default:return []
    }
  }
  func permissionTypes(_ names:[String])->Set<HKObjectType> {
    var result=Set<HKObjectType>()
    for name in names {
      if name=="bloodPressure" {result.insert(HKQuantityType.quantityType(forIdentifier:.bloodPressureSystolic)!);result.insert(HKQuantityType.quantityType(forIdentifier:.bloodPressureDiastolic)!)}
      else{for t in queryTypes(name){result.insert(t)}}
    };return result
  }
  func authorize(_ names:[String]) async throws {try await store.requestAuthorization(toShare:[],read:permissionTypes(names))}
  func samples(_ type:HKSampleType,_ start:Date,_ end:Date,_ limit:Int=HKObjectQueryNoLimit) async throws -> [HKSample] {
    try await withCheckedThrowingContinuation { continuation in
      let predicate=HKQuery.predicateForSamples(withStart:start,end:end,options:[])
      let query=HKSampleQuery(sampleType:type,predicate:predicate,limit:limit,sortDescriptors:[NSSortDescriptor(key:HKSampleSortIdentifierStartDate,ascending:true)]){_,samples,error in
        if let error=error{continuation.resume(throwing:error)}else{continuation.resume(returning:samples ?? [])}
      };store.execute(query)
    }
  }
  func readableTypes(_ names:[String]) async -> [String] {
    // A successful authorization dialog never proves read permission on iOS.
    var result:[String]=[]
    for name in names {for type in queryTypes(name){if let found=try? await samples(type,Date().addingTimeInterval(-30*86400),Date(),1),!found.isEmpty{result.append(name);break}}}
    return result
  }
  static func iso(_ date:Date)->String {ISO8601DateFormatter().string(from:date)}
  static func date(_ value:String) throws -> Date {
    let formatter=ISO8601DateFormatter();formatter.formatOptions=[.withInternetDateTime,.withFractionalSeconds]
    if let date=formatter.date(from:value) ?? ISO8601DateFormatter().date(from:value){return date};throw PrivateStore.failure("Invalid date")
  }
  func read(_ names:[String],_ start:Date,_ end:Date) async throws -> [[String:Any]] {
    guard HKHealthStore.isHealthDataAvailable() else{throw PrivateStore.failure("Apple Health unavailable")}
    var output:[[String:Any]]=[]
    for name in names {for type in queryTypes(name){for sample in try await samples(type,start,end){
      guard sample.endDate>=start,sample.startDate<=end else{continue}
      let clipStart=max(start,sample.startDate),clipEnd=min(end,sample.endDate)
      var row:[String:Any] = ["id":sample.uuid.uuidString,"type":name,"start":Self.iso(clipStart),"end":Self.iso(clipEnd),"origin":sample.sourceRevision.source.bundleIdentifier,"device":sample.device?.model ?? "","zoneOffset":sample.metadata?[HKMetadataKeyTimeZone] as? String ?? "","recordingMethod":(sample.metadata?[HKMetadataKeyWasUserEntered] as? Bool)==true ? "manual":"source","platform":"ios","clipped":clipStart != sample.startDate || clipEnd != sample.endDate]
      if let q=sample as? HKQuantitySample,let spec=quantities[name]{
        if clipStart != sample.startDate || clipEnd != sample.endDate {continue}
        let n=q.quantity.doubleValue(for:spec.1)*(spec.2=="percent" ? 100:1)
        row["unit"]=spec.2;row["value"]=name=="heartRate" ? ["samples":[["time":Self.iso(sample.startDate),"bpm":n]]] : [spec.3:n]
      }else if let workout=sample as? HKWorkout {
        row["unit"]="session";row["value"]=["exerciseType":Int(workout.workoutActivityType.rawValue)]
      }else if let sleep=sample as? HKCategorySample,name=="sleep" {
        row["unit"]="session";row["value"]=["stages":[["start":Self.iso(clipStart),"end":Self.iso(clipEnd),"stage":sleep.value]]]
      }else if let bp=sample as? HKCorrelation,name=="bloodPressure" {
        guard let systolic=bp.objects(for:HKQuantityType.quantityType(forIdentifier:.bloodPressureSystolic)!).first as? HKQuantitySample,let diastolic=bp.objects(for:HKQuantityType.quantityType(forIdentifier:.bloodPressureDiastolic)!).first as? HKQuantitySample else{continue}
        row["unit"]="mmHg";row["value"]=["systolic":systolic.quantity.doubleValue(for:.millimeterOfMercury()),"diastolic":diastolic.quantity.doubleValue(for:.millimeterOfMercury())]
      }else if let q=sample as? HKQuantitySample,name=="nutrition",let nutrient=nutrients.first(where:{$0.0.rawValue==q.quantityType.identifier}){
        var values:[String:Any]=["energyKcal":NSNull(),"proteinGrams":NSNull(),"carbohydrateGrams":NSNull(),"fatGrams":NSNull()];values[nutrient.2]=q.quantity.doubleValue(for:nutrient.1);row["unit"]="mixed";row["value"]=values
      }else{continue}
      output.append(row)
    }}}
    return output
  }
  func aggregateSteps(_ start:Date,_ end:Date) async throws -> Double? {
    try await withCheckedThrowingContinuation{continuation in
      let query=HKStatisticsQuery(quantityType:HKQuantityType.quantityType(forIdentifier:.stepCount)!,quantitySamplePredicate:HKQuery.predicateForSamples(withStart:start,end:end),options:.cumulativeSum){_,result,error in
        if let error=error{continuation.resume(throwing:error)}else{continuation.resume(returning:result?.sumQuantity()?.doubleValue(for:.count()))}
      };store.execute(query)
    }
  }
}
