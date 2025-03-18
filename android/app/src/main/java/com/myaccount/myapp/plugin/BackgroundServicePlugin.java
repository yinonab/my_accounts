package com.myaccount.myapp.plugin;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.content.Intent;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PluginCall;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "BackgroundService")
public class BackgroundServicePlugin extends Plugin {

    private static final String TAG = "BackgroundServicePlugin";

    @PluginMethod
    public void start(PluginCall call) {
        Log.d(TAG, "Starting Background Service...");
       Intent serviceIntent = new Intent(getActivity(), BackgroundService.class);
       getActivity().startForegroundService(serviceIntent);

        JSObject ret = new JSObject();
        ret.put("message", "Background service started");
        call.resolve(ret);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Log.d(TAG, "Stopping Background Service...");
        Intent serviceIntent = new Intent(getContext(), BackgroundService.class);
        getContext().stopService(serviceIntent);

        JSObject ret = new JSObject();
        ret.put("message", "Background service stopped");
        call.resolve(ret);
    }
}
