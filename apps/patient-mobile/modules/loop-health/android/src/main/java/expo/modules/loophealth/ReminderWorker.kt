package expo.modules.loophealth
import android.content.Context
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
class ReminderWorker(context:Context,params:WorkerParameters):CoroutineWorker(context,params){
 override suspend fun doWork():Result {
  if(Build.VERSION.SDK_INT>=33&&applicationContext.checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=PackageManager.PERMISSION_GRANTED)return Result.success()
  val manager=applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  manager.createNotificationChannel(NotificationChannel("loop-reminders","LNS Loop",NotificationManager.IMPORTANCE_DEFAULT))
  val launch=applicationContext.packageManager.getLaunchIntentForPackage(applicationContext.packageName)?:return Result.success()
  val pending=PendingIntent.getActivity(applicationContext,0,launch,PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  val text=if(inputData.getString("language")=="ko")"앱에서 참여 활동을 확인해 주세요." else "Check your participation activities in the app."
  val notification=NotificationCompat.Builder(applicationContext,"loop-reminders").setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("LNS Loop").setContentText(text).setContentIntent(pending).setAutoCancel(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build()
  manager.notify(701,notification);return Result.success()
 }
}
