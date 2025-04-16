package com.myaccount.plugin.backgroundservice;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "⏰ Alarm triggered - checking BackgroundService...");

        // חשוב: לא סתם להפעיל, אלא לבדוק אם כבר רץ
        if (!isServiceRunning(context, BackgroundService.class)) {
            Log.d(TAG, "🔄 BackgroundService not running, starting it...");
            Intent serviceIntent = new Intent(context, BackgroundService.class);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } else {
            Log.d(TAG, "✅ BackgroundService already running, no need to start.");
        }
    }

    private boolean isServiceRunning(Context context, Class<?> serviceClass) {
        android.app.ActivityManager manager = (android.app.ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        for (android.app.ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
            if (serviceClass.getName().equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }
}
