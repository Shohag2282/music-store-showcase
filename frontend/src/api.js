// backend base URL — uses current hostname so phone can also connect to the dev server
// if running on localhost it uses localhost, otherwise it uses the host's IP automatically
const host = window.location.hostname;
const API_BASE = `http://${host}:5000`;

export default API_BASE;
