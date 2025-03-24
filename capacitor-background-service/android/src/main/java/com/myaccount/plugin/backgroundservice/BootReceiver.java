package com.myaccount.plugin.backgroundservice;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.d(TAG, "🔄 Device rebooted - Checking if BackgroundService needs to restart...");

            // ✅ לפני שמפעילים את ה-Job, לבדוק אם השירות כבר רץ
            if (!isServiceRunning(context, BackgroundService.class)) {
                Log.d(TAG, "🚀 BackgroundService is NOT running - Restarting JobScheduler...");
                RestartJobService.scheduleJob(context);
            } else {
                Log.d(TAG, "✅ BackgroundService is already running - No need to restart.");
            }
        } else {
            Log.w(TAG, "⚠️ BootReceiver triggered with unexpected intent: " + intent);
        }
    }

    /**
     * ✅ פונקציה לבדיקה אם השירות כבר רץ
     */
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
