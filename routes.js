/* 
* An array of routes that are accessible to public
* These routes do not require authentication
* @type {string[]}
*/
export const publicRoutes = [
    "/",
    "/auth/new-verification",
    "/get-details",
    "/api/secret",
    "/search",
    "/api/forms",
    "/api/organizations",
    // Sends WhatsApp messages from the business number. Left public it can be called by
    // anyone who finds the URL, burning the messaging quota and the number's quality rating.
    // Order notifications don't use this route - they call the Graph API via src/lib/whatsapp.ts.
    // "/api/whatsapp",
]

/* 
* An array of routes that are used for authentication
* These routes will redirect logged in users to /settings
* @type {string[]}
*/
export const authRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/error",
    "/auth/reset",
    "/auth/new-password",
]

/* 
* The prefix for API authentication routes
* Routes that start with this prefix are used for API authentication purposes
* @type {string}
*/
export const apiAuthPrefix = "/api/auth"


/* 
* The default redirect path after logging in
* @type {string}
*/
export const DEFAULT_LOGIN_REDIRECT = "/upload"