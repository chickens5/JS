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

4. Configure Firebase Realtime Database rules so your audience can read the game. For a one-time event, allow access only while the event is running, then lock the database again afterward.
5. Use the controller page normally. Each score change is published to Firebase.

## Publish and share

1. Put this `JS` folder in a GitHub repository and enable GitHub Pages from the repository's `main` branch.
2. Use the deployed controller URL on the scoring device, for example `https://your-account.github.io/trivia-night/`.
3. Give spectators this URL, then turn it into a QR code:

```
https://your-account.github.io/trivia-night/?view=live
```

To run another event on the same Firebase project without overwriting scores, add a unique game id to both URLs:

```
https://your-account.github.io/trivia-night/?game=october-quiz
https://your-account.github.io/trivia-night/?view=live&game=october-quiz
```
