// A one-shot local handoff lets a language change reload all SDK-owned UI
// without tearing down live worker subscriptions inside the same page.
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('superdocx-session', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('handoff');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function sessionHandoff(action, value) {
  const db = await database();
  try {
    return await new Promise((resolve,reject) => {
      const tx=db.transaction('handoff',action==='get'?'readonly':'readwrite');
      const store=tx.objectStore('handoff');
      const request=action==='get'?store.get('reload'):action==='put'?store.put(value,'reload'):store.delete('reload');
      tx.oncomplete=()=>resolve(request.result);
      tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error || new Error('Session handoff failed'));
    });
  } finally { db.close(); }
}
