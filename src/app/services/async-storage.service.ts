import { config } from './config.service';
import { getAuthToken } from './util.service';

export const storageService = {
    post,
    get,
    put,
    remove,
    query,
    login
}
const useBackend = true; // Toggle between localStorage and HTTP

interface EntityId {
    _id?: string
}

// async function query<T>(entityType: string, delay = 200): Promise<T[]> {
//     if (useBackend) {
//         // Backend version
//         const response = await fetch(`http://localhost:3030/api/${entityType}`);
//         if (!response.ok) throw new Error(`Failed to query entities: ${response.statusText}`);
//         return response.json();
//     } else {
//         // Local storage version
//         var entities = JSON.parse(localStorage.getItem(entityType) as string) || []
//         return new Promise(resolve => setTimeout(() => resolve(entities), delay))
//     }
// }
async function query<T>(entityType: string, delay = 200): Promise<T[]> {
    if (useBackend) {
        // Retrieve the token
        const loginToken = getAuthToken();
        console.log('loginToken:', loginToken); // Debugging to ensure token is retrieved

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Add Authorization header if token exists
        if (loginToken) {
            headers['Authorization'] = `Bearer ${loginToken}`;
        }

        //const url = `http://localhost:3030/api/${entityType}`;
        const url = `${config.baseURL}/${entityType}`;
        const response = await fetch(url, {
            method: 'GET',
            headers, // Include headers for Bearer token
            credentials: 'include', // Ensure cookies are included
        });

        if (!response.ok) {
            throw new Error(`Failed to query entities from ${entityType}: ${response.statusText}`);
        }

        return response.json();
    } else {
        // Local storage version
        const entities = JSON.parse(localStorage.getItem(entityType) as string) || [];
        return new Promise(resolve => setTimeout(() => resolve(entities), delay));
    }
}


async function get<T extends EntityId>(entityType: string, entityId: string): Promise<T> {
    if (useBackend) {
        // Backend version
        // const response = await fetch(`http://localhost:3030/api/${entityType}/${entityId}`);
        const response = await fetch(`${config.baseURL}/${entityType}/${entityId}`);

        if (!response.ok) throw new Error(`Failed to get entity with id ${entityId}: ${response.statusText}`);
        return response.json();
    } else {
        // Local version
        const entities = await query<T>(entityType)
        const entity = entities.find(entity_1 => entity_1._id === entityId)
        if (!entity) throw new Error(`Get failed, cannot find entity with id: ${entityId} in: ${entityType}`)
        return entity
    }
}

// async function post<T extends EntityId>(entityType: string, newEntity: T, customPath?: string): Promise<T> {
//     if (useBackend) {
//         // Allow overriding the default URL path
//         const url = customPath || `http://localhost:3030/api/${entityType}`;
//         const response = await fetch(url, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(newEntity),
//         });
//         if (!response.ok) throw new Error(`Failed to save entity: ${response.statusText}`);
//         return response.json();
//     } else {
//         // Local version
//         newEntity = JSON.parse(JSON.stringify(newEntity))
//         newEntity._id = _makeId()
//         const entities = await query<T>(entityType)
//         entities.push(newEntity)
//         _save(entityType, entities)
//         return newEntity
//     }
// }

async function login<T>(path: string, data: any): Promise<T> {
    // const url = `http://localhost:3030/api/${path}`;
    const url = `${config.baseURL}/${path}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include', // Ensure cookies are sent/received
    });
    if (!response.ok) throw new Error(`Failed to login: ${response.statusText}`);
    return response.json();
}



async function post<T extends object>(
    entityType: string,
    newEntity: T,
    customPath?: string
): Promise<T> {
    if (useBackend) {
        // const url = customPath || `http://localhost:3030/api/${entityType}`;
        const url = customPath ? `${config.baseURL}/${customPath}` : `${config.baseURL}/${entityType}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        const loginToken = getAuthToken(); // Retrieve the token
        console.log('loginToken:', loginToken);
        if (loginToken) headers['Authorization'] = `Bearer ${loginToken}`;

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(newEntity),
            credentials: 'include',
        });

        if (!response.ok) throw new Error(`Failed to save entity: ${response.statusText}`);
        return response.json();
    } else {
        // Local storage version
        if ('_id' in newEntity) {
            const entityWithId = { ...newEntity, _id: _makeId() } as EntityId;
            const entities = await query<EntityId>(entityType);
            entities.push(entityWithId);
            _save(entityType, entities);
            return entityWithId as T;
        }
        throw new Error('Local storage operations require `_id` field.');
    }
}




async function put<T extends EntityId>(entityType: string, updatedEntity: T): Promise<T> {
    if (useBackend) {
        // Backend version
        // const url = `http://localhost:3030/api/${entityType}/${updatedEntity._id}`;
        const url = `${config.baseURL}/${entityType}/${updatedEntity._id}`;
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        const loginToken = getAuthToken(); // Retrieve the token
        console.log('loginToken:', loginToken);
        if (loginToken) headers['Authorization'] = `Bearer ${loginToken}`; // Add Authorization header

        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updatedEntity),
            credentials: 'include',
        });

        if (!response.ok) throw new Error(`Failed to update entity with id ${updatedEntity._id}: ${response.statusText}`);
        return response.json();
    } else {
        // Local version
        updatedEntity = JSON.parse(JSON.stringify(updatedEntity))
        const entities = await query<T>(entityType)
        const idx = entities.findIndex(entity => entity._id === updatedEntity._id)
        if (idx < 0) throw new Error(`Update failed, cannot find entity with id: ${updatedEntity._id} in: ${entityType}`)
        entities.splice(idx, 1, updatedEntity)
        _save(entityType, entities)
        return updatedEntity
    }
}
async function remove<T extends EntityId>(entityType: string, entityId: string): Promise<void> {
    if (useBackend) {
        // Retrieve the token
        const loginToken = getAuthToken();
        console.log('loginToken:', loginToken); // Debugging to ensure token is retrieved

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Add Authorization header if token exists
        if (loginToken) {
            headers['Authorization'] = `Bearer ${loginToken}`;
        }

        // const url = `http://localhost:3030/api/${entityType}/${entityId}`;
        const url = `${config.baseURL}/${entityType}/${entityId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers, // Include headers with the token
            credentials: 'include', // Ensure cookies are included
        });

        if (!response.ok) {
            throw new Error(`Failed to remove entity with id ${entityId}: ${response.statusText}`);
        }
    } else {
        // Local version
        const entities = await query<T>(entityType);
        const idx = entities.findIndex(entity => entity._id === entityId);
        if (idx < 0) {
            throw new Error(`Remove failed, cannot find entity with id: ${entityId} in: ${entityType}`);
        }
        entities.splice(idx, 1);
        _save(entityType, entities);
    }
}


// Private functions
function _save<T>(entityType: string, entities: T[]): void {
    localStorage.setItem(entityType, JSON.stringify(entities))
}

function _makeId(length = 5): string {
    var txt = ''
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (var i = 0; i < length; i++) {
        txt += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return txt
}