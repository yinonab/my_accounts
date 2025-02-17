self.onmessage = function (event) {
    if (event.data === "start") {
        setInterval(() => {
            console.log("📡 Worker sending ping...");
            self.postMessage("ping"); // שולח "ping" לאפליקציה הראשית
        }, 25000); // כל 25 שניות שולח פינג

        setInterval(() => {
            console.log("📡 Worker sending wake-up message...");
            self.postMessage("wake-up"); // שולח wake-up כדי לוודא שהאפליקציה ערה
        }, 60000); // כל דקה שולח wake-up
    }
};
