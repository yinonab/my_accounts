self.onmessage = function (event) {
    console.log("🔄 worker starter");
    if (event.data === "start") {
        setInterval(() => {
            console.log("📡 Worker sending ping...");
            self.postMessage("ping"); // שולח פינג חזרה למאזין הראשי
        }, 25000); // כל 25 שניות שולח "ping"
    }
};
