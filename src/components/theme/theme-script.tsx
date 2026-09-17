/**
 * Applies the stored theme before the first paint.
 *
 * This has to run as a blocking inline script in `<head>`: React hydrates
 * after the browser has already painted, so choosing the theme in an effect
 * shows every visitor who prefers dark a white flash first. The script is
 * deliberately tiny and defensive — storage throws in a private window, and a
 * theme is not worth an exception on the critical path.
 *
 * "system" writes no attribute at all, which lets the `prefers-color-scheme`
 * rules in globals.css answer instead of JavaScript guessing.
 */
const SCRIPT = `(function(){try{var t=localStorage.getItem('aibot-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
