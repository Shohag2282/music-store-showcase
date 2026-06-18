// backend base URL — uses current hostname so phone can also connect to the dev server
// if running on localhost it uses localhost, otherwise it uses the host's IP automatically
const host = window.location.hostname;
const port = window.location.port;
const protocol = window.location.protocol;

// If we are on the Vite dev server port, point to the Express backend port.
// Otherwise, use relative URLs (empty string) for production deployment on Render.
const API_BASE = port === '5173' ? `${protocol}//${host}:5000` : '';

export default API_BASE;
