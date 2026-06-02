/* ============ App Onix — Firebase Firestore sync ============ */

const _fbConfig = {
  apiKey: "AIzaSyCnBi68Y5NxEL5FsLA5p9RpGCQs9jFqlUc",
  authDomain: "app-onix-b0600.firebaseapp.com",
  projectId: "app-onix-b0600",
  storageBucket: "app-onix-b0600.firebasestorage.app",
  messagingSenderId: "226454533039",
  appId: "1:226454533039:web:c368984630093cca07355a",
};

firebase.initializeApp(_fbConfig);
const _db = firebase.firestore();
const _DOC = _db.collection('data').doc('appState');

let _saveTimeout = null;

function syncToFirestore(state) {
  clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(() => {
    _DOC.set({ state: JSON.stringify(state) })
      .catch(e => console.warn('[Firebase] Falha ao salvar:', e));
  }, 800);
}

function subscribeFirestore(callback) {
  return _DOC.onSnapshot(snap => {
    // snap.exists=false → documento ainda não existe (banco vazio): callback(null)
    if (!snap.exists) { callback(null); return; }
    try {
      const parsed = JSON.parse(snap.data().state);
      callback(parsed);
    } catch (e) {
      console.warn('[Firebase] Falha ao ler snapshot:', e);
      callback(null);
    }
  }, e => console.warn('[Firebase] Erro de snapshot:', e));
}

Object.assign(window, { syncToFirestore, subscribeFirestore });
