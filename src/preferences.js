// Read host defaults before i18n or the editor initializes. Saved choices win.
async function readSystemDefaults() {
 try { if(window.desktop?.getDefaults) return await window.desktop.getDefaults(); } catch { /* Browser defaults remain available. */ }
 return {username:'User',language:/^zh(?:[-_]|$)/i.test(navigator.languages?.[0]||navigator.language||'')?'zh':'en'};
}
export const systemDefaults=await readSystemDefaults();
export function initialLanguage(){const saved=localStorage.getItem('superdocx.language');return saved==='zh'||saved==='en'?saved:systemDefaults.language;}
export function initialAuthor(){return localStorage.getItem('superdocx.author')?.trim()||systemDefaults.username;}
