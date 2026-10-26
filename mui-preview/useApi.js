import { useEffect, useState } from 'react';
import { readApi } from './lib/read-api';

// Loads one address with the signed-in session and reloads when `reload` changes. A null url means "nothing to load yet".
export default function useApi(url, reload = 0) {
  const [state, setState] = useState({ loading: Boolean(url), data: null, error: null });
  useEffect(() => {
    if (!url) { setState({ loading: false, data: null, error: null }); return undefined; }
    const abort = new AbortController();
    setState(current => ({ loading: true, data: current.data, error: null }));
    readApi(url, abort.signal)
      .then(data => setState({ loading: false, data, error: null }))
      .catch(error => { if (error.name !== 'AbortError') setState({ loading: false, data: null, error }); });
    return () => abort.abort();
  }, [url, reload]);
  return state;
}
