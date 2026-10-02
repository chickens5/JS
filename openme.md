# Trivia Night

## Run locally

Open `index.html` in a browser. The controller saves the current game in that browser's local storage.

## Enable live spectator scores

1. Create a Firebase project and add a Web app at [Firebase Console](https://console.firebase.google.com/).
2. Create a Realtime Database in that project.
3. Copy the web app configuration object into `firebase-config.js`:

```js
export const firebaseConfig = {
	apiKey: '...',
	authDomain: '...',
	databaseURL: '...',
	projectId: '...',
	storageBucket: '...',
	messagingSenderId: '...',
	appId: '...'
};
```

4. In Firebase Authentication, enable **Google** as a sign-in provider. Under **Settings → Authorized domains**, add `chickens5.github.io`. If the OAuth consent screen is in testing mode, add the host's Google account as a test user in Google Cloud.
5. The host signs in with Google at `https://chickens5.github.io/JS/?mode=controller`.
6. Optionally enable **Email/Password** and create one email/password user as a fallback host login.
7. Configure Firebase Realtime Database rules so everyone can view scores but only signed-in hosts can write them:

```json
{
	"rules": {
		"games": {
			"$game": {
				".read": true,
				".write": "auth != null"
			}
		}
	}
}
```

8. Use the controller link below to sign in and score. Each score change is published to the one shared game record.

## Publish and share

1. Put this `JS` folder in a GitHub repository and enable GitHub Pages from the repository's `main` branch.
2. Use this controller URL only on the scoring device:

```
https://your-account.github.io/JS/?mode=controller
```

3. Give spectators the base URL, then turn it into a QR code:

```
https://your-account.github.io/JS/
```

All links connect to the same shared live game. Keep the controller URL private; the public URL is read-only.
