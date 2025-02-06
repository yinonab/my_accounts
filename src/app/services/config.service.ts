// config.service.ts
const developmentHosts = ['localhost', '192.168.1.63', '10.0.2.2', '10.100.102.9'];
const isProduction = !developmentHosts.includes(window.location.hostname);

export const config = {
    baseURL: isProduction
        ? 'https://backend-my-accounts.onrender.com/api'
        : `http://${window.location.hostname}:3030/api`  // ישתמש באותו hostname כמו הפרונט
};