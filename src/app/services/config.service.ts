// config.service.ts
const isProduction = window.location.hostname !== 'localhost';

export const config = {
    baseURL: isProduction
        ? 'https://backend-my-accounts.onrender.com/api'
        : 'http://localhost:3030/api'
};