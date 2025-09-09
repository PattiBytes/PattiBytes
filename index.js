document.addEventListener('DOMContentLoaded', () => {
  // ========== 1) Full, enriched history content (eras) ==========
  // Detailed narrative, monuments, Sikh history, cultural impact, conservation notes.
  // Works with Prev/Next (era-labeled) and Jump-to-era select.
  const historyData = {
    

  'ancient': {
    title: 'ਪੁਰਾਤਨ ਅਤੇ ਮੱਧਕਾਲੀਨ ਕਾਲ',
    content: `
      <h4>🌟 ਪੱਟੀ ਦਾ ਪੁਰਾਣਾ ਇਤਿਹਾਸ: ਸੌਖੀ ਪੰਜਾਬੀ ਵਿੱਚ ਜਾਣੋ 🕰️</h4>
      <p>ਪੱਟੀ ਸ਼ਹਿਰ, ਜੋ ਕਿ ਪੰਜਾਬ ਦੇ ਤਰਨ ਤਾਰਨ ਜ਼ਿਲ੍ਹੇ ਵਿੱਚ ਵਸਿਆ ਹੋਇਆ ਹੈ, ਇੱਕ ਅਜਿਹਾ ਇਤਿਹਾਸਕ ਸ਼ਹਿਰ ਹੈ ਜਿਸਦੀਆਂ ਜੜ੍ਹਾਂ ਕਈ ਸਦੀਆਂ ਪੁਰਾਣੀਆਂ ਹਨ। ਇਹ ਤਰਨ ਤਾਰਨ ਸਾਹਿਬ ਦੇ ਨੇੜੇ ਅਤੇ ਅੰਮ੍ਰਿਤਸਰ ਤੋਂ ਲਗਭਗ 47 ਕਿਲੋਮੀਟਰ ਦੀ ਦੂਰੀ 'ਤੇ ਸਥਿਤ ਹੈ, ਅਤੇ ਇਸਦੀ ਪਾਕਿਸਤਾਨ ਨਾਲ ਅੰਤਰਰਾਸ਼ਟਰੀ ਸਰਹੱਦ ਤੋਂ ਨੇੜਤਾ ਨੇ ਇਸਦੇ ਇਤਿਹਾਸ ਨੂੰ ਹੋਰ ਵੀ ਖਾਸ ਬਣਾਇਆ ਹੈ। ਮੰਨਿਆ ਜਾਂਦਾ ਹੈ ਕਿ ਪੱਟੀ ਦਾ ਇਤਿਹਾਸ ਲਗਭਗ ਇੱਕ ਹਜ਼ਾਰ ਸਾਲ ਪੁਰਾਣਾ ਹੈ, ਜੋ ਪੰਜਾਬ ਦੇ ਮਾਝਾ ਖੇਤਰ ਵਿੱਚ ਇਸਦੀ ਲੰਮੀ ਅਤੇ ਪ੍ਰਭਾਵਸ਼ਾਲੀ ਮੌਜੂਦਗੀ ਨੂੰ ਦਰਸਾਉਂਦਾ ਹੈ।</p>
      <h4>ਪੱਟੀ: ਨਾਮ ਅਤੇ ਪੁਰਾਣੀ ਸ਼ਾਨ</h4>
      <p>ਮੂਲ ਰੂਪ ਵਿੱਚ "ਪੱਟੀ ਹੈਬਤਪੁਰਾ" ਵਜੋਂ ਜਾਣਿਆ ਜਾਂਦਾ, ਇਹ ਸ਼ਹਿਰ ਸਮੇਂ ਦੇ ਨਾਲ ਛੋਟਾ ਹੋ ਕੇ ਸਿਰਫ਼ ਪੱਟੀ ਰਹਿ ਗਿਆ। ਪੰਜਾਬੀ ਵਿੱਚ "ਪੱਟੀ" ਦਾ ਅਰਥ "ਗਲੀ" ਜਾਂ ਖੇਤਰੀ ਪੱਟੀ ਹੈ, ਜੋ ਸ਼ਹਿਰ ਦੀ ਗਲੀਆਂ-ਕੇਂਦਰਿਤ ਬਣਤਰ ਅਤੇ ਵਪਾਰਕ ਸਰਗਰਮੀਆਂ ਨਾਲ ਜੁੜਦਾ ਹੈ। ਲੋਕ-ਸੰਸਕ੍ਰਿਤੀ ਵਿੱਚ "ਪੱਟੀ" words ਕਈ ਵਾਰ ਵੰਸ਼/ਪਰਿਵਾਰਕ ਸਮੂਹਾਂ ਲਈ ਵੀ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ, ਇਸ ਲਈ ਪੱਟੀ ਦੀ ਸੱਭਿਆਚਾਰਕ-ਸਮਾਜਿਕ ਬਣਤਰ ਵਿੱਚ ਪਰਿਵਾਰਕ ਧਾਰਾਵਾਂ ਦੀ ਝਲਕ ਮਿਲਦੀ ਹੈ।</p>
      <p>ਪੁਰਾਣੇ ਜ਼ਮਾਨੇ ਵਿੱਚ ਪੱਟੀ "ਨੌ ਲੱਖੀ ਪੱਟੀ" ਵੀ ਕਿਹਾ ਜਾਂਦਾ ਸੀ—ਭਾਵ ਕਿ ਇੱਥੋਂ ਦਾ ਸਾਲਾਨਾ ਭੂਮੀ-ਰਾਜਸਵ/ਆਮਦਨ ਬਹੁਤ ਉੱਚੀ ਸੀ (ਲਗਭਗ ਨੌ ਲੱਖ ਰੁਪਏ), ਜਿਸ ਨਾਲ ਇਸਨੂੰ ਪੰਜਾਬੀ ਰਾਜਨੀਤਕ ਅਤੇ ਵਪਾਰਕ ਨਕਸ਼ੇ ‘ਤੇ ਖਾਸ ਥਾਂ ਮਿਲੀ।</p>
      <h4>ਸਥਾਨਿਕ ਭੂਗੋਲ ਅਤੇ ਬਸਤੀਆਂ</h4>
      <p>ਪੱਟੀ ਇੱਕ ਮਿਟੀਲੇ ਟਿੱਲੇ ‘ਤੇ ਬੱਸਿਆ ਦੱਸਿਆ ਜਾਂਦਾ ਹੈ; ਸ਼ਹਿਰ ਦੇ ਦੱਖਣ-ਪੂਰਬ ਪਾਸੇ ਇੱਕ ਹੋਰ ਉੱਚਾ ਟੀਲਾ ਹੈ ਜਿੱਥੇ ਇੱਕ ਪੁਰਾਤਨ ਸ਼ਿਵ ਮੰਦਰ ਦੀ ਪਰੰਪਰਿਕ ਸੂਚਨਾ ਮਿਲਦੀ ਹੈ। ਇਹ ਬਹੁਧਾਰਮਿਕ ਵਿਰਾਸਤ ਅਤੇ ਪੁਰਾਤੱਤਵਕ ਸੰਭਾਵਨਾਵਾਂ ਨੂੰ ਦਰਸਾਉਂਦਾ ਹੈ।</p>
    `,
    map: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d27233.84138791328!2d74.86949983238525!3d31.1937777812888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x391a7bc88a09f1cf%3A0x947c8934934efc8f!2sPatti%2C%20Punjab%20143416!5e0!3m2!1sen!2sin!4v1708548734338!5m2!1sen!2sin"
  },

  'mughal': {
    title: 'ਮੁਗਲ ਕਾਲ',
    content: `
      <h4>ਮੁਗਲ ਕਾਲ ਅਤੇ ਦੁਨੀ ਚੰਦ ਦਾ ਕਿਲ੍ਹਾ</h4>
      <p>ਮੁਗਲ ਕਾਲ ਦੌਰਾਨ, ਪੱਟੀ ਨੇ ਇੱਕ ਮਹੱਤਵਪੂਰਨ ਪ੍ਰਸ਼ਾਸਕੀ ਭੂਮਿਕਾ ਨਿਭਾਈ, ਜਿੱਥੇ ਪੰਜਾਬ ਦਾ ਮੁਗਲ ਗਵਰਨਰ ਵੀ ਰਹਿੰਦਾ ਸੀ। ਅੱਜ ਵੀ ਸ਼ਹਿਰ ਵਿੱਚ ਮੁਗਲ ਦੌਰ ਦੀਆਂ ਇਮਾਰਤਾਂ ਅਤੇ ਅਵਸ਼ੇਸ਼ ਦੇਖਣ ਨੂੰ ਮਿਲਦੇ ਹਨ। ਇੱਥੇ ਇੱਕ ਪੁਰਾਣਾ ਕਿਲ੍ਹਾ ਹੈ, ਜਿਸਨੂੰ ਪਹਿਲਾਂ ਰਾਏ/ਰਾਜਾ ਦੁਨੀ ਚੰਦ ਦੀ ਹਵੇਲੀ ਕਿਹਾ ਜਾਂਦਾ ਸੀ।</p>
      <h4>ਬੀਬੀ ਰਜਨੀ ਜੀ ਦੀ ਕਹਾਣੀ</h4>
      <p>ਦੁਨੀ ਚੰਦ ਦੀ ਸਭ ਤੋਂ ਛੋਟੀ ਧੀ ਬੀਬੀ ਰਜਨੀ ਨੇ ਐਲਾਨ ਕੀਤਾ ਕਿ ਅਸਲ ਪਾਲਣਹਾਰ ਅਕਾਲ ਪੁਰਖ ਵਾਹਿਗੁਰੂ ਹੈ; ਨਾਰਾਜ਼ ਪਿਤਾ ਨੇ ਉਸਦਾ ਵਿਆਹ ਇੱਕ ਕੋੜ੍ਹੀ ਨਾਲ ਕਰ ਦਿੱਤਾ। ਬੀਬੀ ਜੀ ਨੇ ਆਪਣੇ ਪਤੀ ਨੂੰ ਦੁੱਖ ਬੰਜਨੀ ਬੇਰੀ ਵਾਲੇ ਤਲਾਬ ‘ਚ ਇਸ਼ਨਾਨ ਕਰਵਾਇਆ, ਜਿਥੇ ਚਮਤਕਾਰੀ ਤੌਰ ‘ਤੇ ਉਹ ਚੰਗਾ ਹੋ ਗਿਆ—ਇਹ ਉਹੀ ਥਾਂ ਹੈ ਜਿਥੇ ਬਾਅਦ ਵਿੱਚ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦਾ ਪਵਿੱਤਰ ਸਰੋਵਰ ਵਿਕਸਿਤ ਹੋਇਆ। ਇਹ ਕਥਾ ਪੱਟੀ ਨੂੰ ਸਿੱਖ ਧਾਰਮਿਕ ਇਤਿਹਾਸ ਨਾਲ ਡੂੰਘੀ ਡੋਰ ਨਾਲ ਜੋੜਦੀ ਹੈ।</p>
      <h4>ਮੀਰ ਮੰਨੂ ਅਤੇ ਜੁਲਮ ਦੀਆਂ ਦਸਤਾਨਾਂ</h4>
      <p>ਮੁਗਲ ਦੌਰ ਦੇ ਸੂਬਾਦਾਰਾਂ ਵਿੱਚ ਮੀਰ ਮੰਨੂ ਦਾ ਨਾਮ ਜੁਲਮਾਂ ਲਈ ਚਰਚਿਤ ਹੈ; ਸਿੱਖ ਇਤਿਹਾਸ ਵਿੱਚ ਉਸ ਸਮੇਂ ਦੀਆਂ ਕਥਾਵਾਂ ਵਿੱਚ ਸਤੀਆਂ ਅਤੇ ਮਾਸੂਮਾਂ ‘ਤੇ ਅਤਿਆਚਾਰਾਂ ਦੀਆਂ ਵੀਰਲੀਆਂ ਕਹਾਣੀਆਂ ਰੋਜ਼ਾਨਾ ਦੀ ਅਰਦਾਸ ਦੇ ਸੰਦਰਭ ਬਣ ਗਈਆਂ।</p>
      <h4>ਸ਼ਹਿਰੀ ਢਾਂਚਾ</h4>
      <p>1755 ਦੇ ਆਸ-ਪਾਸ ਬਣੇ ਕਿਲ੍ਹੇ ਨਾਲ-ਨਾਲ ਸ਼ਹਿਰ ਦੀ ਬਾਹਰੀ ਕੰਧ ਅਤੇ ਮੁਗਲ ਦੌਰ ਦੀਆਂ ਹੋਰ ਇਮਾਰਤਾਂ (ਮਸਜਿਦਾਂ/ਮਕਬਰਿਆਂ ਦੇ ਅਵਸ਼ੇਸ਼) ਪੱਟੀ ਦੇ ਪ੍ਰਸ਼ਾਸਕੀ ਅਤੇ ਸੈਨਿਕ ਮਹੱਤਵ ਦੀ ਨਿਸ਼ਾਨਦੇਹੀ ਕਰਦੀਆਂ ਹਨ—ਬਹੁਤੇ ਅੱਜ ਸੰਰਕਸ਼ਣ ਦੀ ਮੰਗ ਕਰ ਰਹੇ ਹਨ।</p>
    `,
    map: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d27233.84138791328!2d74.86949983238525!3d31.1937777812888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x391a7bc88a09f1cf%3A0x947c8934934efc8f!2sPatti%2C%20Punjab%20143416!5e0!3m2!1sen!2sin!4v1708548734338!5m2!1sen!2sin"
  },

  'sikh': {
    title: 'ਸਿੱਖ ਰਾਜ',
    content: `
      <h4>ਮਿਸਲਾਂ ਦਾ ਰਾਜ ਅਤੇ ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਦਾ ਪ੍ਰਭਾਵ</h4>
      <p>18ਵੀਂ ਸਦੀ ਵਿੱਚ ਮੁਗਲ ਸਾਮਰਾਜ ਦੇ ਪਤਨ ਤੋਂ ਬਾਅਦ, ਸਿੱਖ ਮਿਸਲਾਂ ਦਾ ਉੱਭਾਰ ਹੋਇਆ। ਇਸ ਦੌਰਾਨ ਪੱਟੀ ਸੱਤਾ-ਸੰਘਰਸ਼ਾਂ ਦਾ ਹਿੱਸਾ ਬਣੀ ਅਤੇ 1755–56 ਵਿੱਚ ਫੈਜ਼ਲਪੁਰੀਆ (ਸਿੰਘਪੁਰੀਆ) ਮਿਸਲ ਦੇ ਖ਼ੁਸ਼ਾਲ ਸਿੰਘ ਨੇ ਪਠਾਣਾਂ ਤੋਂ ਪੱਟੀ ਨੂੰ ਜਿੱਤ ਲਿਆ। ਬਾਅਦ ਵਿੱਚ ਦੀਵਾਨ ਮੋਹਕਮ ਚੰਦ ਦੀ ਕਮਾਨ ਹੇਠ ਫੌਜ ਨੇ ਇੱਥੇ ਕਾਬੂ ਕਰਕੇ 1811 ਵਿੱਚ ਪੱਟੀ ਨੂੰ ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਦੇ ਸਾਮਰਾਜ ਵਿੱਚ ਸ਼ਾਮਲ ਕੀਤਾ। ਕਿਹਾ ਜਾਂਦਾ ਹੈ ਕਿ ਘੇਰਾਬੰਦੀ ਦੌਰਾਨ ਬਾਹਰੀ ਕੰਧ ਦਾ ਹਿੱਸਾ ਢਹਿ ਗਿਆ।</p>
      <p>ਇਹ ਵੀ ਦੱਸਿਆ ਜਾਂਦਾ ਹੈ ਕਿ ਕਿਲ੍ਹੇ ਵਿੱਚੋਂ ਇੱਕ ਸੁਰੰਗ ਲਾਹੌਰ ਵੱਲ ਜਾਂਦੀ ਸੀ ਜੋ ਬਾਅਦ ਵਿੱਚ ਬੰਦ ਕਰ ਦਿੱਤੀ ਗਈ। ਇੱਕ ਪਰੰਪਰਾ ਅਨੁਸਾਰ, ਦੁਨੀ ਚੰਦ ਦੀ ਹਵੇਲੀ ਨੂੰ ਛੇਵੀਂ ਪਾਤਸ਼ਾਹੀ ਗੁਰੂ ਹਰਿਗੋਬਿੰਦ ਸਾਹਿਬ ਜੀ ਦੇ ਸੰਜੋਗ ਨਾਲ ਕਿਲ੍ਹੇ ਵਜੋਂ ਮਜਬੂਤ ਕੀਤਾ ਗਿਆ।</p>

      <h4>ਪੱਟੀ ਦੀ ਸ਼ਹੀਦੀ ਅਤੇ ਸਿੱਖ ਇਤਿਹਾਸ</h4>
      <p>ਮੁਗਲ-ਪਸ਼ਚਾਤ ਦਮਨਕਾਰੀ ਦੌਰਾਂ ਵਿੱਚ ਪੱਟੀ ਅਤੇ ਇਸਦਾ ਕਿਲ੍ਹਾ ਸਿੱਖ ਜੱਥੇਦਾਰਾਂ ਨੂੰ ਸਜ਼ਾਵਾਂ ਦੇ ਕੇਂਦਰ ਵਜੋਂ ਜ਼ਿਕਰਤ ਹੈ। ਸ਼ਹੀਦਾਂ ਦੀਆਂ ਕਥਾਵਾਂ, ਜਿਵੇਂ ਭਾਈ ਤਾਰੂ ਸਿੰਘ ਜੀ ਦੀ ਅਟੱਲਤਾ, ਸਿੱਖ ਅਰਦਾਸ ਦਾ ਹਿੱਸਾ ਹਨ ਅਤੇ ਸਮੂਹਕ ਯਾਦ ਵਿੱਚ ਪੱਟੀ ਦੀ ਭੂਮਿਕਾ ਨੂੰ ਅਮਰ ਕਰਦੀਆਂ ਹਨ।</p>

      <h4>ਬਾਬਾ ਬਿਧੀ ਚੰਦ ਜੀ ਨਾਲ ਸੰਬੰਧਤ ਗੁਰਦੁਆਰੇ</h4>
      <p><strong>ਗੁਰਦੁਆਰਾ ਸ੍ਰੀ ਚੌਬਾਰਾ ਸਾਹਿਬ</strong>: ਕਥਾ ਅਨੁਸਾਰ, ਭਾਈ ਬਿਧੀ ਚੰਦ ਜੀ ਨੇ ਔਰਤ ਦਾ ਭੇਸ ਬਦਲ ਕੇ ਹਾਕਮ ਦੇ ਘਰੋਂ ਗੁਰੂ ਹਰਿਗੋਬਿੰਦ ਸਾਹਿਬ ਜੀ ਲਈ ਆਏ ਕੀਮਤੀ ਦੁਸ਼ਾਲੇ ਚਤੁਰਾਈ ਨਾਲ ਵਾਪਸ ਪ੍ਰਾਪਤ ਕੀਤੇ—ਇਹ ਥਾਂ ਅੱਜ ਗੁਰਦੁਆਰੇ ਰੂਪ ਵਿੱਚ ਮਰਯਾਦਿਤ ਹੈ।</p>
      <p><strong>ਗੁਰਦੁਆਰਾ ਸ੍ਰੀ ਭੱਠ ਸਾਹਿਬ</strong>: ਭੱਜਦਿਆਂ ਵੇਲੇ ਭਾਈ ਸਾਹਿਬ ਤਪਦੀ ਭੱਠੀ ਵਿੱਚ ਸ਼ਰਣੀ ਹੋਏ; ਗੁਰੂ ਕਿਰਪਾ ਨਾਲ ਕੁਝ ਨੁਕਸਾਨ ਬਿਨਾ ਬਚ ਨਿਕਲੇ—ਇਸ ਥਾਂ ਦੀ ਯਾਦ ਵੀ ਅੱਜ ਗੁਰਦੁਆਰੇ ਰੂਪ ‘ਚ ਸਾਂਭੀ ਹੋਈ ਹੈ।</p>
    `,
    map: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d27233.84138791328!2d74.86949983238525!3d31.1937777812888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x391a7bc88a09f1cf%3A0x947c8934934efc8f!2sPatti%2C%20Punjab%20143416!5e0!3m2!1sen!2sin!4v1708548734338!5m2!1sen!2sin"
  },

  'british': {
    title: 'ਬ੍ਰਿਟਿਸ਼ ਹਕੂਮਤ',
    content: `
      <h4>ਬ੍ਰਿਟਿਸ਼ ਦੌਰ ਅਤੇ ਵੰਡ</h4>
      <p>ਉੱਨੀਵੀਂ ਸਦੀ ਦੇ ਯਾਤਰਾ-ਵਰਣਨਾਂ ਵਿੱਚ ਪੱਟੀ ਦੀ ਆਬਾਦੀ ਲਗਭਗ 5,000 ਦਰਜ ਕੀਤੀ ਮਿਲਦੀ ਹੈ। ਆਜ਼ਾਦੀ ਤੋਂ ਪਹਿਲਾਂ ਪੱਟੀ ਲਾਹੌਰ ਜ਼ਿਲ੍ਹੇ ਦੀ ਇੱਕ ਤਹਿਸੀਲ ਸੀ; 1947 ਦੀ ਵੰਡ ਤੋਂ ਬਾਅਦ ਇਹ ਅੰਮ੍ਰਿਤਸਰ ਜ਼ਿਲ੍ਹੇ ਦੇ ਅਧੀਨ ਆ ਗਿਆ। ਵੰਡ ਨਾਲ ਸਮਾਜਕ-ਧਾਰਮਿਕ ਬਣਤਰ ਵਿੱਚ ਡੂੰਘੀਆਂ ਤਬਦੀਲੀਆਂ ਆਈਆਂ; ਗਿਲਾਨੀ ਅਤੇ ਮਿਰਜ਼ੇ ਵਰਗੇ ਕਈ ਪੁਰਾਤਨ ਪਰਿਵਾਰ ਪਾਕਿਸਤਾਨ ਮਾਈਗ੍ਰੇਟ ਕਰ ਗਏ।</p>
      <p>ਵੰਡ-ਪਿਛੋਂ ਪ੍ਰਸ਼ਾਸਕੀ ਰੀ-ਆਰਗੇਨਾਈਜ਼ੇਸ਼ਨ ਨਾਲ ਪੱਟੀ ਦੀ ਨਗਰਿਕ ਅਤੇ ਆਰਥਿਕ ਧੁਰੀ ਬਦਲੀ, ਪਰ ਇਤਿਹਾਸਕ ਢਾਂਚਿਆਂ ਦੀ ਸੰਭਾਲ ਲਈ ਲੰਬੇ ਸਮੇਂ ਤਕ ਸਿਸਟਮੈਟਿਕ ਯਤਨਾਂ ਦੀ ਲੋੜ ਮਹਿਸੂਸ ਹੁੰਦੀ ਰਹੀ।</p>
    `,
    map: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d27233.84138791328!2d74.86949983238525!3d31.1937777812888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x391a7bc88a09f1cf%3A0x947c8934934efc8f!2sPatti%2C%20Punjab%20143416!5e0!3m2!1sen!2sin!4v1708548734338!5m2!1sen!2sin"
  },

  'modern': {
    title: 'ਆਧੁਨਿਕ ਕਾਲ',
    content: `
      <h4>ਪੋਸਟ-2006 ਪ੍ਰਸ਼ਾਸਕੀ ਸੰਦਰਭ</h4>
      <p>2006 ਵਿੱਚ ਤਰਨ ਤਾਰਨ ਨੂੰ ਵੱਖਰਾ ਜ਼ਿਲ੍ਹਾ ਬਣਾਏ ਜਾਣ ਤੋਂ ਬਾਅਦ, ਪੱਟੀ ਇਸ ਦੀ ਇੱਕ ਮੁੱਖ ਤਹਿਸੀਲ ਵਜੋਂ ਉਭਰੀ। ਅੱਜ ਪੱਟੀ ਖੇਤੀਬਾੜੀ-ਕੇਂਦਰਿਤ ਆਰਥਿਕਤਾ ਨਾਲ-ਨਾਲ ਸਿੱਖਿਆ, ਸਿਹਤ ਅਤੇ ਆਵਾਜਾਈ ਢਾਂਚੇ ‘ਚ ਸੁਧਾਰਾਂ ਦੇ ਰਾਹ ‘ਤੇ ਹੈ।</p>

      <h4>ਸਮਾਜਿਕ-ਸੁਰੱਖਿਆ ਅਤੇ ਹਾਲੀਆ ਦੌਰ</h4>
      <p>ਸਰਹੱਦੀ ਸ਼ਹਿਰ ਵਜੋਂ ਕੋਵਿਡ-19 ਦੌਰਾਨ ਟੀਕਾਕਰਨ ਮੁਹਿੰਮ ‘ਚ ਤੇਜ਼ਗਤੀ ਦਿਖੀ। 1980 ਦੇ ਦਹਾਕੇ ਦੇ ਖੇਤਰਕ ਅਸਥਿਰਤਾ (ਖਾੜਕੂਵਾਦ) ਨੇ ਵੀ ਪੱਟੀ-ਪਾਸੇ ਸਮਾਜਿਕ-ਸਿਆਸੀ ਮਾਹੌਲ ‘ਤੇ ਪ੍ਰਭਾਵ ਪਾਇਆ—ਸਰਹੱਦੀ ਨੇੜਤਾ ਕਰਕੇ ਸੰਵੇਦਨਸ਼ੀਲਤਾ ਵਧੀ ਰਹੀ।</p>

      <h4>ਪੱਟੀ ਦੀਆਂ ਪ੍ਰਮੁੱਖ ਇਤਿਹਾਸਕ ਇਮਾਰਤਾਂ</h4>
      <ul>
        <li><strong>1755 ਦਾ ਇਤਿਹਾਸਕ ਕਿਲ੍ਹਾ (Patti Qila)</strong>: ਮੁਗਲ-ਸਿੱਖ ਯੁੱਗ ਦੀ ਨਿਸ਼ਾਨੀ; ਲੰਮੇ ਸਮੇਂ ਤਕ ਸਥਾਨਕ ਪੁਲਿਸ ਸਟੇਸ਼ਨ ਇਥੇ ਚੱਲਦਾ ਰਿਹਾ।</li>
        <li><strong>ਸ਼ਹਿਰ ਦੀ ਕੰਧ</strong>: ਪੁਰਾਣੀ ਘੇਰਾਬੰਦੀ ਕੰਧ ਦੇ ਕੁਝ ਅਵਸ਼ੇਸ਼ ਅੱਜ ਵੀ ਦਿੱਸਦੇ ਹਨ।</li>
        <li><strong>ਰਾਏ/ਰਾਜਾ ਦੁਨੀ ਚੰਦ ਦੀ ਹਵੇਲੀ</strong>: ਇਥੋਂ ਹੀ ਬੀਬੀ ਰਜਨੀ ਦੀ ਕਹਾਣੀ ਜੁੜਦੀ ਹੈ; ਕਿਲਾ-ਪਰਿਸਰ ਨਾਲ ਪਰੰਪਰਿਕ ਤੌਰ ‘ਤੇ ਜੋੜੀ ਜਾਂਦੀ ਹੈ।</li>
        <li><strong>ਸ਼ਿਵ ਮੰਦਰ (ਦੱਖਣ-ਪੂਰਬੀ ਟਿੱਲਾ)</strong>: ਪ੍ਰਾਚੀਨ ਹਿੰਦੂ ਧਾਰਮਿਕ ਵਿਰਾਸਤ ਦੀ ਝਲਕ।</li>
        <li><strong>ਗੁਰਦੁਆਰਾ ਸ੍ਰੀ ਚੌਬਾਰਾ ਸਾਹਿਬ</strong>: ਭਾਈ ਬਿਧੀ ਚੰਦ ਜੀ ਵਾਲੀ ਦੁਸ਼ਾਲਿਆਂ ਦੀ ਕਥਾ ਨਾਲ ਪ੍ਰਸਿੱਧ—ਪੁਰਾਣੇ ਹਾਕਮ ਦੀ ਰਿਹਾਇਸ਼-ਥਾਂ ‘ਤੇ ਸਥਿਤ ਮੰਨੀ ਜਾਂਦੀ ਹੈ।</li>
        <li><strong>ਗੁਰਦੁਆਰਾ ਸ੍ਰੀ ਭੱਠ ਸਾਹਿਬ</strong>: ਤਪਦੀ ਭੱਠੀ ‘ਚ ਸ਼ਰਣ ਦੀ ਕਥਾ ਨਾਲ ਜੁੜਿਆ ਸਥਾਨ।</li>
        <li><strong>ਗਿਲਾਨੀ ਪਰਿਵਾਰ ਦੀਆਂ ਮਜ਼ਾਰਾਂ</strong>: ਸੂਫ਼ੀ ਪਰੰਪਰਾ ਦੇ ਧਾਰਮਿਕ ਸਥਾਨਾਂ ਦੀ ਸੂਝ।</li>
      </ul>

      <h4>ਪੰਜਾਬ ਦੀ ਇਤਿਹਾਸਕ ਸਥਾਨਕ ਕਹਾਣੀਆਂ</h4>
      <p>ਪੱਟੀ ਅਤੇ ਆਲੇ-ਦੁਆਲੇ ਦੀਆਂ ਸਥਾਨਕ ਕਹਾਣੀਆਂ—ਬੀਬੀ ਰਜਨੀ, ਭਾਈ ਬਿਧੀ ਚੰਦ, ਅਤੇ ਮਿਸਲ-ਕਾਲ ਦੇ ਜੰਗੀ ਅਧਿਆਇ—ਪੰਜਾਬੀ ਸਾਹਿਤ, ਕਵਿਤਾ ਅਤੇ ਲੋਕ-ਗੀਤਾਂ ਵਿੱਚ ਵਿਆਪਕ ਹਨ। ਇਹ ਕਹਾਣੀਆਂ ਇਥੋਂ ਦੇ ਲੋਕ-ਧਾਰਮਿਕ ਵਿਸ਼ਵਾਸ, ਦਿਲੇਰੀ ਅਤੇ ਸਮੂਹਕ ਸੰਘਰਸ਼ ਦੀਆਂ ਨਿਸ਼ਾਨੀਆਂ ਹਨ।</p>

      <h4>ਪੱਟੀ ਅਤੇ ਪੰਜਾਬੀ ਸੱਭਿਆਚਾਰ</h4>
      <p>ਪੱਟੀ ਦੀ ਪ੍ਰਭਾਵਸ਼ਾਲੀ ਅਭਿਭਾਵਕਤਾ ਨੇ ਪੰਜਾਬ ਵਿੱਚ ਧਾਰਮਿਕ, ਰਾਜਸੀ ਅਤੇ ਆਰਥਿਕ ਵਿਰਾਸਤ ਨੂੰ ਵਧਾਇਆ। "ਪੱਟੀ" ਸ਼ਬਦ ਖੁਦ ਗਲੀ-ਕੇਂਦਰਿਤ ਬਸਤੀਆਂ ਅਤੇ ਵੰਸ਼-ਆਧਾਰਿਤ ਸਮਾਜਿਕ ਬਣਤਰ ਨੂੰ ਦਰਸਾਉਂਦਾ ਹੈ; ਸੂਫ਼ੀ (ਗਿਲਾਨੀ) ਅਤੇ ਗੁਰਮਤ ਅਨੁਭਵਾਂ ਦੀ ਮਿਲੀ-ਝੁਲੀ ਧਾਰਾ ਇਥੇ ਦੀ ਰੰਗਤ ਹੈ।</p>

      <h4>ਸੰਭਾਲ ਦੀ ਲੋੜ</h4>
      <p>ਕਿਲ੍ਹਾ, ਸ਼ਹਿਰੀ ਕੰਧ, ਹਵੈਲੀਆਂ, ਗੁਰਦੁਆਰੇ ਅਤੇ ਮਜ਼ਾਰਾਂ—ਬਹੁਤੀਆਂ ਥਾਵਾਂ ਖੰਡਰ-ਹਾਲ ਹੋ ਰਹੀਆਂ ਹਨ। ਸਰਕਾਰ ਅਤੇ ਸਥਾਨਕ ਸਮਾਜ ਦੀ ਸਾਂਝੀ ਕੋਸ਼ਿਸ਼, ਦਸਤਾਵੇਜ਼ੀਕਰਨ, ਧਰੋਹਰ-ਨਵੀਨੀਕਰਣ ਅਤੇ ਜ਼ਿੰਮੇਵਾਰ ਟੂਰਿਜ਼ਮ ਰਾਹੀਂ ਆਗਾਮੀ ਪੀੜ੍ਹੀਆਂ ਲਈ ਇਹ ਅਮੀਰ ਵਿਰਾਸਤ ਸੰਭਾਲੀ ਜਾ ਸਕਦੀ ਹੈ।</p>

      <h4>ਸਾਰੀ ਗੱਲ ਦਾ ਸਾਰ</h4>
      <p>ਪੱਟੀ ਦਾ ਇਤਿਹਾਸ ਲਗਭਗ ਇੱਕ ਹਜ਼ਾਰ ਸਾਲ ਪੁਰਾਣਾ ਅਤੇ ਕਥਾਵਾਂ ਨਾਲ ਭਰਪੂਰ ਹੈ—"ਨੌ ਲੱਖੀ ਪੱਟੀ" ਤੋਂ ਮੁਗਲ ਪ੍ਰਸ਼ਾਸਨ, ਸਿੱਖ ਜੱਥਿਆਂ ਦੇ ਹੌਂਸਲੇ-ਸ਼ਹੀਦੀਆਂ, ਮਿਸਲਾਂ ਦੀ ਰਾਜਨੀਤ, ਰਣਜੀਤਕਾਲੀ ਇਕਾਈਕਰਨ, ਵੰਡ-ਪਿਛੋਂ ਪ੍ਰਸ਼ਾਸਕੀ ਬਦਲਾਅ ਅਤੇ ਅੱਜ ਦੀ ਉਭਰਦੀ ਨਗਰਿਕਤਾ ਤੱਕ—ਇਹ ਸਭ ਕੁਝ ਪੰਜਾਬੀ ਸੱਭਿਆਚਾਰਕ ਯਾਦ ਵਿੱਚ ਪੱਟੀ ਦੀ ਇੱਕ ਖ਼ਾਸ ਪਹਿਚਾਣ ਬਣਾਉਂਦਾ ਹੈ।</p>
    `,
    map: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d27233.84138791328!2d74.86949983238525!3d31.1937777812888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x391a7bc88a09f1cf%3A0x947c8934934efc8f!2sPatti%2C%20Punjab%20143416!5e0!3m2!1sen!2sin!4v1708548734338!5m2!1sen!2sin"
  }
};

  // ========== 2) Element references ==========
  const timelineItems = document.querySelectorAll('.timeline-item');
  const modal = document.getElementById('history-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContentDiv = document.getElementById('modal-text-content');
  const modalImageContainer = document.getElementById('modal-image-container'); // reserved for future images
  const modalMapContainer = document.getElementById('modal-map-container');
  const closeModalBtn = document.getElementById('modal-close');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const jumpSelect = document.getElementById('jump-select'); // native select, navigates on change
  const modalBody = document.getElementById('modal-body') || modal?.querySelector('.modal-body') || modal;

  // ========== 3) Order and labels ==========
  const eras = ['ancient', 'mughal', 'sikh', 'british', 'modern'];
  const eraLabels = {
    ancient: 'ਪੁਰਾਤਨ/ਮੱਧਕਾਲ',
    mughal:  'ਮੁਗਲ ਕਾਲ',
    sikh:    'ਸਿੱਖ ਰਾਜ',
    british: 'ਬ੍ਰਿਟਿਸ਼/ਵੰਡ',
    modern:  'ਆਧੁਨਿਕ ਕਾਲ'
  };

  let currentEraIndex = 0;
  let focusTrapCleanup = null;

  // ========== 4) Modal Manager (supports multiple modals; close-all on demand) ==========
  const ModalManager = (() => {
    const MODAL_SELECTOR = '.modal-overlay';
    const STATE_KEY = 'modal';

    const allModals = () => Array.from(document.querySelectorAll(MODAL_SELECTOR));

    function isAnyModalOpen() {
      return allModals().some(m => m.getAttribute('aria-hidden') === 'false');
    }

    function openModal(modalEl) {
      modalEl.setAttribute('aria-hidden', 'false');
      modalEl.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    function hideModal(modalEl) {
      modalEl.setAttribute('aria-hidden', 'true');
      modalEl.style.display = 'none';
    }

    function closeAllModals() {
      allModals().forEach(hideModal);
      document.body.style.overflow = 'auto';
    }

    function pushModalState(extra = {}) {
      const state = { [STATE_KEY]: true, ...extra };
      try { history.pushState(state, '', location.hash || location.href); } catch {}
    }

    // Back/Forward integration: restore or clear modal state
    function onPopState(event) {
      const st = event.state;
      if (st && st[STATE_KEY]) {
        if (!isAnyModalOpen()) {
          const primary = document.querySelector(MODAL_SELECTOR);
          if (primary) openModal(primary);
        }
      } else {
        closeAllModals();
      }
    }

    window.addEventListener('popstate', onPopState); // History-driven behavior [1][3]

    return { openModal, closeAllModals, pushModalState };
  })();

  // ========== 5) Helpers for history modal ==========
  function setPrevNextLabels() {
    const hasPrev = currentEraIndex > 0;
    const hasNext = currentEraIndex < eras.length - 1;

    if (hasPrev) {
      const prevKey = eras[currentEraIndex - 1];
      prevBtn.textContent = `← ${eraLabels[prevKey]}`;
      prevBtn.setAttribute('aria-label', `Previous: ${eraLabels[prevKey]}`);
      prevBtn.disabled = false;
    } else {
      prevBtn.textContent = '—';
      prevBtn.setAttribute('aria-label', 'No previous era');
      prevBtn.disabled = true;
    }

    if (hasNext) {
      const nextKey = eras[currentEraIndex + 1];
      nextBtn.textContent = `${eraLabels[nextKey]} →`;
      nextBtn.setAttribute('aria-label', `Next: ${eraLabels[nextKey]}`);
      nextBtn.disabled = false;
    } else {
      nextBtn.textContent = '—';
      nextBtn.setAttribute('aria-label', 'No next era');
      nextBtn.disabled = true;
    }
  }

  function updateJumpSelect() {
    if (jumpSelect) jumpSelect.value = eras[currentEraIndex];
  }

  function scrollModalToTop() {
    try { modalBody.scrollTo({ top: 0, behavior: 'smooth' }); } catch { modalBody.scrollTop = 0; }
  }

  function updateModalContent(eraIndex) {
    const eraKey = eras[eraIndex];
    const data = historyData[eraKey];
    modalTitle.textContent = data.title;
    modalContentDiv.innerHTML = data.content;
    modalMapContainer.innerHTML = `<iframe class="map" src="${data.map}" width="100%" height="250" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`;
    currentEraIndex = eraIndex;
    setPrevNextLabels();
    updateJumpSelect();
    scrollModalToTop();
  }

  // Accessible focus trapping and keyboard controls per WAI-ARIA Dialog pattern
  function trapFocus(container) {
    const focusable = container.querySelectorAll('a[href], button:not([disabled]), select, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return () => {};
    const first = focusable;
    const last = focusable[focusable.length - 1];

    function onKeydown(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault(); goPrevEra(true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault(); goNextEra(true);
      } else if (e.key === 'Escape') {
        e.preventDefault(); closeAllViaHistory();
      }
    }
    container.addEventListener('keydown', onKeydown);
    (closeModalBtn || first).focus();
    return () => container.removeEventListener('keydown', onKeydown);
  }

  function showModal() {
    ModalManager.openModal(modal);
    focusTrapCleanup = trapFocus(modal);
  }

  function hideModal() {
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    if (focusTrapCleanup) { focusTrapCleanup(); focusTrapCleanup = null; }
  }

  // ========== 6) History API integration for modal open/era change ==========
  function pushEraState(eraIndex) {
    const key = eras[eraIndex];
    try { history.pushState({ modal: true, eraIndex }, '', `#history-${key}`); } catch {} // state drives Back/Forward [3][8]
  }

  function openEra(eraIndex, { pushState = false } = {}) {
    updateModalContent(eraIndex);
    if (modal.getAttribute('aria-hidden') === 'true') {
      showModal();
    }
    if (pushState) {
      pushEraState(eraIndex);
      ModalManager.pushModalState({ eraIndex }); // keep a modal state marker for cross-modal close [3][11]
    }
  }

  // Clicking close should close ALL modals (global requirement)
  function closeAllViaHistory() {
    try { history.back(); } catch {}
    // Safety fallback in case no state to go back to
    setTimeout(() => {
      if (modal.getAttribute('aria-hidden') === 'false') {
        ModalManager.closeAllModals();
      }
    }, 150);
  }

  // ========== 7) Wire timeline cards and interactions ==========
  timelineItems.forEach((item, index) => {
    item.addEventListener('click', () => openEra(index, { pushState: true }));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEra(index, { pushState: true }); }
    });
  });

  closeModalBtn.addEventListener('click', closeAllViaHistory);
  window.addEventListener('click', (event) => { if (event.target === modal) closeAllViaHistory(); });

  // Prev/Next with era labeling and history
  function goPrevEra(push = false) {
    if (currentEraIndex > 0) openEra(currentEraIndex - 1, { pushState: push });
  }
  function goNextEra(push = false) {
    if (currentEraIndex < eras.length - 1) openEra(currentEraIndex + 1, { pushState: push });
  }
  prevBtn.addEventListener('click', () => goPrevEra(true));
  nextBtn.addEventListener('click', () => goNextEra(true));

  // Jump-to era (native select) navigates immediately (no extra button)
  if (jumpSelect) {
    jumpSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      const idx = eras.indexOf(key);
      if (idx >= 0) openEra(idx, { pushState: true });
    });
  }

  // Back/forward: restore prior era or close all modals
  window.addEventListener('popstate', (event) => {
    const state = event.state;
    if (state && state.modal === true && Number.isInteger(state.eraIndex)) {
      updateModalContent(state.eraIndex);
      if (modal.getAttribute('aria-hidden') === 'true') showModal();
    } else {
      // No modal state -> ensure all modals closed
      ModalManager.closeAllModals();
    }
  });

  // Deep-link: open era from hash on load
  const hash = location.hash;
  if (hash && hash.startsWith('#history-')) {
    const key = hash.replace('#history-', '');
    const idx = eras.indexOf(key);
    if (idx >= 0) {
      openEra(idx, { pushState: true });
    }
  }

  // ========== 8) Animated Number Counters (unchanged; independent from modal) ==========
  const elements = document.querySelectorAll('.animated-number');
  const observerOptions = { root: null, rootMargin: '0px', threshold: 0.5 };
  const observer = new IntersectionObserver((entries, observerRef) => {
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
          const currentNumber = Math.min((progress / duration) * endValue, endValue);
          const formattedNumber = Math.floor(currentNumber).toLocaleString();
          target.textContent = formattedNumber + (format ? format : '');
          if (progress < duration) {
            window.requestAnimationFrame(step);
          } else {
            target.textContent = endValue.toLocaleString() + (format ? format : '');
          }
        };
        window.requestAnimationFrame(step);
        observerRef.unobserve(target);
      }
    });
  }, observerOptions);
  elements.forEach(el => observer.observe(el));
});
