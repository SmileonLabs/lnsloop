package expo.modules.loophealth
import androidx.health.connect.client.records.*
import java.time.Instant
import kotlin.reflect.KClass
object HealthRecords {
 fun bounded(name:String,r:Record,start:Instant,end:Instant):Map<String,Any?>? {
  val data=serialize(name,r).toMutableMap();val originalStart=Instant.parse(data["start"] as String);val originalEnd=Instant.parse(data["end"] as String)
  if(originalStart>=start&&originalEnd<=end)return data
  if(name !in setOf("sleep","heartRate","exercise")||originalEnd<start||originalStart>end)return null
  data["start"]=maxOf(start,originalStart).toString();data["end"]=minOf(end,originalEnd).toString();data["clipped"]=true
  if(r is SleepSessionRecord)data["value"]=mapOf("stages" to r.stages.filter{it.endTime>start&&it.startTime<end}.map{mapOf("start" to maxOf(start,it.startTime).toString(),"end" to minOf(end,it.endTime).toString(),"stage" to it.stage)})
  if(r is HeartRateRecord)data["value"]=mapOf("samples" to r.samples.filter{it.time>=start&&it.time<=end}.map{mapOf("time" to it.time.toString(),"bpm" to it.beatsPerMinute)})
  return data
 }
 val types: Map<String,KClass<out Record>> = mapOf("steps" to StepsRecord::class,"distance" to DistanceRecord::class,"activeCalories" to ActiveCaloriesBurnedRecord::class,"totalCalories" to TotalCaloriesBurnedRecord::class,"exercise" to ExerciseSessionRecord::class,"sleep" to SleepSessionRecord::class,"heartRate" to HeartRateRecord::class,"restingHeartRate" to RestingHeartRateRecord::class,"hrv" to HeartRateVariabilityRmssdRecord::class,"height" to HeightRecord::class,"weight" to WeightRecord::class,"bodyFat" to BodyFatRecord::class,"bloodPressure" to BloodPressureRecord::class,"bloodGlucose" to BloodGlucoseRecord::class,"oxygenSaturation" to OxygenSaturationRecord::class,"respiratoryRate" to RespiratoryRateRecord::class,"temperature" to BodyTemperatureRecord::class,"nutrition" to NutritionRecord::class,"hydration" to HydrationRecord::class)

 fun serialize(name:String,r:Record):Map<String,Any?> {
  val start:Instant;val end:Instant;val zone:String
  val interval=r.javaClass.methods.any{it.name=="getStartTime"}
  start=r.javaClass.getMethod(if(interval) "getStartTime" else "getTime").invoke(r) as Instant
  end=if(interval) r.javaClass.getMethod("getEndTime").invoke(r) as Instant else start
  zone=r.javaClass.getMethod(if(interval) "getStartZoneOffset" else "getZoneOffset").invoke(r)?.toString()?:""
  val (unit,value)=when(r){
   is StepsRecord->"count" to mapOf("count" to r.count)
   is DistanceRecord->"m" to mapOf("distance" to r.distance.inMeters)
   is ActiveCaloriesBurnedRecord->"kcal" to mapOf("energy" to r.energy.inKilocalories)
   is TotalCaloriesBurnedRecord->"kcal" to mapOf("energy" to r.energy.inKilocalories)
   is ExerciseSessionRecord->"session" to mapOf("exerciseType" to r.exerciseType)
   is SleepSessionRecord->"session" to mapOf("stages" to r.stages.map{mapOf("start" to it.startTime.toString(),"end" to it.endTime.toString(),"stage" to it.stage)})
   is HeartRateRecord->"bpm" to mapOf("samples" to r.samples.map{mapOf("time" to it.time.toString(),"bpm" to it.beatsPerMinute)})
   is RestingHeartRateRecord->"bpm" to mapOf("bpm" to r.beatsPerMinute)
   is HeartRateVariabilityRmssdRecord->"ms" to mapOf("rmssd" to r.heartRateVariabilityMillis)
   is HeightRecord->"m" to mapOf("height" to r.height.inMeters)
   is WeightRecord->"kg" to mapOf("weight" to r.weight.inKilograms)
   is BodyFatRecord->"percent" to mapOf("percentage" to r.percentage.value)
   is BloodPressureRecord->"mmHg" to mapOf("systolic" to r.systolic.inMillimetersOfMercury,"diastolic" to r.diastolic.inMillimetersOfMercury)
   is BloodGlucoseRecord->"mmol/L" to mapOf("level" to r.level.inMillimolesPerLiter)
   is OxygenSaturationRecord->"percent" to mapOf("percentage" to r.percentage.value)
   is RespiratoryRateRecord->"perMinute" to mapOf("rate" to r.rate)
   is BodyTemperatureRecord->"celsius" to mapOf("temperature" to r.temperature.inCelsius)
   is NutritionRecord->"mixed" to mapOf("energyKcal" to r.energy?.inKilocalories,"proteinGrams" to r.protein?.inGrams,"carbohydrateGrams" to r.totalCarbohydrate?.inGrams,"fatGrams" to r.totalFat?.inGrams)
   is HydrationRecord->"liters" to mapOf("volume" to r.volume.inLiters)
   else->error("Unsupported record")
  }
  return mapOf("id" to r.metadata.id,"type" to name,"start" to start.toString(),"end" to end.toString(),"zoneOffset" to zone,"origin" to r.metadata.dataOrigin.packageName,"device" to listOfNotNull(r.metadata.device?.manufacturer,r.metadata.device?.model).joinToString(" "),"recordingMethod" to r.metadata.recordingMethod.toString(),"unit" to unit,"value" to value)
 }
}
