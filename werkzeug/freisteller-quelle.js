// Quelle für ui/vendor/freisteller.js (gebaut mit: npm run freisteller).
// KI-Freistellen im Browser mit @imgly/background-removal. Das Modell lädt
// beim ersten Benutzen aus dem Netz (staticimgly.com) und wird danach vom
// Browser-Speicher wiederverwendet.
import { removeBackground } from '@imgly/background-removal';

window.Freisteller = {
  async entferne(blob) {
    return removeBackground(blob, { model: 'isnet_fp16', output: { format: 'image/png' } });
  },
};
