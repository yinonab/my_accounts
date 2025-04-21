package com.myaccount.plugin.backgroundservice;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PluginCall;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;



@CapacitorPlugin(name = "BackgroundService")
public class BackgroundServicePlugin extends Plugin {
    private static final String TAG = "BackgroundServicePlugin";
    private PowerManager.WakeLock wakeLock;

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "✅ BackgroundServicePlugin has been loaded successfully!");

        // ✅ יצירת WakeLock כדי למנוע מצב שינה
        PowerManager powerManager = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BackgroundService:WakeLock");
            wakeLock.acquire();
            Log.d(TAG, "✅ WakeLock acquired, service will not be killed by system.");
        } else {
            Log.e(TAG, "❌ Failed to acquire WakeLock!");
        }
    }

    @PluginMethod
    public void startService(PluginCall call) {
        Log.d(TAG, "🚀 Starting Background Service...");

        try {
            Intent serviceIntent = new Intent(getContext(), BackgroundService.class);
            // BackgroundService.setStaticBridge(getBridge());

            // ✅ בדיקה אם השירות כבר רץ כדי למנוע הפעלה כפולה
            if (!isServiceRunning(BackgroundService.class)) {
                getContext().startForegroundService(serviceIntent);
                Log.d(TAG, "✔ Background Service Started Successfully!");
            } else {
                Log.d(TAG, "⚠️ Background Service is already running.");
            }

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "❌ Error starting service: " + e.getMessage());
            call.reject("Failed to start service", e);
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Log.d(TAG, "🛑 Stopping Background Service...");

        try {
            Intent serviceIntent = new Intent(getContext(), BackgroundService.class);
            getContext().stopService(serviceIntent);
            Log.d(TAG, "✔ Background Service Stopped Successfully!");

            // ✅ שחרור ה-WakeLock כדי לא לבזבז סוללה
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                Log.d(TAG, "✅ WakeLock released.");
            }

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "❌ Error stopping service: " + e.getMessage());
            call.reject("Failed to stop service", e);
        }
    }

    @PluginMethod
    public void startForegroundService(PluginCall call) {
        Log.d(TAG, "🚀 Switching to Foreground Service...");
        try {
            Intent serviceIntent = new Intent(getContext(), BackgroundService.class);
            serviceIntent.setAction("START_FOREGROUND");

            // ✅ בדיקה אם השירות כבר רץ לפני שינוי למצב Foreground
            if (!isServiceRunning(BackgroundService.class)) {
                getContext().startForegroundService(serviceIntent);
                Log.d(TAG, "✔ Foreground Service Started Successfully!");
            } else {
                Log.d(TAG, "⚠️ Service is already running, switching to foreground.");
                getContext().startService(serviceIntent);
            }

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "❌ Error switching to foreground: " + e.getMessage());
            call.reject("Failed to start foreground service", e);
        }
    }

    @PluginMethod
    public void stopForegroundService(PluginCall call) {
        Log.d(TAG, "🛑 Stopping Foreground Service...");
        try {
            Intent serviceIntent = new Intent(getContext(), BackgroundService.class);
            serviceIntent.setAction("STOP_FOREGROUND");
            getContext().startService(serviceIntent);
            Log.d(TAG, "✔ Foreground Service Stopped Successfully!");

            // ✅ שחרור ה-WakeLock במקרה שהשירות נכנס לרקע
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                Log.d(TAG, "✅ WakeLock released.");
            }

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "❌ Error stopping foreground: " + e.getMessage());
            call.reject("Failed to stop foreground service", e);
        }
    }

    @PluginMethod
public void saveUserData(PluginCall call) {
    String userId = call.getString("userId");
    String fcmToken = call.getString("fcmToken");

    Log.d("PLUGIN", "📥 saveUserData from Angular: userId=" + userId + ", fcmToken=" + fcmToken);

    // שמור ל־SharedPreferences:
    Context context = getContext();
    SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
    SharedPreferences.Editor editor = prefs.edit();
    editor.putString("userId", userId);
    editor.putString("fcmToken", fcmToken);
    editor.apply();

    JSObject result = new JSObject();
    result.put("success", true);
    call.resolve(result);
}


    /**
     * ✅ פונקציה לבדיקה אם השירות כבר רץ (כדי למנוע הפעלה כפולה)
     */
    private boolean isServiceRunning(Class<?> serviceClass) {
        ActivityManager manager = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
            if (serviceClass.getName().equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }
}
