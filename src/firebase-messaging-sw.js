// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD6YVTQRO_GtEp_LAZOIzRODS3jNHu-YgE",
    authDomain: "my-accounts-76d6e.firebaseapp.com",
    projectId: "my-accounts-76d6e",
    storageBucket: "my-accounts-76d6e.firebasestorage.app",
    messagingSenderId: "988437566016",
    appId: "1:988437566016:web:72f59ea673d54185fbc5a5",
    measurementId: "G-X1FLCYTWDM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Event listener for background notifications
// messaging.onBackgroundMessage((payload) => {
//     console.log('📩 [Firebase Messaging SW] Received background message:', payload);
//     const notificationTitle = payload.notification.title;
//     const notificationOptions = {
//         body: payload.notification.body,
//         icon: payload.notification.icon || "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739170705/notification-badge_p0oafv.png",
//     };

//     self.registration.showNotification(notificationTitle, notificationOptions);
// });
messaging.onBackgroundMessage((payload) => {
    console.log('📩 [Firebase Messaging SW] Received background message:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || "New Notification";
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || "You have a new message",
        icon: payload.notification?.icon || payload.data?.icon || "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739170705/notification-badge_p0oafv.png",
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

