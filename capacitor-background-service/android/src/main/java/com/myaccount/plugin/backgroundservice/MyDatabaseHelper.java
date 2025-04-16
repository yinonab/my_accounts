package com.myaccount.plugin.backgroundservice;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

public class MyDatabaseHelper extends SQLiteOpenHelper {

    private static final String TAG = "MyDatabaseHelper";
    private static final String DATABASE_NAME = "myDatabaseSQLite.db";
    private static final int DATABASE_VERSION = 1;

    public MyDatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        // לא יוצרים טבלאות כאן
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // לא צריכים מיגרציה כרגע
    }

    public UserData getUserData() {
        SQLiteDatabase db = null;
        Cursor cursor = null;
        try {
            db = getReadableDatabase();
            cursor = db.rawQuery("SELECT userId, fcmToken FROM user_data LIMIT 1", null);
            if (cursor.moveToFirst()) {
                String userId = cursor.getString(0);
                String fcmToken = cursor.getString(1);
                return new UserData(userId, fcmToken);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error reading user data", e);
        } finally {
            if (cursor != null) cursor.close();
            if (db != null) db.close();
        }
        return null;
    }

    public static class UserData {
        public final String userId;
        public final String fcmToken;

        public UserData(String userId, String fcmToken) {
            this.userId = userId;
            this.fcmToken = fcmToken;
        }
    }
}
