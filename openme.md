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

4. In Firebase Authentication, enable **Email/Password** and create one email/password user for the game host.
5. Configure Firebase Realtime Database rules so everyone can view scores but only signed-in hosts can write them:

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

6. Use the controller link below to sign in and score. Each score change is published to the one shared game record.

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
