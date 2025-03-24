package com.myaccount.plugin.backgroundservice;

import android.app.ActivityManager;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.app.job.JobInfo;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class RestartJobService extends JobService {

    private static final String TAG = "RestartJobService";
    private static final int JOB_ID = 1; // מזהה ייחודי ל-JobScheduler

    @Override
    public boolean onStartJob(JobParameters params) {
        Log.d(TAG, "🔄 RestartJobService triggered - Checking if BackgroundService is running...");

        // ✅ בודק אם השירות כבר פועל, כדי למנוע הפעלה כפולה
        if (!isServiceRunning(BackgroundService.class)) {
            Log.d(TAG, "🚀 BackgroundService is NOT running - Starting service...");
            Intent serviceIntent = new Intent(this, BackgroundService.class);
            startForegroundService(serviceIntent); // ✅ שימוש ב- Foreground service
        } else {
            Log.d(TAG, "✅ BackgroundService is already running - No need to restart.");
        }

        return false; // מסיים את ה-Job מיד
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true; // במקרה שהמערכת מפסיקה את ה-Job, הוא ירוץ שוב
    }

    public static void scheduleJob(Context context) {
        JobScheduler jobScheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);

        // 🔹 בודק אם ה-Job כבר קיים
        if (jobScheduler != null) {
            for (JobInfo jobInfo : jobScheduler.getAllPendingJobs()) {
                if (jobInfo.getId() == JOB_ID) {
                    Log.d(TAG, "✅ Job already scheduled. Skipping re-registration.");
                    return;
                }
            }
        }

        // 🔹 יצירת ה-Job מחדש (ירוץ כל 15 דקות)
        JobInfo jobInfo = new JobInfo.Builder(JOB_ID, new ComponentName(context, RestartJobService.class))
            .setPersisted(true) // יפעל גם לאחר אתחול המכשיר
            .setPeriodic(5 * 60 * 1000) // 🔄 עדכון ל-15 דקות
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY) // יפעל בכל מצב רשת
            .build();

        if (jobScheduler != null) {
            jobScheduler.schedule(jobInfo);
            Log.d(TAG, "✅ Job scheduled to restart BackgroundService every 15 minutes.");
        }
    }

    /**
     * ✅ פונקציה לבדיקה אם השירות כבר רץ
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
}
