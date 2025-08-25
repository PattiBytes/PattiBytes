document.addEventListener('DOMContentLoaded', () => {

 
  // --- History Modal with Navigation ---
  const historyData = {
    'ancient': {
      title: 'ਪੁਰਾਤਨ ਅਤੇ ਮੱਧਕਾਲੀਨ ਕਾਲ',
      content: `
        <p>ਪੱਟੀ ਸ਼ਹਿਰ, ਜੋ ਤਰਨਤਾਰਨ ਜ਼ਿਲ੍ਹੇ ਵਿੱਚ ਸਥਿਤ ਹੈ, ਪੁਰਾਤਨ ਸਮਿਆਂ ਤੋਂ ਹੀ ਵਪਾਰਕ ਤੇ ਆਰਥਿਕ ਮਹੱਤਤਾ ਲਈ ਪ੍ਰਸਿੱਧ ਰਿਹਾ ਹੈ। ਇੱਥੇ ਦੇ ਹਰ ਪਾਸੇ ਪ੍ਰਾਚੀਨ ਇਤਿਹਾਸ ਦੀਆਂ ਝਲਕਾਂ ਮਿਲਦੀਆਂ ਹਨ। ਸ਼ੁਰੂ ਵਿੱਚ ਇਸਨੂੰ "ਪੱਟੀ-ਹੈਬਤਪੁਰਾ" ਕਿਹਾ ਜਾਂਦਾ ਸੀ। ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਵਿੱਚ "ਪੱਟੀ" ਦਾ ਅਰਥ ਆਮ ਤੌਰ 'ਤੇ ਜ਼ਮੀਨ ਦੀ ਪੱਟੀ ਜਾਂ ਇੱਕ ਖੇਤਰ ਹੁੰਦਾ ਹੈ, ਜਦੋਂ ਕਿ ਇੱਥੇ ਇਸਦਾ ਸੰਬੰਧ ਸ਼ਹਿਰ ਦੀ ਬਣਤਰ (ਗਲੀਆਂ ਵਾਲੇ ਮੁਹੱਲੇ) ਜਾਂ ਪੇਂਡੂ ਭਾਈਚਾਰੇ ਨਾਲ ਵੀ ਜੋੜਿਆ ਜਾਂਦਾ ਹੈ। ਮੰਨਿਆ ਜਾਂਦਾ ਹੈ ਕਿ ਪੱਟੀ ਦਾ ਨਾਂ ਲੋਦੀ-ਸ਼ਾਸਨ ਵਾਲੇ ਹਾਇਬਤ ਖ਼ਾਨ ("ਹੈਬਤਪੁਰਾ") ਤੋਂ ਲਿਆ ਗਿਆ, ਪਰ ਬਾਅਦ ਵਿੱਚ ਲੋਕ ਸੌਖੀ ਤਰੀਕੇ ਨਾਲ ਸਿਰਫ਼ "ਪੱਟੀ" ਕਹਿਣ ਲੱਗੇ। ਮੱਧਕਾਲੀਨ ਦੌਰ ਵਿੱਚ ਇਹ ਸ਼ਹਿਰ ਆਪਣੀ ਆਰਥਿਕ ਸਮਰੱਥਾ ਕਾਰਨ "ਨੌ ਲੱਖੀ ਪੱਟੀ" ਵਜੋਂ ਜਾਣਿਆ ਗਿਆ, ਜਿਸਦਾ ਮਤਲਬ ਸੀ ਕਿ ਇੱਥੋਂ ਦੀ ਸਾਲਾਨਾ ਭੂਮੀ ਮਾਲੀਆ (land revenue) ਲਗਭਗ ਨੌ ਲੱਖ ਰੁਪਏ ਤੋਂ ਵੱਧ ਸੀ। ਇਹ ਇਸਦੇ ਵੱਡੇ ਆਰਥਿਕ ਮਹੱਤਵ ਨੂੰ ਦਰਸਾਉਂਦਾ ਸੀ, ਨਾ ਕਿ ਸ਼ਹਿਰ ਦੀ ਕੁੱਲ ਕਮਾਈ ਨੂੰ। ਇਸ ਵੱਡੀ ਆਰਥਿਕ ਸਮਰੱਥਾ ਕਾਰਨ ਇੱਥੋਂ ਦੇ ਜ਼ਮੀਨਦਾਰਾਂ ਦਾ ਰਾਜਨੀਤਿਕ ਰਸੂਖ ਵਧ ਗਿਆ ਅਤੇ ਕਈ ਵਪਾਰਕ ਰਾਹਦਾਰੀਆਂ ਇੱਥੋਂ ਲੰਘਦੀਆਂ ਸਨ।</p>
      `
    },
    'mughal': {
      title: 'ਮੁਗਲ ਕਾਲ',
      content: `
        <p>ਮੁਗਲ ਸ਼ਾਸਨ ਦੌਰਾਨ (16ਵੀਂ–18ਵੀਂ ਸਦੀ), ਪੱਟੀ ਸੂਬੇ ਦੇ ਮੁਗਲ ਗਵਰਨਰਾਂ ਦੀ ਰਹਾਇਸ਼ ਦਾ ਪ੍ਰਮੁੱਖ ਥਾਂ ਹੋ ਗਿਆ। ਗਵਰਨਰ ਇੱਥੇ ਟੈਕਸ ਵਸੂਲਦੇ, ਕਾਨੂੰਨ-ਵਿਵਸਥਾ ਚਲਾਉਂਦੇ ਅਤੇ ਲੋਕਾਂ ਵਿੱਚ ਮੁਗਲ ਸਰਕਾਰ ਦੀ ਹਿੱਕ ਲਗਾਉਂਦੇ। 1755–56 ਵਿੱਚ ਇੱਥੇ ਇੱਟਾਂ ਨਾਲ ਇਤਿਹਾਸਕ ਮੁਗਲ ਕਿਲ੍ਹਾ ਬਣਾਇਆ ਗਿਆ, ਜੋ ਬਾਅਦ ਵਿੱਚ ਲੰਬੇ ਸਮੇਂ ਲਈ ਪੁਲਿਸ ਥਾਣੇ ਵਜੋਂ ਵਰਤਿਆ ਗਿਆ। ਸ਼ਹਿਰ ਦੀ ਬਾਹਰੀ ਕੰਧ ਵੀ ਉਸ ਸਮੇਂ ਸ਼ਹਿਰ ਦੀ ਹੱਦ ਦਰਸਾਉਣਦੀ ਸੀ, ਪਰ ਹੁਣ ਇਹ ਢਿੱਗ-ਫੁਟੀਆਂ ਹਾਲਤ ਵਿੱਚ ਹੈ ਕਿਉਂਕਿ ਸਰਕਾਰੀ ਤੌਰ ’ਤੇ ਇਸ ਦੀ ਸੰਭਾਲ ਠੀਕ ਤਰ੍ਹਾਂ ਨਹੀਂ ਕੀਤੀ ਗਈ। ਇਸ ਦੇ ਨਾਲ-ਨਾਲ ਕਈ ਹੋਰ ਮੁਗਲ-ਯੁੱਗ ਦੀਆਂ ਇਮਾਰਤਾਂ ਜਿਵੇਂ ਮਸਜ਼ਿਦਾਂ, ਮਕਬਰੇ ਵੀ ਇੱਟਾਂ ਦੇ ਟੁਕੜਿਆਂ ਵਾਂਗ ਕੁਝ ਕੁ ਹੀ ਬਚੇ ਹਨ, ਪਰ ਉਹ ਵੀ ਖਰਾਬ ਹਾਲਤ ਵਿੱਚ ਹਨ ਕਿਉਂਕਿ ਸਰਕਾਰੀ ਧਿਆਨ ਇਨ੍ਹਾਂ ਉੱਤੇ ਕਮ ਹੈ।</p>
      `
    },
    'sikh': {
      title: 'ਸਿੱਖ ਰਾਜ',
      content: `
        <p>18ਵੀਂ ਸਦੀ ਦੇ ਆਖਰੀ ਪੀਰੀਅਡ ‘ਚ ਮੁਗਲ ਸ਼ਕਤੀ ਕਮਜ਼ੋਰ ਹੋ ਗਿਆ, ਤਦ ਪੱਟੀ ਸਿੱਖ ਫ਼ੈਸਲਪੁਰੀਆ ਮਿਸਲ ਦੀ ਰਾਜਨੀਤਕ ਲੜਾਈ ਦਾ ਹਿੱਸਾ ਬਣਿਆ। 1755 ਵਿੱਚ ਖ਼ੁਸ਼ਾਲ ਸਿੰਘ ਨੇ ਪੱਟੀ ‘ਤੇ ਫ਼ਤਹ ਕੀਤੀ ਸੀ, ਪਰ ਅਖੀਰਕਾਰ 1811 ਵਿੱਚ ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਦੀ ਫੌਜ ਨੇ ਸ਼ਹਿਰ ਨੂੰ ਆਪਣੇ ਸਿੱਖ ਸਾਮਰਾਜ ਵਿੱਚ ਜੋੜ ਲਿਆ। ਇਸ ਹਮਲੇ ਦੌਰਾਨ ਕਿਲ੍ਹੇ ਦੀ ਬਾਹਰੀ ਕੰਧ ਵੀ ਤਬਾਹ ਹੋ ਗਈ। ਉਸੇ ਦੌਰਾਨ ਇੱਥੇ ਰਹਿ ਰਹੇ ਮਿਰਜ਼ੇ ਪਰਿਵਾਰ ਦੀ ਹਾਲਤ ਬਦਲੀ; ਉਨ੍ਹਾਂ ਦੀਆਂ ਵੱਡੀਆਂ ਹਵੈਲੀਆਂ ਟੁੱਟਣੀਆਂ ਪਈਆਂ। ਬਾਅਦ ਵਿੱਚ ਮਿਰਜ਼ੇ ਪਾਕਿਸਤਾਨ ਵੱਲ ਚਲੇ ਗਏ ਤੇ ਉਨ੍ਹਾਂ ਦੀਆਂ ਹਵੈਲੀਆਂ ਖੇਤੀ ਲਈ ਤੋੜੀਆਂ ਗਈਆਂ। ਇਸ ਤਬਦੀਲੀ ਨੇ ਪੱਟੀ ਦੀ ਧਾਰਮਿਕ ਤੇ ਸਮਾਜਿਕ ਸਫ਼ਤਾਂ ‘ਚ ਵੱਡੇ ਫਰਕ ਲਿਆਏ।</p>
      `
    },
    'british': {
      title: 'ਬ੍ਰਿਟਿਸ਼ ਹਕੂਮਤ',
      content: `
        <p>ਬ੍ਰਿਟਿਸ਼ ਹਕੂਮਤ ਆਉਣ ‘ਤੇ (1850–1947), ਪੱਟੀ ਇੱਕ ਛੋਟਾ ਟਾਊਨ ਰਹਿ ਗਿਆ; ਉਸ ਸਮੇਂ ਦੇ ਯਾਤਰੀ ਅਲੇਕਜ਼ੈਂਡਰ ਬਰਨਜ਼ ਵੱਲੋਂ ਲਿਖੇ ਅਨੁਸਾਰ 19ਵੀਂ ਸਦੀ ਵਿੱਚ ਇੱਥੇ ਲਗਭਗ 5,000 ਲੋਕ ਰਹਿੰਦੇ ਸਨ। ਇਸ ਦੌਰਾਨ ਇਤਿਹਾਸਕ ਇਮਾਰਤਾਂ, ਜਿਵੇਂ ਕਿ ਮੁਗਲ ਕਿਲ੍ਹੇ ਦੀਆਂ ਕੰਧਾਂ ਅਤੇ ਸੋਫ਼ੀ ਦਰਗਾਹਾਂ ਦੇ ਕੁਝ ਟੁਕੜੇ ਹੀ ਬਚੇ ਰਹਿ ਗਏ, ਕਿਉਂਕਿ ਸੰਭਾਲ ਲਈ ਸਰਕਾਰੀ ਧੁਰੱਖਣ ਨਹੀਂ ਸੀ।</p>
        <h4>ਭਾਰਤ-ਪਾਕਿਸਤਾਨ ਵੰਡ (1947)</h4>
        <p>1947 ਵਿੱਚ ਹੋਈ ਭਾਰਤ-ਪਾਕਿਸਤਾਨ ਦੀ ਵੰਡ ਨੇ ਪੱਟੀ ਦੇ ਲੋਕਾਂ ਦੇ ਜੀਵਨ ਤੇ ਧਾਰਮਿਕ ਸਥਿਤੀਆਂ ਵਿੱਚ ਡੂੰਘਾ ਅਸਰ ਕੀਤਾ। ਵੰਡ ਤੱਕ, ਪੱਟੀ ਲਾਹੌਰ ਜ਼ਿਲ੍ਹੇ ਦੀ ਇੱਕ ਤਹਿਸੀਲ ਸੀ, ਪਰ ਵੰਡ ਤੋਂ ਬਾਅਦ ਇਹ ਅੰਮ੍ਰਿਤਸਰ ਜ਼ਿਲ੍ਹੇ ਦੀ ਮਾਨਕ ਤਹਿਸੀਲ ਬਣ ਗਿਆ। ਕਈ ਮੁਸਲਿਮ ਪਰਿਵਾਰ, ਖ਼ਾਸ ਕਰਕੇ ਮਿਰਜ਼ੇ ਅਤੇ ਗਿਲਾਨੀ ਪਰਿਵਾਰ, ਪਾਕਿਸਤਾਨ ਚਲੇ ਗਏ, ਜਿਸ ਕਰਕੇ ਇੱਥੋਂ ਦੀ ਲੋਕਸੰਖਿਆ ਅਤੇ ਧਾਰਮਿਕ ਸੰਘਟਨਾਅ ‘ਚ ਸੰਕੋਚ ਆਇਆ। ਬਾਅਦ ਵਿੱਚ 2006 ਵਿੱਚ ਤਰਨਤਾਰਨ ਜ਼ਿਲ੍ਹਾ ਬਣਨ ‘ਤੇ ਪੱਟੀ ਇਸ ਦਾ ਹਿੱਸਾ ਬਣ ਗਿਆ। ਇਸ ਤਬਦੀਲੀ ਨੇ ਪੱਟੀ ਨੂੰ ਨਵਾਂ ਰੂਪ ਦਿੱਤਾ, ਜਿੱਥੇ ਲੋਕ ਖੇਤੀ-ਬਾੜੀ ਦੇ ਨਾਲ-ਨਾਲ ਸਿੱਖਿਆ ਅਤੇ ਵਪਾਰ ਵਿੱਚ ਵੀ ਅੱਗੇ ਵਧਣ ਲੱਗੇ।</p>
      `
    },
    'modern': {
      title: 'ਆਧੁਨਿਕ ਕਾਲ',
      content: `
        <p>2006 ਤੋਂ ਬਾਅਦ, ਪੱਟੀ ਇੱਕ ਅਹਿਮ ਪ੍ਰਸ਼ਾਸਕੀ ਭੂਮਿਕਾ ਵਾਲਾ ਸ਼ਹਿਰ ਹੈ। ਕੋਵਿਡ ਮਹਾਂਮਾਰੀ ਦੌਰਾਨ ਇੱਥੇ ਦੱਸਿਆ ਗਿਆ ਕਿ ਸਰਹੱਦੀ ਸ਼ਹਿਰ ਵਜੋਂ 100% ਯੋਗ ਲੋਕਾਂ ਨੂੰ ਪਹਿਲੀ ਵੈਕਸੀਨ ਦੀ ਡੋਜ਼ ਲੱਗੀ। ਇਥੋਂ ਦੇ ਕਈ ਸਕੂਲ ਤੇ ਕਾਲਜ ਖੁੱਲ੍ਹ ਰਹੇ ਹਨ, ਜਿਸ ਨਾਲ ਪੜ੍ਹਾਈ 'ਤੇ ਧਿਆਨ ਵਧਿਆ ਹੈ। ਪਰ ਹਾਲੇ ਵੀ ਚੰਗੀ-ਤਰ੍ਹਾਂ ਇਤਿਹਾਸਕ ਧਰੋਹਰ ਦੀ ਸੰਭਾਲ ਨਹੀਂ ਹੋਈ, ਜੀਵਤ ਇਮਾਰਤਾਂ, ਮਸਜਿਦਾਂ, ਗੁਰਦੁਆਰਿਆਂ ਅਤੇ ਦਰਗਾਹਾਂ ਦੀ ਰੱਖਿਆ ਲਈ ਅਜੇ ਅਣਗਿਣਤ ਯੋਜਨਾਵਾਂ ਬਣਨੀਆਂ ਹਨ। ਕਈ ਇਤਿਹਾਸਕ ਇਮਾਰਤਾਂ, ਜਿਹੜੀਆਂ ਮੁਗਲ ਜਾਂ ਸਿੱਖ ਯੁੱਗ ਦੀਆਂ ਢਾਂਚਾਗਤ ਯਾਦਗਾਰਾਂ ਹਨ, ਉਨ੍ਹਾਂ ਦੀ ਦੇਸ਼ ਦੀ ਸਰਕਾਰ ਵੱਲੋਂ ਬਹੁਤ ਘੱਟ ਸੰਭਾਲ ਕੀਤੀ ਜਾਂਦੀ ਹੈ। ਕੁਝ ਢਹਿ-ਢੇਰੀ ਹੋ ਰਹੀਆਂ ਹਵੇਲੀਆਂ, ਸ਼ਹਿਰ ਦੀ ਕੰਧ ਦੇ ਟੁਕੜੇ, ਅਤੇ ਕੁਝ ਮੰਦਰ-ਮਸਜਿਦਾਂ ਬਚੇ ਹਨ, ਪਰ ਅੱਜ ਉਦਾਸ ਚਿਹਰੇ ਵਾਂਗ ਖੜ੍ਹੇ ਹਨ। ਇਸ ਲਈ ਸਥਾਨਕ ਲੋਕ, ਸਰਕਾਰੀ ਪੇਸ਼ੇਵਰਾਂ ਤੇ ਧਾਰਮਿਕ ਗੁਰਦੁਆਰੇ ਮਿਲਕੇ ਇਹ ਯਤਨ ਕੀਤਾ ਹੈ ਕਿ ਇਨ੍ਹਾਂ ਥਾਵਾਂ ਨੂੰ ਮੁੜ ਉਜਾਗਰ ਕੀਤਾ ਜਾਵੇ, ਤਾਂ ਜੋ ਆਉਂਦੀ ਪੀੜ੍ਹੀ ਵੀ ਇਨ੍ਹਾਂ ਤੋਂ ਸਿੱਖ ਸਕੇ।</p>
        <h4>ਮਹੱਤਵਪੂਰਨ ਸ਼ਖਸੀਅਤਾਂ</h4>
        <ul>
          <li><strong>ਰਾਏ ਧੂਨੀ ਚੰਦ</strong>: ਰਾਏ ਧੂਨੀ ਚੰਦ ਪੱਟੀ ਦੇ ਇੱਕ ਪ੍ਰਸਿੱਧ ਅਤੇ ਧਨਾਢ ਜ਼ਮੀਨਦਾਰ ਸਨ।</li>
          <li><strong>ਬੀਬੀ ਰਜਨੀ</strong>: ਰਾਏ ਧੂਨੀ ਚੰਦ ਦੀ ਧੀ, ਜਿਨ੍ਹਾਂ ਦੀ ਕਥਾ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦੇ ਸਰੋਵਰ ਦੀ ਉਸਾਰੀ ਨਾਲ ਜੁੜੀ ਹੋਈ ਹੈ।</li>
          <li><strong>ਮਿਰਜ਼ੇ ਪਰਿਵਾਰ</strong>: ਮੁਗਲ ਕਾਲ ਵਿੱਚ ਇਸ ਸ਼ਹਿਰ ‘ਤੇ ਰਾਜ ਕਰਦੇ, ਪਰ 1947 ਤੋਂ ਬਾਅਦ ਵੰਡ ਵਾਲੇ ਦੌਰ ‘ਚ ਪਾਕਿਸਤਾਨ ਚਲੇ ਗਏ।</li>
          <li><strong>ਗਿਲਾਨੀ ਪਰਿਵਾਰ</strong>: ਸੋਫ਼ੀ ਸੰਤਾਂ ਦੇ ਵੰਸ਼, ਜਿਨ੍ਹਾਂ ਦੀਆਂ ਦਰਗਾਹਾਂ ਦੀਆਂ ਯਾਦਗਾਰਾਂ ਇਥੇ ਹਾਲੇ ਵੀ ਨਜ਼ਰ ਆਉਂਦੀਆਂ ਹਨ।</li>
        </ul>
        <p>ਅੰਤ ਵਿੱਚ, ਪੱਟੀ ਦਾ ਇਤਿਹਾਸ ਲਗਭਗ ਹਜ਼ਾਰ ਸਾਲ ਮਿੱਟੀ ਨਾਲ ਜੁੜਿਆ ਰਹਿਆ...</p>
      `
    }
  };

  const timelineItems = document.querySelectorAll('.timeline-item');
  const modal = document.getElementById('history-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContentDiv = document.getElementById('modal-text-content');
  const closeModalBtn = document.getElementById('modal-close');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  const eras = Object.keys(historyData);
  let currentEraIndex = 0;

  function updateModalContent(eraIndex) {
    const era = eras[eraIndex];
    const data = historyData[era];
    modalTitle.textContent = data.title;
    modalContentDiv.innerHTML = data.content;

    prevBtn.disabled = eraIndex === 0;
    nextBtn.disabled = eraIndex === eras.length - 1;
  }

  function showModal() {
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  timelineItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      currentEraIndex = index;
      updateModalContent(currentEraIndex);
      showModal();
    });
  });

  closeModalBtn.addEventListener('click', hideModal);

  prevBtn.addEventListener('click', () => {
    if (currentEraIndex > 0) {
      currentEraIndex--;
      updateModalContent(currentEraIndex);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentEraIndex < eras.length - 1) {
      currentEraIndex++;
      updateModalContent(currentEraIndex);
    }
  });

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      hideModal();
    }
  });

  // --- Animated Number Counters ---
  const elements = document.querySelectorAll('.animated-number');
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.5
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const endValue = parseInt(target.dataset.target, 10);
        const format = target.dataset.format;
        let startTimestamp = null;
        const duration = 2000;

        const step = (timestamp) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = timestamp - startTimestamp;
          const currentNumber = Math.min(progress / duration * endValue, endValue);
          target.textContent = Math.floor(currentNumber).toLocaleString() + (format ? format : '');
          if (progress < duration) {
            window.requestAnimationFrame(step);
          } else {
            target.textContent = endValue.toLocaleString() + (format ? format : '');
          }
        };
        window.requestAnimationFrame(step);
        observer.unobserve(target);
      }
    });
  }, observerOptions);

  elements.forEach(el => observer.observe(el));
});
