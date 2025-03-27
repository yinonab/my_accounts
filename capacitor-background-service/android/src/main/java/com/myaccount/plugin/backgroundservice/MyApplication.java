package com.myaccount.plugin.backgroundservice;

import android.app.Application;
import androidx.work.Configuration;
import androidx.work.WorkManager;

public class MyApplication extends Application implements Configuration.Provider {
    @Override
    public void onCreate() {
        super.onCreate();
        // שום אתחול נוסף כאן אם תבחר להחיל את WorkManager בצורה ידנית
    }

    @Override
    public Configuration getWorkManagerConfiguration() {
        return new Configuration.Builder()
                .setMinimumLoggingLevel(android.util.Log.DEBUG)
                .build();
    }
}
