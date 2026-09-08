import { updateBibliography } from '../../src/citations';
window.updateProbeBibliography=()=>updateBibliography(window.probe.activeEditor.doc);
import { SuperDoc } from 'superdoc';
import 'superdoc/style.css';
window.startProbe = file => {
  window.probe = new SuperDoc({selector:'#editor',document:new File([new Uint8Array(file)],'sample.docx'),telemetry:{enabled:false},onReady:()=>{window.probeReady=true;}});
};
