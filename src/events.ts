
type Event = "seal" | "shark" | "start";
type Handler = () => void;

const listeners: Map<Event, Handler[]> = new Map();

export const addListener = (event: Event, callback: Handler) => {
    listeners[event] ??= [];
    listeners[event].push(callback);
}

export const removeListener = (event: Event, callback: Handler) => {
    listeners[event] = listeners[event]?.filter((item) => item !== callback);
}

export const emit = (event: Event) => {
    listeners[event]?.forEach(listener => listener());
}