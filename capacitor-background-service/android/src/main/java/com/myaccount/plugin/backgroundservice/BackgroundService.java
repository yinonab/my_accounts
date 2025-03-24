package com.myaccount.plugin.backgroundservice;

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
import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;
import org.json.JSONObject;
import java.net.URISyntaxException;
import android.os.Handler;
import android.os.Looper;

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

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "🚀 Background Service Created");

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
            if (wakeLock == null || !wakeLock.isHeld()) { // ✅ בדיקה אם WakeLock כבר קיים
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BackgroundService:WakeLock");
                wakeLock.acquire();
                Log.d(TAG, "✅ WakeLock acquired – service will stay alive.");
            } else {
                Log.d(TAG, "⚠️ WakeLock already acquired.");
            }
        } else {
            Log.e(TAG, "❌ Failed to acquire WakeLock!");
        }


        // ✅ יצירת ערוץ נוטיפיקציה
        createNotificationChannel();
        startForegroundServiceMode();
        connectWebSocket();
        
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "🔄 Background Service restarted (START_STICKY)");

        // ✅ בדיקת פעולות `Foreground` / `Background`
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            if ("START_FOREGROUND".equals(action)) {
                startForegroundServiceMode();
            } else if ("STOP_FOREGROUND".equals(action)) {
                stopForegroundServiceMode();
            }
        } else {
            // כברירת מחדל, התחל במצב `Foreground`
            startForegroundServiceMode();
        }

        RestartJobService.scheduleJob(this);
        if (mSocket == null || !mSocket.connected()) {
            connectWebSocket();
        }
        return START_STICKY;
    }

     private void connectWebSocket() {
        try {
            Log.d(TAG, "🔌 Connecting to WebSocket...");
            mSocket = IO.socket("https://backend-my-accounts.onrender.com");  // 🔴 שנה לכתובת השרת שלך
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
        if (mSocket != null) {
            if (!mSocket.connected()) {
                Log.d(TAG, "🔄 Attempting to reconnect WebSocket...");
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
            startForeground(1, getNotification());
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
                NotificationManager.IMPORTANCE_LOW
            );

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    private Notification getNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("App Running in Background")
            .setContentText("This service keeps the app running")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build();
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
