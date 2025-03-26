package com.myaccount.plugin.backgroundservice;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class NotificationReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "🔔 Notification received by receiver");
        Intent serviceIntent = new Intent(context, BackgroundService.class);
        serviceIntent.setAction("HANDLE_NOTIFICATION");
        serviceIntent.putExtra("title", intent.getStringExtra("title"));
        serviceIntent.putExtra("body", intent.getStringExtra("body"));
        context.startService(serviceIntent);
    }
}
