package expo.modules.loophealth

import android.content.Intent
import android.net.Uri
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Coroutine
import java.time.Instant
import kotlin.reflect.KClass
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class LoopHealthModule : Module() {
 private val context get() = requireNotNull(appContext.reactContext)
 private val client get() = HealthConnectClient.getOrCreate(context)
 private val types get() = HealthRecords.types
 private val permissionMutex = Mutex()
 private suspend fun requestHealthPermissions(permissions:Set<String>):Set<String> = permissionMutex.withLock {
  withContext(Dispatchers.Main) {
   suspendCancellableCoroutine { continuation ->
    val activity=appContext.currentActivity as? ComponentActivity
    if(activity==null){continuation.resumeWithException(IllegalStateException("No active Android screen"));return@suspendCancellableCoroutine}
    val contract=androidx.health.connect.client.PermissionController.createRequestPermissionResultContract()
    lateinit var launcher:ActivityResultLauncher<Set<String>>
    launcher=activity.activityResultRegistry.register("loop-health-"+java.util.UUID.randomUUID(),contract){granted ->
     launcher.unregister()
     if(continuation.isActive)continuation.resume(granted)
    }
    continuation.invokeOnCancellation { activity.runOnUiThread { launcher.unregister() } }
    try{launcher.launch(permissions)}catch(error:Exception){launcher.unregister();if(continuation.isActive)continuation.resumeWithException(error)}
   }
  }
 }
 override fun definition() = ModuleDefinition {
  Name("LoopHealth")
  AsyncFunction("setReminders") { enabled:Boolean,language:String ->
   val manager=androidx.work.WorkManager.getInstance(context)
   if(!enabled){manager.cancelUniqueWork("loop-reminder");PrivateStore(context).delete("reminder");false}
   else if(android.os.Build.VERSION.SDK_INT>=33&&context.checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED){val activity=requireNotNull(appContext.currentActivity);activity.runOnUiThread{activity.requestPermissions(arrayOf("android.permission.POST_NOTIFICATIONS"),4824)};false}
   else{val task=androidx.work.PeriodicWorkRequestBuilder<ReminderWorker>(24,java.util.concurrent.TimeUnit.HOURS).setInitialDelay(24,java.util.concurrent.TimeUnit.HOURS).setInputData(androidx.work.workDataOf("language" to language)).addTag("loop-health").build();manager.enqueueUniquePeriodicWork("loop-reminder",androidx.work.ExistingPeriodicWorkPolicy.UPDATE,task);PrivateStore(context).write("reminder","true");true}
  }
  AsyncFunction("rationaleRequested") { appContext.currentActivity?.intent?.action in setOf("androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE","android.intent.action.VIEW_PERMISSION_USAGE") }
  AsyncFunction("capabilities") { val available=HealthConnectClient.getSdkStatus(context)==HealthConnectClient.SDK_AVAILABLE; mapOf("types" to if(available) types.keys.toList() else emptyList<String>(),"background" to (available && client.features.getFeatureStatus(androidx.health.connect.client.HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND)==androidx.health.connect.client.HealthConnectFeatures.FEATURE_STATUS_AVAILABLE),"history" to (available && client.features.getFeatureStatus(androidx.health.connect.client.HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_HISTORY)==androidx.health.connect.client.HealthConnectFeatures.FEATURE_STATUS_AVAILABLE)) }
  AsyncFunction("requestHistory") Coroutine { -> requestHealthPermissions(setOf("android.permission.health.READ_HEALTH_DATA_HISTORY")).toList() }
  AsyncFunction("getChangesToken") Coroutine { names:List<String> -> client.getChangesToken(androidx.health.connect.client.request.ChangesTokenRequest(recordTypes=names.mapNotNull{types[it]}.toSet())) }
  AsyncFunction("readChanges") Coroutine { token:String -> val response=client.getChanges(token);mapOf("nextToken" to response.nextChangesToken,"hasMore" to response.hasMore,"expired" to response.changesTokenExpired,"changes" to response.changes.mapNotNull { change -> when(change){is androidx.health.connect.client.changes.UpsertionChange -> { val name=types.entries.firstOrNull{it.value.java.isInstance(change.record)}?.key; if(name==null)null else mapOf("kind" to "upsert","record" to HealthRecords.serialize(name,change.record)) };is androidx.health.connect.client.changes.DeletionChange -> mapOf("kind" to "delete","id" to change.recordId);else -> null } }) }

  AsyncFunction("writePrivate") { key:String,value:String -> PrivateStore(context).write(key,value) }
  AsyncFunction("readPrivate") { key:String -> PrivateStore(context).read(key) }
  AsyncFunction("deletePrivate") { key:String -> PrivateStore(context).delete(key) }
  AsyncFunction("cancelAutomatic") { androidx.work.WorkManager.getInstance(context).cancelAllWorkByTag("loop-health"); PrivateStore(context).clear() }
  AsyncFunction("cancelAutomaticStudy") { id:String -> androidx.work.WorkManager.getInstance(context).cancelUniqueWork("loop-"+id); PrivateStore(context).delete("auto-"+id) }
  AsyncFunction("configureAutomatic") Coroutine { id:String,token:String,url:String ->
   require(url.startsWith("https://") || (0 != context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)) { "HTTPS required" }
   val granted=client.permissionController.getGrantedPermissions()
   require(client.features.getFeatureStatus(androidx.health.connect.client.HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND)==androidx.health.connect.client.HealthConnectFeatures.FEATURE_STATUS_AVAILABLE){"Background access unavailable on this device"}
   if("android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND" !in granted){
    val result=requestHealthPermissions(setOf("android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND"))
    require("android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND" in result){"Background health access was not granted"}
   }
   PrivateStore(context).write("auto-"+id,org.json.JSONObject().put("token",token).put("url",url).toString())
   val work=androidx.work.PeriodicWorkRequestBuilder<ShareWorker>(6,java.util.concurrent.TimeUnit.HOURS).setInputData(androidx.work.workDataOf("studyId" to id)).setConstraints(androidx.work.Constraints.Builder().setRequiredNetworkType(androidx.work.NetworkType.CONNECTED).build()).addTag("loop-health").build()
   androidx.work.WorkManager.getInstance(context).enqueueUniquePeriodicWork("loop-"+id,androidx.work.ExistingPeriodicWorkPolicy.UPDATE,work)
  }

  AsyncFunction("availability") { mapOf("available" to (HealthConnectClient.getSdkStatus(context)==HealthConnectClient.SDK_AVAILABLE),"reason" to "Health Connect must be installed and up to date") }
  AsyncFunction("permissions") Coroutine { names:List<String> -> val granted=client.permissionController.getGrantedPermissions(); names.filter { types[it]?.let { t->HealthPermission.getReadPermission(t) in granted }==true } }
  AsyncFunction("requestPermissions") Coroutine { names:List<String> ->
   val permissions=names.mapNotNull{types[it]?.let{t->HealthPermission.getReadPermission(t)}}.toSet()
   requestHealthPermissions(permissions).toList()
  }
  AsyncFunction("openSettings") {context.startActivity(Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))}
  AsyncFunction("install") {context.startActivity(Intent(Intent.ACTION_VIEW,Uri.parse("market://details?id=com.google.android.apps.healthdata")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))}
  AsyncFunction("read") Coroutine { names:List<String>,start:String,end:String ->
   val records=mutableListOf<Map<String,Any?>>()
   val granted=client.permissionController.getGrantedPermissions()
   for(name in names){val type=types[name]?:continue;if(HealthPermission.getReadPermission(type) !in granted)continue
    var page:String?=null
    do {val response=client.readRecords(ReadRecordsRequest(recordType=type,timeRangeFilter=TimeRangeFilter.between(Instant.parse(start),Instant.parse(end)),pageToken=page));for(r in response.records)HealthRecords.bounded(name,r,Instant.parse(start),Instant.parse(end))?.let{records.add(it)};page=response.pageToken}while(!page.isNullOrEmpty())
   };records
  }
  AsyncFunction("aggregate") Coroutine { names:List<String>,start:String,end:String ->
   val result=mutableMapOf<String,Any?>();val granted=client.permissionController.getGrantedPermissions()
   if("steps" in names&&HealthPermission.getReadPermission(StepsRecord::class) in granted){val r=client.aggregate(AggregateRequest(metrics=setOf(StepsRecord.COUNT_TOTAL),timeRangeFilter=TimeRangeFilter.between(Instant.parse(start),Instant.parse(end))));result["steps"]=r[StepsRecord.COUNT_TOTAL]}
   result
  }
 }

}
