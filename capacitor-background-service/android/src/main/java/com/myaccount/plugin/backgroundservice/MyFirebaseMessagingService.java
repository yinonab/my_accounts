package com.myaccount.plugin.backgroundservice;

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

    // ✅ אם יש "notification" - מציג כרגיל
    if (remoteMessage.getNotification() != null) {
        Log.d(TAG, "🔔 Title: " + remoteMessage.getNotification().getTitle());
        Log.d(TAG, "🔔 Body: " + remoteMessage.getNotification().getBody());
        showNotification(remoteMessage);
    } 
    // ✅ אם זו הודעת `data` בלבד - בונה ידנית
    else if (remoteMessage.getData().size() > 0) {
        Log.d(TAG, "📩 Handling `data`-only notification...");
        
        String title = remoteMessage.getData().get("title");
        String body = remoteMessage.getData().get("body");
        showNotification(remoteMessage);

    }

    // ✅ הפעלת שירות רק אם נדרש
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

    // קבלת הנתונים מההתראה
    String title = "Notification"; // ערך ברירת מחדל
    String body = "You have a new message"; // ערך ברירת מחדל

    if (remoteMessage.getNotification() != null) {
        // אם יש `notification` - נשתמש בו
        title = remoteMessage.getNotification().getTitle();
        body = remoteMessage.getNotification().getBody();
    } else if (remoteMessage.getData().size() > 0) {
        // אם ההודעה היא מסוג `data-only`
        title = remoteMessage.getData().get("title");
        body = remoteMessage.getData().get("body");
    }

    // יצירת Intent לפתיחת האפליקציה בעת לחיצה על ההתראה
    Intent intent = new Intent();
    intent.setClassName(context.getPackageName(), "com.myaccount.myapp.MainActivity");

    intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
    
    PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, intent, PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
    );

    // יצירת ערוץ נוטיפיקציות (נדרש עבור Android 8 ומעלה)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "FCM Channel", NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Firebase Cloud Messaging Channel");
        channel.enableLights(true);
        channel.enableVibration(true);
        notificationManager.createNotificationChannel(channel);
    }

    // בניית ההתראה
    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL) // ✅ מאפשר צליל ורטט
            .setContentIntent(pendingIntent);

    // הצגת ההתראה
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