/*
  AudioWorklet: mikrofon oqimidan siqilmagan PCM (Float32) bo'laklarini asosiy oqimga yuboradi.
  Chap va o'ng kanal alohida yuboriladi (mono qurilmada o'ng kanal null) — studiya
  interfeyslarida signal bitta kanalda bo'lishi mumkin; qaysi kanal olinishi
  yozuv tugagach hal qilinadi. Sifat bu yerda yo'qolmaydi.
*/

class PcmCapture extends AudioWorkletProcessor {

  process(inputs) {

    const input = inputs[0];

    if (input && input.length && input[0] && input[0].length) {

      const left = input[0].slice();

      const right = input.length > 1 ? input[1].slice() : null;

      const transfer = [left.buffer];

      if (right) {
        transfer.push(right.buffer);
      }

      this.port.postMessage({ l: left, r: right }, transfer);

    }

    return true;

  }

}

registerProcessor("pcm-capture", PcmCapture);
