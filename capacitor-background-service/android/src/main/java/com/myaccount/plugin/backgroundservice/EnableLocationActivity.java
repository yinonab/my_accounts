package com.myaccount.plugin.backgroundservice;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.widget.Toast;
import android.net.Uri;
import android.provider.Settings;

public class EnableLocationActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        new AlertDialog.Builder(this)
            .setTitle("הפעלת מיקום והרשאות")
            .setMessage("כדי שהאפליקציה תפעל כראוי, יש להפעיל את שירותי המיקום:\n\n" +
                        "1️⃣ אפשר את ה-GPS בהגדרות.\n" +
                        "2️⃣ לאחר מכן, עבור למסך 'הרשאות' והפעל גישת מיקום.")
            .setPositiveButton("המשך", (dialog, which) -> openLocationSettings())
            .setNegativeButton("ביטול", (dialog, which) -> {
                dialog.dismiss();
                finish(); // סוגר את ה-Activity
            })
            .setCancelable(false)
            .show();
    }

    private void openLocationSettings() {
        Intent gpsIntent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        startActivity(gpsIntent);

        // מעבר למסך ההרשאות לאחר 4 שניות
        new Handler().postDelayed(this::openAppSettings, 4000);
    }

    private void openAppSettings() {
        Intent permissionIntent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        permissionIntent.setData(Uri.parse("package:" + getPackageName()));
        startActivity(permissionIntent);

        // ✅ הצגת Toast תקין עם `Handler`
        new Handler(getMainLooper()).post(() -> 
            Toast.makeText(this, "יש להיכנס ל'הגדרות אפליקציה' > 'הרשאות' ולאפשר גישת מיקום", Toast.LENGTH_LONG).show()
        );

        finish(); // סוגר את ה-Activity לאחר הצגת המסך
    }
}
