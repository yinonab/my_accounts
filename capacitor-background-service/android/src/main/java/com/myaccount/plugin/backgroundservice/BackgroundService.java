package com.myaccount.plugin.backgroundservice;
import com.myaccount.plugin.backgroundservice.EnableLocationActivity;

import android.provider.Settings;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;
import java.util.concurrent.TimeUnit;
import com.myaccount.plugin.backgroundservice.R;




import android.app.PendingIntent;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import android.app.ActivityManager;
import android.app.Service;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import android.content.Context;
import android.content.SharedPreferences;

import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;
import org.json.JSONObject;
import java.net.URISyntaxException;
import android.os.Handler;
import android.os.Looper;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationResult;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;
import android.net.Uri;


import android.net.Uri;


public class BackgroundService extends Service {

    private static final String TAG = "BackgroundService";
    private static final String CHANNEL_ID = "BackgroundServiceChannel";
    private PowerManager.WakeLock wakeLock;
    private boolean isForeground = false;
    private Socket mSocket;
    private final Handler pingHandler = new Handler(Looper.getMainLooper());
    private static final long PING_INTERVAL = 10000; 
    private static final int MAX_RECONNECT_ATTEMPTS = 5; // מספר מקסימלי של ניסיונות חיבור מחדש
    private int reconnectAttempts = 0; // סופר את מספר הניסיונות
    private boolean isPinging = false;
    private boolean isReconnecting = false;
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private RequestQueue requestQueue;
    private static final long LOCATION_UPDATE_INTERVAL = 30000; // 30 שניות
    private static final double SAFE_ZONE_LAT = 40.7128; // קו רוחב
    private static final double SAFE_ZONE_LNG = -74.0060; // קו אורך
    private static final double SAFE_ZONE_RADIUS = 0.001; // חצי ק"מ

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "🚀 Background Service Created");
         createNotificationChannel();
        startForegroundServiceMode();
        requestUserToEnableLocationAndPermissions();
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        requestQueue = Volley.newRequestQueue(this);
        startLocationTracking(); // ✅ הפעלת מעקב אחר מיקום
        acquireWakeLock();
        startForegroundServiceMode(); // ✅ הפעלת השירות כ-Foreground Service
        scheduleLocationWorker();

        PowerManager pm = (PowerManager) getApplicationContext().getSystemService(Context.POWER_SERVICE);
        if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
            Log.d(TAG, "⚠️ Requesting battery optimization exemption...");
            Intent intent = new Intent();
            intent.setAction(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } else {
            Log.d(TAG, "✅ Battery optimizations already disabled!");
        }

        // ✅ יצירת WakeLock כדי למנוע כיבוי
       PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            if (wakeLock == null || !wakeLock.isHeld()) { 
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BackgroundService:WakeLock");
                wakeLock.setReferenceCounted(false); // ✅ לוודא שלא משחררים בטעות
                wakeLock.acquire();
                Log.d(TAG, "✅ WakeLock acquired – service will stay alive.");
            } else {
                Log.d(TAG, "⚠️ WakeLock already acquired.");
            }
        } else {
            Log.e(TAG, "❌ Failed to acquire WakeLock!");
        }



        // ✅ יצירת ערוץ נוטיפיקציה
       
        connectWebSocket();
        
    }

   @Override
public int onStartCommand(Intent intent, int flags, int startId) {
    Log.d(TAG, "🔄 Background Service restarted (START_STICKY)");

    // ✅ בדיקת פעולות `Foreground` / `Background`
    if (intent != null && intent.getAction() != null) {
        String action = intent.getAction();
        switch (action) {
            case "START_FOREGROUND":
                startForegroundServiceMode();
                break;
            case "STOP_FOREGROUND":
                stopForegroundServiceMode();
                break;
            
        }
    } else {
        // כברירת מחדל, התחל במצב `Foreground`
        startForegroundServiceMode();
    }

    // ✅ שמירת פונקציות קיימות (ללא שינוי)
    RestartJobService.scheduleJob(this);
    if (mSocket == null || !mSocket.connected()) {
        connectWebSocket();
    }

    return START_STICKY;
}


    private void scheduleLocationWorker() {
    Log.d(TAG, "📅 Scheduling WorkManager task...");

    PeriodicWorkRequest locationWorkRequest = 
        new PeriodicWorkRequest.Builder(LocationWorker.class, 3, TimeUnit.MINUTES)
            .setInitialDelay(0, TimeUnit.MINUTES)
            .build();

    WorkManager.getInstance(this).enqueueUniquePeriodicWork(
        "LocationWorker",
        ExistingPeriodicWorkPolicy.REPLACE,
        locationWorkRequest
    );
    }

    private void acquireWakeLock() {
    PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
    if (powerManager != null) {
        if (wakeLock == null || !wakeLock.isHeld()) { 
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BackgroundService:WakeLock");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire();
            Log.d(TAG, "✅ WakeLock acquired – service will stay alive.");
        } else {
            Log.d(TAG, "⚠️ WakeLock already acquired.");
        }
    } else {
        Log.e(TAG, "❌ Failed to acquire WakeLock!");
    }
    }



     private void connectWebSocket() {
        try {
            Log.d(TAG, "\uD83D\uDD10 Connecting to WebSocket...");
            mSocket = IO.socket("https://backend-my-accounts.onrender.com");
            mSocket.connect();
            
            
            // ✅ מאזין להודעות פינג מהשרת
            mSocket.on("pong", new Emitter.Listener() {
               // @Override
                public void call(Object... args) {
                    Log.d(TAG, "🏓 Pong received from server!");
                }
            });

            // ✅ מאזין לחיבור מחדש
            mSocket.on(Socket.EVENT_CONNECT, new Emitter.Listener() {
             //   @Override
                public void call(Object... args) {
                    Log.d(TAG, "✅ WebSocket connected!");
                    reconnectAttempts = 0;
                     startPinging();
                }
            });

            // ✅ מאזין לניתוקים
            mSocket.on(Socket.EVENT_DISCONNECT, new Emitter.Listener() {
             //   @Override
                public void call(Object... args) {
                    Log.e(TAG, "❌ WebSocket disconnected! Attempting reconnect...");
                    reconnectWebSocket();
                }
            });

        } catch (URISyntaxException e) {
            Log.e(TAG, "❌ WebSocket connection error: " + e.getMessage());
        }
    }
           private void requestUserToEnableLocationAndPermissions() {
    Log.d(TAG, "⚠️ Requesting user to enable location settings...");

    Intent intent = new Intent(getApplicationContext(), EnableLocationActivity.class);
    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK); // חובה עבור Service
    startActivity(intent);
}



    private void startLocationTracking() {
      LocationRequest locationRequest = new LocationRequest.Builder(LOCATION_UPDATE_INTERVAL)
        .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY)
        .build();



        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;

                double latitude = locationResult.getLastLocation().getLatitude();
                double longitude = locationResult.getLastLocation().getLongitude();

                Log.d(TAG, "📍 מיקום עודכן: " + latitude + ", " + longitude);
                checkAndSendLocation(latitude, longitude);
            }
        };
        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
    }
    public interface Callback {
    void onResult(String userId, String fcmToken);
}


   private void checkAndSendLocation(double lat, double lng) {
        getUserData((userId, fcmToken) -> {
            if (userId == null || fcmToken == null || userId.isEmpty() || fcmToken.isEmpty()) {
                Log.e(TAG, "❌ userId או FCM Token חסרים! לא שולח מיקום.");
                return;
            }

            double distance = getDistance(lat, lng, SAFE_ZONE_LAT, SAFE_ZONE_LNG) * 1000;
            Log.d(TAG, "🔍 מרחק מהאזור המוגדר: " + distance + " מטרים");

            if (distance > SAFE_ZONE_RADIUS) {
                Log.d(TAG, "🚨 יציאה מהאזור! שולח נתונים לשרת...");
                sendLocationToServer(userId, lat, lng, fcmToken);
            }
        });
    }

    private void sendLocationToServer(String userId, double lat, double lng, String fcmToken) {
        JSONObject jsonBody = new JSONObject();
        try {
            jsonBody.put("userId", userId);
            jsonBody.put("lat", lat);
            jsonBody.put("lng", lng);
            jsonBody.put("token", fcmToken);

            JsonObjectRequest request = new JsonObjectRequest(Request.Method.POST, "https://backend-my-accounts.onrender.com/api/geolocation/update-location", jsonBody,
                    response -> Log.d(TAG, "📡 מיקום נשלח בהצלחה!"),
                    error -> Log.e(TAG, "❌ שגיאה בשליחת מיקום", error));

            requestQueue.add(request);
        } catch (JSONException e) {
            Log.e(TAG, "❌ JSON Error: " + e.getMessage());
        }
    }




     private double getDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // רדיוס כדור הארץ במטרים
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

   
 




    private void reconnectWebSocket() {
    if (isReconnecting) {
        Log.d(TAG, "⚠️ Reconnect already in progress, skipping...");
        return;
    }

    if (mSocket != null && mSocket.connected()) { 
        Log.d(TAG, "✅ WebSocket is already connected, skipping reconnect.");
        return;
    }

    isReconnecting = true;

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        Log.d(TAG, "🔄 Attempting to reconnect WebSocket (attempt " + reconnectAttempts + "/" + MAX_RECONNECT_ATTEMPTS + ")");

        if (mSocket != null) {
            if (!mSocket.connected()) {
                pingHandler.postDelayed(() -> {
                    mSocket.connect();
                    isReconnecting = false;
                }, 1500);
            } else {
                Log.d(TAG, "✅ WebSocket is already connected, skipping reconnect.");
                isReconnecting = false;
            }
        } else {
            Log.e(TAG, "❌ WebSocket instance is null! Creating a new connection...");
            connectWebSocket();
            isReconnecting = false;
        }
    } else {
        Log.e(TAG, "❌ Max reconnect attempts reached! Waiting before retrying...");
        reconnectAttempts = 0;
        pingHandler.postDelayed(this::connectWebSocket, 5000);
        isReconnecting = false;
    }
}

//private void getUserData(Callback callback) {
//    try {
//        SharedPreferences sharedPreferences = getApplicationContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
//        String userId = sharedPreferences.getString("userId", null);
//        String fcmToken = sharedPreferences.getString("fcmToken", null);
//
//        if (userId == null || fcmToken == null || userId.isEmpty() || fcmToken.isEmpty()) {
//            Log.e(TAG, "❌ userId או fcmToken חסרים! לא שולח מיקום.");
//            return;
//        }
//
//        callback.onResult(userId, fcmToken);
//    } catch (Exception e) {
//        Log.e(TAG, "❌ שגיאה בגישה לנתונים המאוחסנים:", e);
//    }
//}


private void getUserData(Callback callback) {
    try {
        // קריאה ל-SecureStoragePlugin לשם שליפת userId
        SecureStoragePlugin.getString("userId", new SecureStoragePlugin.Callback() {
            @Override
            public void onSuccess(String value) {
                String userId = value;

                // קריאה ל-SecureStoragePlugin לשם שליפת fcmToken
                SecureStoragePlugin.getString("fcmToken", new SecureStoragePlugin.Callback() {
                    @Override
                    public void onSuccess(String value) {
                        String fcmToken = value;

                        if (userId == null || fcmToken == null || userId.isEmpty() || fcmToken.isEmpty()) {
                            Log.e(TAG, "❌ userId או fcmToken חסרים! לא שולח מיקום.");
                            return;
                        }

                        callback.onResult(userId, fcmToken);
                    }

                    @Override
                    public void onError(Throwable error) {
                        Log.e(TAG, "❌ שגיאה בשליפת fcmToken:", error);
                    }
                });
            }

            @Override
            public void onError(Throwable error) {
                Log.e(TAG, "❌ שגיאה בשליפת userId:", error);
            }
        });
    } catch (Exception e) {
        Log.e(TAG, "❌ שגיאה בגישה לנתונים המאוחסנים:", e);
    }
}





    private void startPinging() {
        if (isPinging) {
            Log.d(TAG, "⚠️ Ping is already running, skipping duplicate execution.");
            return;
        }
        isPinging = true;
        pingHandler.removeCallbacksAndMessages(null);
    pingHandler.postDelayed(new Runnable() {
        @Override
        public void run() {
            if (mSocket != null) {
                if (mSocket != null && mSocket.connected()) {
                    Log.d(TAG, "📡 Sending ping to server...");
                    mSocket.emit("ping");
                    reconnectAttempts = 0; // איפוס מספר ניסיונות החיבור כי החיבור פעיל
                } else {
                    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        reconnectAttempts++;
                        Log.e(TAG, "⚠️ WebSocket is disconnected. Attempting reconnect (" + reconnectAttempts + "/" + MAX_RECONNECT_ATTEMPTS + ")...");
                        reconnectWebSocket();
                    } else {
                        Log.e(TAG, "❌ Max reconnect attempts reached! Waiting before retrying...");
                        reconnectAttempts = 0; // איפוס ניסיונות וניסיון מחדש אחרי 10 שניות
                        pingHandler.postDelayed(this, 5000);
                        return;
                    }
                }
            } else {
                Log.e(TAG, "❌ WebSocket instance is null! Recreating connection...");
                connectWebSocket();
            }
            if (isPinging) {
                pingHandler.postDelayed(this, PING_INTERVAL);
            }
        }
    }, PING_INTERVAL);
}


    // ✅ הפעלת השירות במצב Foreground (אם הוא לא פעיל)
  public void startForegroundServiceMode() {
    if (!isForeground) {
        isForeground = true;

        // יצירת ערוץ נוטיפיקציה (חובה ב-Android 8 ומעלה)
        createNotificationChannel();

        // יצירת הנוטיפיקציה
       Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("App Running in Background")
        .setContentText("This service keeps the app running")
        .setSmallIcon(R.mipmap.ic_launcher_foreground) // השתמש באייקון מתוך תיקיית mipmap
        .setOngoing(true) 
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .build();


        startForeground(1, notification);
        Log.d(TAG, "✅ Service switched to Foreground mode");
    } else {
        Log.d(TAG, "⚠️ Service is already running in Foreground mode");
    }
}



    // ✅ עצירת ה-Foreground והחזרה ל-Background
    public void stopForegroundServiceMode() {
        if (isForeground) {
            stopForeground(true);
            isForeground = false;
            Log.d(TAG, "🛑 Service switched back to Background mode");
        } else {
            Log.d(TAG, "⚠️ Service is already running in Background mode");
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                CHANNEL_ID,
                "Background Service",
                NotificationManager.IMPORTANCE_HIGH
            );

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
                Log.d(TAG, "Notification channel created: " + serviceChannel.getId());
            }
        }
    }

   



    @Override
    public void onDestroy() {
        super.onDestroy();

        // ✅ בדיקה אם השירות עדיין רץ לפני שחרור ה-WakeLock
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "🛑 WakeLock released – service might be stopped by the system.");
        }

        // ✅ טיפול בהפעלה מחדש של השירות אם הוא נסגר על ידי המערכת
        if (!isServiceRunning(BackgroundService.class)) {
            Log.d(TAG, "🚀 Restarting Background Service...");
            Intent restartIntent = new Intent(getApplicationContext(), BackgroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getApplicationContext().startForegroundService(restartIntent);
            } else {
                getApplicationContext().startService(restartIntent);
            }
        }

        Log.d(TAG, "🛑 Background Service Stopped");
    }

    /**
     * ✅ פונקציה לבדיקה אם השירות כבר רץ (כדי למנוע הפעלה כפולה)
     */
    private boolean isServiceRunning(Class<?> serviceClass) {
        ActivityManager manager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
            if (serviceClass.getName().equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
