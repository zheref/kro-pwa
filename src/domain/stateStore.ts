import parseJson from "parse-json";

const isBrowser = typeof window !== "undefined";

// Safe storage access with error handling
const getStorage = (type: 'local' | 'session') => {
    if (!isBrowser) return null;
    try {
        return type === 'local' ? window.localStorage : window.sessionStorage;
    } catch (error) {
        console.warn(`Failed to access ${type}Storage:`, error);
        return null;
    }
};

const local = getStorage('local');
const session = getStorage('session');

function insertObject<O>(key: string, object: O) {
    if (!isBrowser || !local) return;
    try {
        local.setItem(key, JSON.stringify(object));
    } catch (error) {
        console.warn('Failed to insert object into storage:', error);
    }
}

function getObject<O>(key: string): O | null {
    if (!isBrowser || !local) return null;
    try {
        const result = local.getItem(key);
        if (result) {
            return JSON.parse(result);
        }
    } catch (error) {
        console.warn('Failed to get object from storage:', error);
    }
    return null;
}

function savePreference<T>(key: string, value: T) {
    if (!isBrowser || !local) return;
    try {
        local.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Failed to save preference:', error);
    }
}

function readPreference(key: string): unknown {
    if (!isBrowser || !local) return null;
    try {
        return parseJson(local.getItem(key));
    } catch (error) {
        console.warn('Failed to read preference:', error);
        return null;
    }
}

function remember(key: string, value: string) {
    if (!isBrowser || !session) return;
    try {
        session.setItem(key, value);
    } catch (error) {
        console.warn('Failed to remember value:', error);
    }
}

function memory(key: string): string | null {
    if (!isBrowser || !session) return null;
    try {
        return session.getItem(key);
    } catch (error) {
        console.warn('Failed to get memory value:', error);
        return null;
    }
}

export { insertObject, getObject, savePreference, readPreference, remember, memory };