package expo.modules.loophealth
import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONObject
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
class ShareWorker(context:Context,params:WorkerParameters):CoroutineWorker(context,params){
 override suspend fun doWork():Result=withContext(Dispatchers.IO){
  val id=inputData.getString("studyId")?:return@withContext Result.failure()
  val store=PrivateStore(applicationContext)
  val settings=store.read("auto-"+id)?.let{JSONObject(it)}?:return@withContext Result.success()
  fun request(path:String,payload:JSONObject?=null):String {val c=URL(settings.getString("url")+path).openConnection() as HttpURLConnection;try{c.connectTimeout=15000;c.readTimeout=15000;c.setRequestProperty("Authorization","Bearer "+settings.getString("token"));if(payload!=null){c.requestMethod="POST";c.doOutput=true;c.setRequestProperty("Content-Type","application/json");c.outputStream.use{it.write(payload.toString().toByteArray())}};if(c.responseCode in listOf(401,403,409)){store.delete("auto-"+id);error("inactive")};check(c.responseCode in 200..299);return c.inputStream.bufferedReader().use{it.readText()}}finally{c.disconnect()}}
  try {
   val enrollments=JSONArray(request("/enrollments"));val enrollment=(0 until enrollments.length()).map{enrollments.getJSONObject(it)}.find{it.getString("study_id")==id&&!it.isNull("consent_at")&&it.isNull("withdrawn_at")&&it.getBoolean("auto_share")}?:return@withContext Result.success()
   val study=JSONObject(request("/studies/"+id));if(study.getInt("version")!=enrollment.getInt("version")||study.getString("status")!="published")return@withContext Result.success()
   val config=study.getJSONObject("config");val window=JSONObject(request("/studies/"+id+"/window"));val start=Instant.parse(window.getString("start"));val end=minOf(Instant.parse(window.getString("end")),Instant.now());if(!end.isAfter(start))return@withContext Result.success()
   val client=HealthConnectClient.getOrCreate(applicationContext);val permissions=client.permissionController.getGrantedPermissions();if("android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND" !in permissions){store.delete("auto-"+id);return@withContext Result.success()}
   val records=JSONArray();val names=config.getJSONArray("types")
   for(i in 0 until names.length()){val name=names.getString(i);val type=HealthRecords.types[name]?:continue;if(HealthPermission.getReadPermission(type) !in permissions)continue;var page:String?=null;do{val response=client.readRecords(ReadRecordsRequest(recordType=type,timeRangeFilter=TimeRangeFilter.between(start,end),pageToken=page));for(r in response.records){HealthRecords.bounded(name,r,start,end)?.let{records.put(JSONObject(it))}};page=response.pageToken}while(!page.isNullOrEmpty())}
   if(isStopped||store.read("auto-"+id)==null)return@withContext Result.success()
   if(records.length()>0)request("/submissions",JSONObject().put("mode","automatic").put("studyId",id).put("version",study.getInt("version")).put("activity","health").put("periodStart",window.getString("start")).put("periodEnd",window.getString("end")).put("records",records).put("answers",JSONObject()))
   Result.success()
  }catch(e:Exception){if(store.read("auto-"+id)==null)Result.success() else Result.retry()}
 }
}
