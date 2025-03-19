package com.myaccount.myapp;
import java.util.List; // 🔹 ייבוא המחלקה List
import com.getcapacitor.Plugin;
import com.getcapacitor.community.fcm.FCMPlugin;
import java.util.ArrayList;
import com.getcapacitor.BridgeActivity;
import android.os.Bundle;



public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(FCMPlugin.class);
    }
}


