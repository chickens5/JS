import { GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });