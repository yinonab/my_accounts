package com.myaccount.plugin.backgroundservice;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class BackgroundDatabaseManager {

    private static final String TAG = "BackgroundDatabaseManager";
    private static final String DB_FAILURE_CHANNEL_ID = "DB_FAILURE_CHANNEL";

    private final Context context;
    private final MyDatabaseHelper dbHelper;

    public interface UserDataCallback {
        void onResult(String userId, String fcmToken);
    }

    public BackgroundDatabaseManager(Context context) {
        Log.d(TAG, "\uD83C\uDF0C Constructor called");
        this.context = context.getApplicationContext();
        this.dbHelper = new MyDatabaseHelper(this.context);
    }

    public boolean isDatabaseReady() {
        return true;
    }

    public void ensureConnectionReady(Runnable afterReady) {
        afterReady.run();
    }

    public void waitForReady(Runnable afterReady) {
        afterReady.run();
    }

    public void attemptDatabaseConnection(Runnable afterConnectionReady) {
        afterConnectionReady.run();
    }

    public void getUserData(UserDataCallback callback) {
        Log.d(TAG, "\uD83D\uDD22 Getting user data via MyDatabaseHelper...");
        try {
            MyDatabaseHelper.UserData userData = dbHelper.getUserData();
            if (userData != null) {
                callback.onResult(userData.userId, userData.fcmToken);
            } else {
                callback.onResult(null, null);
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error fetching user data", e);
            callback.onResult(null, null);
        }
    }

    public void closeConnection() {
        Log.d(TAG, "\uD83D\uDD13 closeConnection called (no-op)");
    }

    public void showDatabaseFailureNotification() {
        Log.d(TAG, "\uD83D\uDEA8 showDatabaseFailureNotification called");
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            Log.e(TAG, "❌ Failed to get NotificationManager");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                DB_FAILURE_CHANNEL_ID,
                "Database Failure Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            notificationManager.createNotificationChannel(channel);
        }

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) {
            Log.e(TAG, "❌ No launch intent found for package");
            return;
        }
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_IMMUTABLE : PendingIntent.FLAG_UPDATE_CURRENT
        );

        Intent retryIntent = new Intent(context, BackgroundService.RetryDatabaseReceiver.class);
        PendingIntent retryPendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            retryIntent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_IMMUTABLE : PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification notification = new NotificationCompat.Builder(context, DB_FAILURE_CHANNEL_ID)
            .setContentTitle("\uD83D\uDEA8 בעיה בגישה לנתונים")
            .setContentText("האפליקציה לא הצליחה להתחבר למסד הנתונים. לחץ לפתיחה או נסה שוב.")
            .setSmallIcon(R.mipmap.ic_launcher_foreground)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .addAction(R.mipmap.ic_launcher_foreground, "\uD83D\uDD04 נסה שוב", retryPendingIntent)
            .setAutoCancel(true)
            .build();

        notificationManager.notify(2, notification);
    }
}
