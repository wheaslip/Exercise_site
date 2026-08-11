export function timerSeconds(timer, now = Date.now()) { return timer.seconds - (timer.running ? Math.floor(Math.max(0, now - timer.startedAt) / 1000) : 0); }
export function startTimer(timer, now = Date.now()) { return timer.running ? timer : {...timer, running:true, startedAt:now}; }
export function stopTimer(timer, now = Date.now()) { return {...timer, seconds:timerSeconds(timer,now), running:false, startedAt:null}; }
export function resetTimer() { return {seconds:0,running:false,startedAt:null}; }
export function addTimerSeconds(timer, seconds, now = Date.now()) { const current = timerSeconds(timer,now); return {...timer,seconds:current+seconds,startedAt:timer.running?now:null}; }
export function formatTimer(total) { const sign = total < 0 ? '−' : ''; const value=Math.abs(total); const h=Math.floor(value/3600),m=Math.floor(value%3600/60),s=value%60; return `${sign}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
export function timerStatus(seconds) { return seconds < 0 ? 'negative' : seconds < 300 ? 'warning' : 'healthy'; }
