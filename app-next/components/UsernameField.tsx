// app-next/components/UsernameField.tsx
import { useEffect, useMemo, useState } from 'react';
import { checkUsernameAvailable, validateUsername, getUsernameSuggestions, clearUsernameCache } from '@/lib/username';
import styles from '@/styles/UsernameField.module.css';
import { FaCheckCircle, FaTimesCircle, FaLightbulb } from 'react-icons/fa';

interface UsernameFieldProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  showSuggestions?: boolean;
  excludeCurrent?: string;
}

export default function UsernameField({
  value,
  onChange,
  disabled = false,
  showSuggestions = true,
  excludeCurrent,
}: UsernameFieldProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid' | 'taken'>('idle');
  const [msg, setMsg] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const normalized = useMemo(() => value.toLowerCase().trim(), [value]);

  useEffect(() => {
    if (!value) {
      setStatus('idle');
      setMsg('');
      setSuggestions([]);
      return;
    }
    const validation = validateUsername(value);
    if (!validation.valid) {
      setStatus('invalid');
      setMsg(validation.error || 'Invalid username');
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        setStatus('loading');
        setMsg('Checking availability...');
        const available = await checkUsernameAvailable(value);
        if (cancelled) return;

        if (!available && excludeCurrent && normalized === excludeCurrent.toLowerCase()) {
          setStatus('valid');
          setMsg('This is your current username');
          setSuggestions([]);
          return;
        }

        if (available) {
          setStatus('valid');
          setMsg('Username is available!');
          setSuggestions([]);
        } else {
          setStatus('taken');
          setMsg('Username is already taken');
          setSuggestions(showSuggestions ? getUsernameSuggestions(value, 4) : []);
        }
      } catch {
        setStatus('invalid');
        setMsg('Unable to check username right now');
        setSuggestions([]);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value, showSuggestions, excludeCurrent, normalized]);

  useEffect(() => () => clearUsernameCache(), []);

  return (
    <div className={styles.wrap}>
      <label htmlFor="username" className={styles.label}>Username</label>
      <div className={`${styles.inputRow} ${status === 'valid' ? styles.ok : ''} ${status === 'invalid' || status === 'taken' ? styles.err : ''}`}>
        <span className={styles.at}>@</span>
        <input
          id="username"
          type="text"
          inputMode="text"
          autoComplete="username"
          placeholder="choose_username"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={styles.input}
          maxLength={20}
        />
        <span className={styles.statusIcon} aria-hidden>
          {status === 'valid' && <FaCheckCircle className={styles.okIcon} />}
          {(status === 'invalid' || status === 'taken') && <FaTimesCircle className={styles.errIcon} />}
        </span>
      </div>
      {msg && <p className={`${styles.help} ${status === 'valid' ? styles.okText : ''} ${status !== 'valid' ? styles.errText : ''}`}>{msg}</p>}
      {showSuggestions && suggestions.length > 0 && (
        <div className={styles.suggest}>
          <div className={styles.suggestHeader}><FaLightbulb /> Try one of these</div>
          <div className={styles.suggestList}>
            {suggestions.map((s) => (
              <button key={s} type="button" className={styles.suggestBtn} onClick={() => onChange(s)} disabled={disabled}>
                @{s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
