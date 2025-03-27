package com.myaccount.plugin.backgroundservice;

import android.content.Context;
import android.content.Intent;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class LocationWorker extends Worker {
    private static final String TAG = "LocationWorker";

    public LocationWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "🔄 Running periodic location check...");

        // הפעלת השירות Foreground
        Context context = getApplicationContext();
        Intent serviceIntent = new Intent(context, BackgroundService.class);
        context.startForegroundService(serviceIntent);

        return Result.success();
    }
}
