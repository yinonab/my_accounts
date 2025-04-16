package com.myaccount.plugin.backgroundservice;
import com.getcapacitor.BridgeActivity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "FCMService";
    private static final String CHANNEL_ID = "fcm_channel";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "🔑 New FCM Token: " + token);
        // ניתן לשלוח את הטוקן לשרת אם נדרש
    }

    @Override
public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
    super.onMessageReceived(remoteMessage);
    Log.d(TAG, "📩 Notification received: " + remoteMessage.getData());

    boolean isSilent = "true".equals(remoteMessage.getData().get("silent"));

    if (isSilent) {
        Log.d(TAG, "🤫 Silent notification received. No need to show notification.");
        startBackgroundService();
        return; // לא מציגים התראה
    }

    // אם יש הודעת Notification רגילה
    if (remoteMessage.getNotification() != null) {
        Log.d(TAG, "🔔 Title: " + remoteMessage.getNotification().getTitle());
        Log.d(TAG, "🔔 Body: " + remoteMessage.getNotification().getBody());
        showNotification(remoteMessage);
    } else if (remoteMessage.getData().size() > 0) {
        Log.d(TAG, "📩 Handling data-only notification...");
        showNotification(remoteMessage);
    }

    // תמיד להפעיל את ה-BackgroundService
    startBackgroundService();
}



    /**
     * מציג נוטיפיקציה כאשר הודעה מתקבלת
     */
  private void showNotification(RemoteMessage remoteMessage) {
    Context context = getApplicationContext();
    NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

    if (notificationManager == null) {
        Log.e(TAG, "❌ NotificationManager is null");
        return;
    }

    String title = "Notification"; // ברירת מחדל
    String body = "You have a new message";

    if (remoteMessage.getNotification() != null) {
        title = remoteMessage.getNotification().getTitle();
        body = remoteMessage.getNotification().getBody();
    } else if (remoteMessage.getData().size() > 0) {
        title = remoteMessage.getData().get("title");
        body = remoteMessage.getData().get("body");
    }
    Intent intent = new Intent(context, BridgeActivity.class);
    //Intent intent = new Intent(context, MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

    PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "FCM Channel", NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Firebase Cloud Messaging Channel");
        channel.enableLights(true);
        channel.enableVibration(true);
        notificationManager.createNotificationChannel(channel);
    }

    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title != null ? title : "New Message")
            .setContentText(body != null ? body : "")
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent);

    notificationManager.notify((int) System.currentTimeMillis(), builder.build());

    Log.d(TAG, "✅ Notification displayed: " + title + " - " + body);
}


    

    /**
     * מפעיל את שירות הרקע אם נדרש
     */
   private void startBackgroundService() {
    Context context = getApplicationContext();
    // if (isServiceRunning(BackgroundService.class)) { // ✅ בדיקה אם השירות כבר רץ
    //     Log.d(TAG, "⚠ Background Service is already running.");
    //     return;
    // }
    
    Intent serviceIntent = new Intent(context, BackgroundService.class);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(serviceIntent);
    } else {
        context.startService(serviceIntent);
    }
}

}