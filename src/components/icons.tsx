export function Emblem({small = false}:{small?:boolean}) {
  return <svg width={small?28:46} height={small?32:52} viewBox="0 0 46 52" fill="none" aria-hidden="true"><path d="M3 3h40v28c0 10-20 18-20 18S3 41 3 31V3Z" fill="#d5b879" stroke="#f3ddb0" strokeWidth="2"/><path d="M12 31V16h5v5h4V13h5v8h4v-5h5v15H12Z" fill="#183c32"/><path d="M20 31v-7h6v7" fill="#d5b879"/></svg>;
}
export function Resource({kind}:{kind:'gold'|'wood'}) {
  return kind === 'gold' ? <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#e1ba57" stroke="#785d25" strokeWidth="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="#8a6a26"/><path d="M12 8v8m-2-6h3m-3 4h3" stroke="#8a6a26"/></svg> : <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m5 19 13-13 3 5L8 23Z" transform="translate(-1 -3)" fill="#a7794d" stroke="#5f442e" strokeWidth="1.5"/><path d="m6 15 10-10M9 18l10-10" stroke="#d6b081"/><circle cx="6" cy="17" r="3" fill="#d6b081" stroke="#5f442e"/></svg>;
}
