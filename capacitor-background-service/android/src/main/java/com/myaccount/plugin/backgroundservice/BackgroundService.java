package com.myaccount.plugin.backgroundservice;
import com.myaccount.plugin.backgroundservice.EnableLocationActivity;
// import com.whitestein.securestorage.SecureStoragePlugin;
// הוסף את הייבוא הזה בחלק העליון של הקובץ
import com.getcapacitor.Bridge;
import android.provider.Settings;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;
import java.util.concurrent.TimeUnit;
import com.myaccount.plugin.backgroundservice.R;
import android.content.SharedPreferences;
import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.community.database.sqlite.CapacitorSQLite;
import java.util.List;
import com.google.android.gms.location.LocationAvailability;
import java.util.Arrays;


import com.getcapacitor.community.database.sqlite.SQLite.SqliteConfig;
import com.android.volley.DefaultRetryPolicy;


import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

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
import java.util.ArrayList;
import org.json.JSONArray;
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
    private boolean initialized = false;
   private Handler locationHandler = new Handler(Looper.getMainLooper());
   private static final long LOCATION_POLL_INTERVAL = 4 * 60 * 1000; // 3 דקות במילישניות
   private boolean isPollingLocation = false;
   private Handler locationTimeoutHandler = new Handler(Looper.getMainLooper());
   private static final long LOCATION_TIMEOUT = 60000; // 60 שניות
   private boolean locationReceived = false;
   private CapacitorSQLite sqliteInstance;
   private com.getcapacitor.PluginHandle sqlitePlugin;
private BackgroundDatabaseManager dbManager;
private String globalUserId = null;
private String globalFcmToken = null;
private final Handler clearNotificationHandler = new Handler(Looper.getMainLooper());
private static final long CLEAR_NOTIFICATIONS_INTERVAL = 2 * 60 * 1000; // כל 2 דקות


private boolean isDatabaseOpen = false;
private static final int MAX_DB_RETRIES = 8;
private static final long DB_RETRY_DELAY_MS = 2000; // 2 שניות
private int dbRetryCount = 0;
private static final int MAX_SEND_RETRIES = 5;
private static final long RETRY_DELAY_MS = 30000; // 30 שניות
private static final String DB_FAILURE_CHANNEL_ID = "DB_FAILURE_CHANNEL";
// private Bridge bridge;
// private static Bridge staticBridge;
private Handler keepAliveHandler = new Handler(Looper.getMainLooper());
private static final long KEEP_ALIVE_INTERVAL = 2 * 60 * 1000; // 5 דקות במילישניות
private boolean isKeepAliveRunning = false;
private Handler webSocketKeepAliveHandler = new Handler(Looper.getMainLooper());
private static final long WEBSOCKET_KEEP_ALIVE_INTERVAL = 25000; // 25 שניות

private boolean isWebSocketKeepAliveRunning = false;







// public static void setStaticBridge(Bridge bridge) {
//     staticBridge = bridge;
// }
    

   @Override
public void onCreate() {
    super.onCreate();
    Log.d(TAG, "🚀 Background Service Created");

    // if (bridge == null && staticBridge != null) {
    //     bridge = staticBridge;
    // }

    // dbManager = new BackgroundDatabaseManager(this, bridge);
   
    dbManager = new BackgroundDatabaseManager(this);

    initialized = true;

    // ✅ דחייה חכמה לפני שמתחילים initEverything
    new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
        @Override
        public void run() {
            Log.d(TAG, "⏳ Delayed initEverything starting now...");
            initEverything();
        }
    }, 8000); // 3 שניות דיליי כדי לחכות לטעינת כל הפלגינים
}


   @Override
public int onStartCommand(Intent intent, int flags, int startId) {
    Log.d(TAG, "🔄 Background Service restarted (START_STICKY)");

    //  if (!initialized) {
    //     initialized = true;
    //     initEverything(); // ✅ קריאה אחת בלבד
    // }

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
            case "RETRY_DB_CONNECTION":
                Log.d(TAG, "🔄 User clicked Retry in notification! Trying to reconnect DB...");
                dbManager.attemptDatabaseConnection(() -> {
                    Log.d(TAG, "✅ Retry successful!");
                });
                break;
                    
        }
    } else {
        // כברירת מחדל, התחל במצב `Foreground`
        startForegroundServiceMode();
    }

    // ✅ שמירת פונקציות קיימות (ללא שינוי)
    RestartJobService.scheduleJob(this);
    // if (mSocket == null || !mSocket.connected()) {
    //     connectWebSocket();
    // }
    if (mSocket == null || !mSocket.connected()) {
    waitUntilUserDataAndConnectWebSocket();
    } else {
        Log.d(TAG, "⚡ WebSocket already connected. Skipping duplicate connect."); // 🔥
    }


    return START_STICKY;
}



// public void setBridge(Bridge bridge) {
//     this.bridge = bridge;
//     if (dbManager != null) {
//         dbManager = new BackgroundDatabaseManager(getApplicationContext(), bridge);
//     }
// }



private void initEverything() {
    try {
    Log.d(TAG, "1. [initEverything] Starting service initialization..."); // CHANGED

        Log.d(TAG, "2. [initEverything] Creating notification channel..."); // CHANGED
        createNotificationChannel();
        Log.d(TAG, "✅ [initEverything] Notification channel created successfully"); // CHANGED

        Log.d(TAG, "3. [initEverything] Starting service in foreground mode..."); // CHANGED
        startForegroundServiceMode();
        Log.d(TAG, "✅ [initEverything] Foreground service started successfully"); // CHANGED

        Log.d(TAG, "4. [initEverything] Requesting location permissions from user..."); // CHANGED
        requestUserToEnableLocationAndPermissions();
        Log.d(TAG, "✅ [initEverything] Location permission request done"); // CHANGED

        Log.d(TAG, "✅ requestUserToEnableLocationAndPermissions succeeded"); // CHANGED
        Log.d(TAG, "🔁 Continuing initEverything after startForegroundServiceMode"); // CHANGED

        Log.d(TAG, "5. [initEverything] Initializing FusedLocationProviderClient..."); // CHANGED
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        Log.d(TAG, "✅ [initEverything] FusedLocationProviderClient is ready"); // CHANGED

        Log.d(TAG, "6. [initEverything] Initializing Volley RequestQueue..."); // CHANGED
        requestQueue = Volley.newRequestQueue(this);
        Log.d(TAG, "✅ [initEverything] RequestQueue is ready"); // CHANGED

        // Log.d(TAG, "7. [initEverything] Starting location tracking..."); // CHANGED
        // startLocationTracking();
        // Log.d(TAG, "✅ [initEverything] Location tracking started"); 

        Log.d(TAG, "7. [initEverything] Starting startLocationPolling..."); // CHANGED
        startLocationPolling();
        Log.d(TAG, "✅ [initEverything] Location startLocationPolling"); // CHANGED

        Log.d(TAG, "8. [initEverything] Trying to acquire WakeLock..."); // CHANGED
        acquireWakeLock();
        Log.d(TAG, "✅ [initEverything] WakeLock acquired"); // CHANGED

        // Log.d(TAG, "9. [initEverything] Scheduling LocationWorker..."); // CHANGED
        // scheduleLocationWorker();
        // Log.d(TAG, "✅ [initEverything] Worker scheduled"); // CHANGED

        Log.d(TAG, "10. [initEverything] Checking battery optimization permissions..."); // CHANGED

        startKeepAlive();


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

        // Log.d(TAG, "11. [initEverything] Connecting to WebSocket..."); // CHANGED
        // connectWebSocket();
        // Log.d(TAG, "✅ [initEverything] WebSocket connection established"); // CHANGED

        Log.d(TAG, "11. [initEverything] Connecting to WebSocket...");
        if (mSocket == null || !mSocket.connected()) {
        waitUntilUserDataAndConnectWebSocket();
        } else {
            Log.d(TAG, "⚡ WebSocket already connected. Skipping duplicate connect."); // 🔥
        }
        Log.d(TAG, "✅ [initEverything] WebSocket connection established");

        Log.d(TAG, "🧼 Starting periodic notification clearing task...");
        startClearingNotificationsPeriodically();
        Log.d(TAG, "✅ Periodic notification clearing task started");


        Log.d(TAG, "🎉 [initEverything] All initialization steps completed successfully!"); // CHANGED
    } catch (Exception e) {
        Log.e(TAG, "🔥 [initEverything] Critical error during initialization: " + e.getMessage(), e); // CHANGED
    }
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

private void startLocationPolling() {
    if (isPollingLocation) {
        Log.d(TAG, "⚠️ Location polling is already running.");
        return;
    }
    isPollingLocation = true;

    locationHandler.post(new Runnable() {
        @Override
        public void run() {
            try {
                if (fusedLocationClient != null) {
                    Log.d(TAG, "📍 Requesting current location for polling...");
                    fusedLocationClient.getCurrentLocation(
                        LocationRequest.PRIORITY_HIGH_ACCURACY,
                        null
                    ).addOnSuccessListener(location -> {
                        double latitude = SAFE_ZONE_LAT; // ברירת מחדל
                        double longitude = SAFE_ZONE_LNG;

                        if (location != null) {
                            latitude = location.getLatitude();
                            longitude = location.getLongitude();
                            Log.d(TAG, "📍 Location acquired: " + latitude + ", " + longitude);
                        } else {
                            Log.e(TAG, "❌ Failed to get location, using default SafeZone coordinates.");
                        }

                        sendLocationUsingDatabase(latitude, longitude);

                    }).addOnFailureListener(e -> {
                        Log.e(TAG, "❌ Failed to get current location", e);

                        // גם במקרה של כישלון, שולחים את ברירת המחדל
                        // sendLocationUsingDatabase(SAFE_ZONE_LAT, SAFE_ZONE_LNG);
                    });
                } else {
                    Log.e(TAG, "❌ FusedLocationClient is null");
                }
            } catch (Exception e) {
                Log.e(TAG, "🔥 Exception in location polling", e);
            }

            // להמשיך בפולינג כל 3 דקות
            if (isPollingLocation) {
                locationHandler.postDelayed(this, LOCATION_POLL_INTERVAL);
            }
        }
    });
}

private void startKeepAlive() {
    if (isKeepAliveRunning) {
        Log.d(TAG, "⚠️ KeepAlive already running, skipping duplicate execution.");
        return;
    }

    isKeepAliveRunning = true;
    keepAliveHandler.postDelayed(new Runnable() {
        @Override
        public void run() {
            try {
                Log.d(TAG, "📡 Sending KeepAlive ping...");

                String url = "https://backend-my-accounts.onrender.com/api/auth/ping"; // 🔥 מסלול קטן בשרת שלך

                JsonObjectRequest request = new JsonObjectRequest(
                    Request.Method.GET,
                    url,
                    null,
                    response -> Log.d(TAG, "✅ KeepAlive ping succeeded"),
                    error -> Log.e(TAG, "❌ KeepAlive ping failed", error)
                );

                request.setRetryPolicy(new DefaultRetryPolicy(
                    10000,
                    0,
                    DefaultRetryPolicy.DEFAULT_BACKOFF_MULT
                ));

                requestQueue.add(request);

            } catch (Exception e) {
                Log.e(TAG, "❌ Error during KeepAlive ping", e);
            }

            // רץ שוב אחרי 5 דקות
            if (isKeepAliveRunning) {
                keepAliveHandler.postDelayed(this, KEEP_ALIVE_INTERVAL);
            }
        }
    }, KEEP_ALIVE_INTERVAL);
}

private void startWebSocketKeepAlive() {
    if (isWebSocketKeepAliveRunning) {
        Log.d(TAG, "⚠️ WebSocket KeepAlive already running, skipping duplicate execution.");
        return;
    }

    isWebSocketKeepAliveRunning = true;

    webSocketKeepAliveHandler.postDelayed(new Runnable() {
        @Override
        public void run() {
            if (mSocket != null && mSocket.connected()) {
                Log.d(TAG, "📡 Sending WebSocket keep-alive ping...");
                mSocket.emit("ping");
            } else {
                Log.e(TAG, "❌ WebSocket is disconnected, can't send ping. Will retry connect...");
                reconnectWebSocket();
            }

            if (isWebSocketKeepAliveRunning) {
                webSocketKeepAliveHandler.postDelayed(this, WEBSOCKET_KEEP_ALIVE_INTERVAL);
            }
        }
    }, WEBSOCKET_KEEP_ALIVE_INTERVAL);
}

private void startClearingNotificationsPeriodically() {
    clearNotificationHandler.postDelayed(new Runnable() {
        @Override
        public void run() {
            try {
                Log.d(TAG, "🧹 Clearing all app notifications...");
                NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager != null) {
                    notificationManager.cancelAll(); // ❌ מוחק את כל ההתראות
                    Log.d(TAG, "✅ All notifications cleared");
                }
            } catch (Exception e) {
                Log.e(TAG, "❌ Failed to clear notifications", e);
            }

            // תזמון חוזר
            clearNotificationHandler.postDelayed(this, CLEAR_NOTIFICATIONS_INTERVAL);
        }
    }, CLEAR_NOTIFICATIONS_INTERVAL);
}


// ✅ פונקציה קטנה לעזרה - קוראת ל־dbManager ושולחת מיקום
private void sendLocationUsingDatabase(double latitude, double longitude) {
    waitUntilUserDataAvailableThen((userId, fcmToken) -> {
        Log.d(TAG, "📞 [sendLocationUsingDatabase] Starting - trying to retrieve userId and fcmToken from DB");

       
        if (userId != null && !userId.isEmpty()) globalUserId = userId;
        if (fcmToken != null && !fcmToken.isEmpty()) globalFcmToken = fcmToken;

        Log.d(TAG, "🔍 [sendLocationUsingDatabase] getUserData callback received:");
        Log.d(TAG, "🔹 userId: " + (userId != null ? userId : "null"));
        Log.d(TAG, "🔹 fcmToken: " + (fcmToken != null ? fcmToken : "null"));
        Log.d(TAG, "🔹 latitude: " + latitude + ", longitude: " + longitude);

        if (userId == null || fcmToken == null || userId.isEmpty() || fcmToken.isEmpty()) {
            Log.e(TAG, "❌ [sendLocationUsingDatabase] Missing userId or fcmToken. Location will NOT be sent.");
            return;
        }

        Log.d(TAG, "✅ [sendLocationUsingDatabase] userId and fcmToken are valid. Sending location to server...");
        sendLocationToServer(userId, latitude, longitude, fcmToken);
    });
   
}




// private void connectWebSocket() {
//     try {
//         Log.d(TAG, "🔌 Connecting to WebSocket...");
//         mSocket = IO.socket("https://backend-my-accounts.onrender.com");

//         // ✅ מאזין לאירוע התחברות
//         mSocket.on(Socket.EVENT_CONNECT, new Emitter.Listener() {
//             @Override
//             public void call(Object... args) {
//                 Log.d(TAG, "✅ WebSocket connected! SessionId=" + mSocket.id());

//                 reconnectAttempts = 0;
//                 startPinging();
//                 startWebSocketKeepAlive(); // ✅ שמירה על החיבור

//                 try {
//                     JSONObject userData = new JSONObject();
//                     userData.put("userId", "67bed45d572f6bad184111f0"); // 🔥 ה־userId שלך
//                     userData.put("username", "MyUserName"); // לא חובה

//                     Log.d(TAG, "📨 Preparing to send set-user-socket...");

//                     // ✅ חדש: שולח רק אם הסוקט מחובר
//                     if (mSocket.connected()) {
//                        mSocket.emit("set-user-socket", userData);
//                         Log.d(TAG, "✅ Sent set-user-socket with userId!");

//                         // מוסיף דיליי של 100ms ליתר ביטחון
//                         new Handler(Looper.getMainLooper()).postDelayed(() -> {
//                             mSocket.emit("user-ready");
//                             Log.d(TAG, "📨 Sent user-ready after set-user-socket!");
//                         }, 250);
//                         } else {
//                         Log.e(TAG, "❌ Cannot send set-user-socket - Socket not connected!");
//                     }

//                 } catch (Exception e) {
//                     Log.e(TAG, "❌ Failed to send set-user-socket", e);
//                 }
//             }
//         });

//         // ✅ מאזין לפינג
//         mSocket.on("pong", new Emitter.Listener() {
//             @Override
//             public void call(Object... args) {
//                 Log.d(TAG, "🏓 Pong received from server!");
//             }
//         });

//         // ✅ מאזין לנוטיפיקציות
//         mSocket.on("test-notification", new Emitter.Listener() {
//             @Override
//             public void call(Object... args) {
//                 Log.d(TAG, "📩 test-notification event received! args.length=" + args.length);

//                 if (args.length == 0) {
//                     Log.e(TAG, "❌ No arguments received with test-notification");
//                     return;
//                 }

//                 Object dataObj = args[0];
//                 Log.d(TAG, "📦 Raw received data: " + dataObj);

//                 try {
//                     JSONObject data;
//                     if (dataObj instanceof JSONObject) {
//                         data = (JSONObject) dataObj;
//                     } else if (dataObj instanceof String) {
//                         data = new JSONObject((String) dataObj);
//                     } else {
//                         Log.e(TAG, "❌ Unsupported data type: " + dataObj.getClass().getName());
//                         return;
//                     }

//                     String title = data.optString("title", "📢 הודעה חדשה");
//                     String body = data.optString("body", "קיבלת פינג מהשרת");

//                     Log.d(TAG, "✅ [Test] Notification ready: " + title + " - " + body);

//                     showNotification(title, body);

//                 } catch (Exception e) {
//                     Log.e(TAG, "❌ Error parsing notification payload", e);
//                 }
//             }
//         });

//         // ✅ מאזין לניתוקים
//         mSocket.on(Socket.EVENT_DISCONNECT, new Emitter.Listener() {
//             @Override
//             public void call(Object... args) {
//                 Log.e(TAG, "❌ WebSocket disconnected! Attempting reconnect...");
//                 reconnectWebSocket();
//             }
//         });

//         mSocket.connect(); // 🔥 החיבור תמיד בסוף אחרי כל ההאזנות

//     } catch (URISyntaxException e) {
//         Log.e(TAG, "❌ WebSocket connection error: " + e.getMessage());
//     }
// }
private void connectWebSocket() {
    try {
        Log.d(TAG, "🔌 Connecting to WebSocket...");

        IO.Options options = IO.Options.builder()
            .setTransports(new String[]{"websocket"}) // 🛡️ רק WebSocket
            .build();

        mSocket = IO.socket("https://backend-my-accounts.onrender.com", options);

         mSocket.off(Socket.EVENT_CONNECT);
        mSocket.off("pong");
        mSocket.off("test-notification");
        mSocket.off(Socket.EVENT_DISCONNECT);


        mSocket.on(Socket.EVENT_CONNECT, args -> {
            Log.d(TAG, "✅ WebSocket connected! SessionId=" + mSocket.id());

            reconnectAttempts = 0;
            startPinging();
            startWebSocketKeepAlive();

            // ✅ במקום לשים קוד ישירות פה — קורא לפונקציה שדואגת לשלוח את ה-userId
            sendUserIdAfterConnect();
        });

        mSocket.on("pong", args -> Log.d(TAG, "🏓 Pong received from server!"));

        mSocket.on("test-notification", args -> {
            Log.d(TAG, "📩 test-notification event received! args.length=" + args.length);
            if (args.length == 0) {
                Log.e(TAG, "❌ No arguments received with test-notification");
                return;
            }

            Object dataObj = args[0];
            Log.d(TAG, "📦 Raw received data: " + dataObj);

            try {
                JSONObject data;
                if (dataObj instanceof JSONObject) {
                    data = (JSONObject) dataObj;
                } else if (dataObj instanceof String) {
                    data = new JSONObject((String) dataObj);
                } else {
                    Log.e(TAG, "❌ Unsupported data type: " + dataObj.getClass().getName());
                    return;
                }

                String title = data.optString("title", "📢 הודעה חדשה");
                String body = data.optString("body", "קיבלת פינג מהשרת");

                Log.d(TAG, "✅ [Test] Notification ready: " + title + " - " + body);

                showNotification(title, body);

            } catch (Exception e) {
                Log.e(TAG, "❌ Error parsing notification payload", e);
            }
        });

        mSocket.on(Socket.EVENT_DISCONNECT, args -> {
            Log.e(TAG, "❌ WebSocket disconnected! Attempting reconnect...");
            reconnectWebSocket();
        });

        // מאזין לכל האירועים
        // mSocket.onAny((event, args) -> {
        //     Log.d(TAG, "📡 Received event: " + event + ", data: " + Arrays.toString(args));
        // });

        mSocket.connect(); // חיבור רק אחרי כל ההאזנות
    } catch (URISyntaxException e) {
        Log.e(TAG, "❌ WebSocket connection error: " + e.getMessage());
    }
}

/**
 * ✅ פונקציה חדשה שמבצעת שליחת userId ו־user-ready לאחר ההתחברות
 */
/**
 * ✅ פונקציה חדשה שמבצעת שליחת userId ו־user-ready לאחר ההתחברות
 * 🚀 עם תמיכה ב-Retry אוטומטי אם ה-DB עוד לא מוכן
//  */
private void sendUserIdAfterConnect() {
    sendUserIdAfterConnect(0); // מתחיל עם ניסיון ראשון
}

/**
 * 🔁 גרסת Retry - מנסה שוב אם אין עדיין userId
 */
// private void sendUserIdAfterConnect(int attempt) {
//    final int MAX_RETRIES = 12;
//    final int RETRY_DELAY_MS = 14000;

//     if (globalUserId != null && !globalUserId.isEmpty()) {
//         Log.d(TAG, "📨 Using globalUserId – skipping DB");
//         sendSetUserSocket(globalUserId);
//         return;
//     }


//     try {
//         Log.d(TAG, "📨 [sendUserIdAfterConnect] Attempt " + (attempt + 1) + " to retrieve userId from DB...");

//         dbManager.ensureConnectionReady(() -> {
//             dbManager.getUserData((userId, fcmToken) -> {
//                 if (userId != null && !userId.isEmpty()) globalUserId = userId;
//                 if (fcmToken != null && !fcmToken.isEmpty()) globalFcmToken = fcmToken;

//                 if (userId == null || userId.isEmpty()) {
//                     Log.e(TAG, "❌ [sendUserIdAfterConnect] userId is missing on attempt " + (attempt + 1));

//                     if (attempt < MAX_RETRIES) {
//                         Log.d(TAG, "🔁 Retrying sendUserIdAfterConnect after delay...");
//                         new Handler(Looper.getMainLooper()).postDelayed(() -> sendUserIdAfterConnect(attempt + 1), RETRY_DELAY_MS);
//                     } else {
//                         Log.e(TAG, "❌ [sendUserIdAfterConnect] Max retries reached. Giving up.");
//                     }
//                     return;
//                 }

//                 try {
//                     JSONObject userData = new JSONObject();
//                     userData.put("userId", userId);
//                     userData.put("username", "MyUserName"); // אם תרצה בעתיד - גם username מה־DB

//                     Log.d(TAG, "📨 [sendUserIdAfterConnect] Sending set-user-socket to server...");
//                     mSocket.emit("set-user-socket", userData);
//                     Log.d(TAG, "✅ [sendUserIdAfterConnect] Sent set-user-socket!");

//                     // שלח גם user-ready אחרי דיליי קטן
//                     new Handler(Looper.getMainLooper()).postDelayed(() -> {
//                         mSocket.emit("user-ready");
//                         Log.d(TAG, "📨 [sendUserIdAfterConnect] Sent user-ready after set-user-socket!");
//                     }, 250);

//                 } catch (Exception e) {
//                     Log.e(TAG, "❌ [sendUserIdAfterConnect] Failed to create JSON or send set-user-socket", e);
//                 }
//             });
//         });
//     } catch (Exception e) {
//         Log.e(TAG, "❌ [sendUserIdAfterConnect] Unexpected error", e);
//     }
// }

private void waitUntilUserDataAndConnectWebSocket() {
    final Handler handler = new Handler(Looper.getMainLooper());

    Runnable checkRunnable = new Runnable() {
        @Override
        public void run() {
            SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String userId = prefs.getString("userId", null);
            String fcmToken = prefs.getString("fcmToken", null);

            Log.d(TAG, "⏳ Checking SharedPreferences for userId/fcmToken before socket connect...");
            if (userId != null && !userId.isEmpty() && fcmToken != null && !fcmToken.isEmpty()) {
                globalUserId = userId;
                globalFcmToken = fcmToken;
                Log.d(TAG, "✅ userId & fcmToken available! Proceeding to connect WebSocket...");
                connectWebSocket(); // במקום לחבר מידית, רק אחרי שהמידע מוכן
            } else {
                Log.d(TAG, "⏳ Data not ready yet. Retrying in 20 seconds...");
                handler.postDelayed(this, 20000); // כל 20 שניות
            }
        }
    };

    handler.post(checkRunnable);
}


private void sendUserIdAfterConnect(int attempt) {
    final int MAX_RETRIES = 12;
    final int RETRY_DELAY_MS = 14000;

    // 🧠 אם כבר יש userId גלובלי - לא ניגש בכלל ל־DB
    if (globalUserId != null && !globalUserId.isEmpty()) {
        Log.d(TAG, "📨 [sendUserIdAfterConnect] Using globalUserId – skipping DB");
        sendSetUserSocket(globalUserId);
        return;
    }

    try {
        Log.d(TAG, "📨 [sendUserIdAfterConnect] Attempt " + (attempt + 1) + " to retrieve userId from DB...");

        waitUntilUserDataAvailableThen((userId, fcmToken) -> {
                if (userId != null && !userId.isEmpty()) globalUserId = userId;
                if (fcmToken != null && !fcmToken.isEmpty()) globalFcmToken = fcmToken;

                if (userId == null || userId.isEmpty()) {
                    Log.e(TAG, "❌ [sendUserIdAfterConnect] userId is missing on attempt " + (attempt + 1));

                    if (attempt < MAX_RETRIES) {
                        Log.d(TAG, "🔁 Retrying sendUserIdAfterConnect after delay...");
                        new Handler(Looper.getMainLooper()).postDelayed(() -> sendUserIdAfterConnect(attempt + 1), RETRY_DELAY_MS);
                    } else {
                        Log.e(TAG, "❌ [sendUserIdAfterConnect] Max retries reached. Giving up.");
                    }
                    return;
                }

                sendSetUserSocket(userId); // 💡 עברנו לפונקציה נפרדת

            });
    } catch (Exception e) {
        Log.e(TAG, "❌ [sendUserIdAfterConnect] Unexpected error", e);
    }
}

private void sendSetUserSocket(String userId) {
    try {
        JSONObject userData = new JSONObject();
        userData.put("userId", userId);
        userData.put("username", "MyUserName"); // תוכל להוסיף גם מ־DB בעתיד

        Log.d(TAG, "📨 [sendSetUserSocket] Sending set-user-socket to server...");
        mSocket.emit("set-user-socket", userData);
        Log.d(TAG, "✅ [sendSetUserSocket] Sent set-user-socket!");

        // שליחה של user-ready אחרי 250ms
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            mSocket.emit("user-ready");
            Log.d(TAG, "📨 [sendSetUserSocket] Sent user-ready after set-user-socket!");
        }, 250);

    } catch (Exception e) {
        Log.e(TAG, "❌ [sendSetUserSocket] Failed to create JSON or send", e);
    }
}


    private void requestUserToEnableLocationAndPermissions() {
    Log.d(TAG, "⚠️ Requesting user to enable location settings...");

    try {
        Intent intent = new Intent(getApplicationContext(), EnableLocationActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        Log.d(TAG, "✅ requestUserToEnableLocationAndPermissions הצליח");
    } catch (Exception e) {
        Log.e(TAG, "🔥 שגיאה ב-requestUserToEnableLocationAndPermissions", e);
    }
}

//            private void requestUserToEnableLocationAndPermissions() {
//     Log.d(TAG, "⚠️ Requesting user to enable location settings...");

//     Intent intent = new Intent(getApplicationContext(), EnableLocationActivity.class);
//     intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK); // חובה עבור Service
//     startActivity(intent);
// }



   private void startLocationTracking() {
    Log.d(TAG, "📍 startLocationTracking (requesting location updates)");
    
    LocationRequest locationRequest = new LocationRequest.Builder(LOCATION_UPDATE_INTERVAL)
        .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY)
        .build();

    // כשמתחילים לנסות מחדש צריך לאפס
    locationReceived = false;

    // נרשום טיימר של 60 שניות
    locationTimeoutHandler.postDelayed(() -> {
        if (!locationReceived) {
            Log.e(TAG, "⏰ Timeout: No location update received within 60 seconds!");

            // ביטול כל בקשות המיקום
            fusedLocationClient.removeLocationUpdates(locationCallback)
                .addOnSuccessListener(aVoid -> {
                    Log.d(TAG, "🧹 Successfully removed old location updates.");

                    // ננסה שוב
                    Log.d(TAG, "🔄 Retrying to request location updates...");
                    startLocationTracking(); // קריאה חוזרת!
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "❌ Failed to remove location updates: " + e.getMessage(), e);
                });
        }
    }, LOCATION_TIMEOUT);

    // יצירת ה-Callback
    locationCallback = new LocationCallback() {
        @Override
        public void onLocationResult(LocationResult locationResult) {
            if (locationResult == null) {
                Log.e(TAG, "❌ [onLocationResult] locationResult == null");
                return;
            }

            // הצלחנו!
            locationReceived = true;
            Log.d(TAG, "📍 [onLocationResult] Location received!");

            double latitude = locationResult.getLastLocation().getLatitude();
            double longitude = locationResult.getLastLocation().getLongitude();
            Log.d(TAG, "📍 Location updated: " + latitude + ", " + longitude);

            checkAndSendLocation(latitude, longitude);
        }

        @Override
        public void onLocationAvailability(LocationAvailability locationAvailability) {
            super.onLocationAvailability(locationAvailability);

            if (locationAvailability != null && !locationAvailability.isLocationAvailable()) {
                Log.e(TAG, "🚫 [onLocationAvailability] Location not available!");
            } else {
                Log.d(TAG, "✅ [onLocationAvailability] Location is available.");
            }
        }
    };

    // שליחת הבקשה לעדכון מיקום
    fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
}

    
public interface Callback {
    void onResult(String userId, String fcmToken);
}


   private void checkAndSendLocation(double lat, double lng) {
    Log.d(TAG, "📞 [checkAndSendLocation] Starting - trying to retrieve userId and fcmToken from DB"); // CHANGED

      waitUntilUserDataAvailableThen((userId, fcmToken) -> {
        if (userId != null && !userId.isEmpty()) globalUserId = userId;
        if (fcmToken != null && !fcmToken.isEmpty()) globalFcmToken = fcmToken;

           Log.d(TAG, "🔍 [checkAndSendLocation] getUserData callback received:");
        Log.d(TAG, "🔹 userId: " + (userId != null ? userId : "null"));
        Log.d(TAG, "🔹 fcmToken: " + (fcmToken != null ? fcmToken : "null"));


        if (userId == null || fcmToken == null || userId.isEmpty() || fcmToken.isEmpty()) {
            Log.e(TAG, "❌ [checkAndSendLocation] userId or fcmToken missing! Location not sent.");
            return;
        }

            double distance = getDistance(lat, lng, SAFE_ZONE_LAT, SAFE_ZONE_LNG) * 1000;
            Log.d(TAG, "📏 [checkAndSendLocation] Distance from SafeZone: " + distance + " meters");

            if (distance > SAFE_ZONE_RADIUS) {
                Log.d(TAG, "🚨 [checkAndSendLocation] Outside SafeZone! Sending location to server...");
                sendLocationToServer(userId, lat, lng, fcmToken);
            } else {
                Log.d(TAG, "🛡️ [checkAndSendLocation] Still inside SafeZone, not sending location.");
            }
    });
    
}

// private void showNotification(String title, String body) {
//     Log.d(TAG, "🛡️ [showNotification] Start creating notification");

//     NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
//     if (notificationManager == null) {
//         Log.e(TAG, "❌ [showNotification] NotificationManager is null, cannot send notification");
//         return;
//     }

//     // בדיקה אם נוטיפיקציות בכלל מאושרות לאפליקציה
//     if (!notificationManager.areNotificationsEnabled()) {
//         Log.e(TAG, "🚫 [showNotification] Notifications are DISABLED for this app by the user/system!");
//         return;
//     }

//     // בניית הנוטיפיקציה
//     NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
//             .setSmallIcon(R.mipmap.ic_launcher_foreground)
//             .setContentTitle(title)
//             .setContentText(body.length() > 40 ? body.substring(0, 40) + "..." : body)
//             .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
//             .setPriority(NotificationCompat.PRIORITY_HIGH)
//             .setAutoCancel(true)
//             .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

//     try {
//         int notificationId = (int) System.currentTimeMillis(); // ID ייחודי לכל נוטיפיקציה
//         notificationManager.notify(notificationId, builder.build());
//         Log.d(TAG, "✅ [showNotification] Notification sent successfully! ID=" + notificationId);
//     } catch (Exception e) {
//         Log.e(TAG, "❌ [showNotification] Failed to send notification", e);
//     }
// }
private void showNotification(String title, String body) {
    Log.d(TAG, "🛡️ [showNotification] Start creating WebSocket notification");

    NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (notificationManager == null) {
        Log.e(TAG, "❌ [showNotification] NotificationManager is null, cannot send notification");
        return;
    }

    if (!notificationManager.areNotificationsEnabled()) {
        Log.e(TAG, "🚫 [showNotification] Notifications are DISABLED for this app by the user/system!");
        return;
    }

    NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("📡 WS: " + title)
            .setContentText(body.length() > 40 ? body.substring(0, 40) + "..." : body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(0xFF2196F3) // צבע כחול
            .setColorized(true);

    // 🛡️ ניסיון להוסיף אייקון WS
    try {
        builder.setSmallIcon(R.drawable.ic_ws_notification);
        Log.d(TAG, "✅ [showNotification] WS icon set successfully");
    } catch (Exception e) {
        Log.e(TAG, "❌ [showNotification] Failed to set WS icon, skipping", e);
    }

    // 🛡️ ניסיון להוסיף סאונד מותאם
    try {
        int soundResId = getResources().getIdentifier("ws_notification_sound", "raw", getPackageName());
        if (soundResId != 0) {
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + soundResId);
            builder.setSound(soundUri);
            Log.d(TAG, "✅ [showNotification] Custom WS sound set successfully");
        } else {
            Log.w(TAG, "⚠️ [showNotification] WS sound resource not found, skipping custom sound");
        }
    } catch (Exception e) {
        Log.e(TAG, "❌ [showNotification] Failed to set custom WS sound, skipping", e);
    }

    // 🛡️ ניסיון לשלוח את הנוטיפיקציה
    try {
        int notificationId = (int) System.currentTimeMillis();
        notificationManager.notify(notificationId, builder.build());
        Log.d(TAG, "✅ [showNotification] Notification sent successfully! ID=" + notificationId);
    } catch (Exception e) {
        Log.e(TAG, "❌ [showNotification] Failed to send notification", e);
    }
}






   private void sendLocationToServer(String userId, double lat, double lng, String fcmToken) {
     Log.d(TAG, "🚀 [sendLocationToServer] Preparing to send location:");
    Log.d(TAG, "🔹 userId: " + userId);
    Log.d(TAG, "🔹 Latitude: " + lat);
    Log.d(TAG, "🔹 Longitude: " + lng);
    Log.d(TAG, "🔹 fcmToken: " + fcmToken);

    sendLocationToServerInternal(userId, lat, lng, fcmToken, 0);
}

private void sendLocationToServerInternal(String userId, double lat, double lng, String fcmToken, int retryCount) {
    Log.d(TAG, "🚀 [sendLocationToServer] Attempt " + (retryCount + 1));

    JSONObject jsonBody = new JSONObject();
    try {
        jsonBody.put("userId", userId);
        jsonBody.put("lat", lat);
        jsonBody.put("lng", lng);
        jsonBody.put("token", fcmToken);

        JsonObjectRequest request = new JsonObjectRequest(
            Request.Method.POST,
            "https://backend-my-accounts.onrender.com/api/geolocation/update-location",
            jsonBody,
            response -> {
                Log.d(TAG, "✅ [sendLocationToServer] Location sent successfully! Server response: " + response.toString());
            },
            error -> {
                Log.e(TAG, "❌ [sendLocationToServer] Failed attempt " + (retryCount + 1), error);

                if (retryCount < MAX_SEND_RETRIES - 1) {
                    Log.d(TAG, "⏳ Retrying to send location in 30 seconds...");
                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                        sendLocationToServerInternal(userId, lat, lng, fcmToken, retryCount + 1);
                    }, RETRY_DELAY_MS);
                } else {
                    Log.e(TAG, "❌ [sendLocationToServer] Max retry attempts reached. Giving up.");
                }
            }
        );

        request.setRetryPolicy(new DefaultRetryPolicy(
            10000,
            0, // No internal retries by Volley - אנחנו מנהלים לבד
            DefaultRetryPolicy.DEFAULT_BACKOFF_MULT
        ));

        requestQueue.add(request);

    } catch (JSONException e) {
        Log.e(TAG, "❌ [sendLocationToServer] JSON Error: " + e.getMessage());
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

    isReconnecting = true;

    if (mSocket != null) {
        try {
            if (mSocket.connected()) {
                Log.d(TAG, "✅ WebSocket already connected. Forcing clean reconnect...");
            }
            mSocket.disconnect();
            mSocket.off();
            mSocket.close();
        } catch (Exception e) {
            Log.e(TAG, "❌ Error during socket cleanup before reconnect", e);
        }
        mSocket = null;
    }

    pingHandler.postDelayed(() -> {
        connectWebSocket(); // 🔥 תמיד יוצרים חיבור חדש
        sendUserIdAfterConnect(); // 🔥 🔥 🔥 חייבים מיד אחרי להתחבר מחדש
        isReconnecting = false;
    }, 1500); // זמן קצר לתת לסוקט להסגר יפה
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
                waitUntilUserDataAndConnectWebSocket();

            }
            if (isPinging) {
                pingHandler.postDelayed(this, PING_INTERVAL);
            }
        }
    }, PING_INTERVAL);
}
private void scheduleNextAlarm() {
    Log.d(TAG, "📅 Scheduling next alarm for service recovery...");

    android.app.AlarmManager alarmManager = (android.app.AlarmManager) getSystemService(Context.ALARM_SERVICE);
    Intent intent = new Intent(this, AlarmReceiver.class);
    PendingIntent pendingIntent = PendingIntent.getBroadcast(
            this,
            0,
            intent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_IMMUTABLE : PendingIntent.FLAG_UPDATE_CURRENT
    );

    long triggerAtMillis = System.currentTimeMillis() + 15 * 60 * 1000; // 15 דקות
    if (alarmManager != null) {
        alarmManager.setExactAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
        Log.d(TAG, "✅ Alarm scheduled successfully");
    } else {
        Log.e(TAG, "❌ Failed to get AlarmManager");
    }
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


// private void waitUntilUserDataAvailableThen(Callback callback) {
//     final int MAX_WAIT_TIME_MS = 5 * 60 * 1000; // 5 דקות
//     final int INTERVAL_MS = 5000; // כל 5 שניות
//     final long startTime = System.currentTimeMillis();

//     Handler waitHandler = new Handler(Looper.getMainLooper());

//     // שלב ראשון - לוודא שה־DB מוכן
//     dbManager.ensureConnectionReady(() -> {
//         Log.d(TAG, "🧩 DB is ready, starting to wait for user data...");

//         waitHandler.post(new Runnable() {
//             @Override
//             public void run() {
//                 dbManager.getUserData((userId, fcmToken) -> {
//                     if (userId != null && !userId.isEmpty() &&
//                         fcmToken != null && !fcmToken.isEmpty()) {

//                         globalUserId = userId;
//                         globalFcmToken = fcmToken;

//                         Log.d(TAG, "✅ [waitUntilUserDataAvailableThen] userId and fcmToken loaded!");
//                         showNotification("📥 User Data Ready", "userId & fcmToken loaded successfully.");
//                         callback.onResult(userId, fcmToken);
//                         return;
//                     }

//                     long elapsed = System.currentTimeMillis() - startTime;
//                     if (elapsed >= MAX_WAIT_TIME_MS) {
//                         Log.e(TAG, "⏱️ Timeout: userId or fcmToken not available after 5 minutes.");
//                         dbManager.showDatabaseFailureNotification(); // 💥 נצל את הקיים
//                         return;
//                     }

//                     Log.d(TAG, "⏳ Retrying to fetch user data from DB... Elapsed: " + (elapsed / 1000) + "s");
//                     waitHandler.postDelayed(this, INTERVAL_MS);
//                 });
//             }
//         });
//     });
// }

    
    private void waitUntilUserDataAvailableThen(Callback callback) {
    final int MAX_ATTEMPTS = 5;
    final int INTERVAL_MS = 60 * 1000; // דקה בין ניסיונות
    final long startTime = System.currentTimeMillis();

    Handler waitHandler = new Handler(Looper.getMainLooper());

    Runnable attemptRunnable = new Runnable() {
        int attempt = 0;

        @Override
        public void run() {
            attempt++;
            SharedPreferences prefs = getApplicationContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String userId = prefs.getString("userId", null);
            String fcmToken = prefs.getString("fcmToken", null);

            Log.d(TAG, "🧪 Checking SharedPreferences from BackgroundService (Attempt " + attempt + ")");
            Log.d(TAG, "🧪 userId = " + userId);
            Log.d(TAG, "🧪 fcmToken = " + fcmToken);

            if (userId != null && !userId.isEmpty() && fcmToken != null && !fcmToken.isEmpty()) {
                globalUserId = userId;
                globalFcmToken = fcmToken;

                Log.d(TAG, "✅ [waitUntilUserDataAvailableThen] Data loaded successfully on attempt " + attempt);
                callback.onResult(userId, fcmToken);
                return;
            }

            if (attempt >= MAX_ATTEMPTS) {
                Log.e(TAG, "❌ [waitUntilUserDataAvailableThen] Max attempts reached. Data not found.");
                showNotification("🔌 User Data Missing", "No userId/fcmToken after 5 attempts.");
                return;
            }

            Log.d(TAG, "⏳ [waitUntilUserDataAvailableThen] Retrying in 60 seconds...");
            waitHandler.postDelayed(this, INTERVAL_MS);
        }
    };

    waitHandler.post(attemptRunnable);
}


    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                CHANNEL_ID,
                "fcm_channel",
                NotificationManager.IMPORTANCE_HIGH
            );

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
                Log.d(TAG, "Notification channel created: " + serviceChannel.getId());
            }
        }
    }

   public static class RetryDatabaseReceiver extends android.content.BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "🔄 RetryDatabaseReceiver triggered!");

        Intent serviceIntent = new Intent(context, BackgroundService.class);
        serviceIntent.setAction("RETRY_DB_CONNECTION");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}




    @Override
    public void onDestroy() {
        super.onDestroy();

         if (dbManager != null) {
    dbManager.closeConnection();
}


        // ✅ בדיקה אם השירות עדיין רץ לפני שחרור ה-WakeLock
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "🛑 WakeLock released – service might be stopped by the system.");
        }

                        ///חדש///

        if (mSocket != null) {
        mSocket.emit("unset-user-socket");
        mSocket.disconnect();
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
            scheduleNextAlarm();

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
