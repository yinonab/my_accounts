// config.service.ts
const developmentHosts = ['localhost', '192.168.1.88', '192.168.1.63', '10.0.2.2', '10.100.102.9'];
const isProduction = !developmentHosts.includes(window.location.hostname);

export const config = {
    baseURL: isProduction
        ? 'https://backend-my-accounts.onrender.com/api'
        : `http://${window.location.hostname}:3030/api`,// ישתמש באותו hostname כמו הפרונט

    notifications: {
        vapidPublicKey: 'BKY_C-R9bVYH6-BWh2E2STfmB37ANCt_v3_IpAWWpNGCJG3EmUOBzn6W0ZzJaKl8xoPxMUOS2aYFqjyCFHtwZ9Y'
        // אותו מפתח לדב ולפרודקשן כרגע, אפשר לשנות בהמשך אם צריך
    }
};