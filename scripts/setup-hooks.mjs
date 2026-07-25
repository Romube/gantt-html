// Configure git pour utiliser les hooks versionnés de scripts/hooks/.
// Lancé automatiquement via le script npm "prepare" (donc au `npm install`).
// Silencieux et sans échec hors d'un dépôt git (ex. install en dépendance).
import { execFileSync } from 'node:child_process';

try {
  execFileSync('git', ['config', 'core.hooksPath', 'scripts/hooks'], { stdio: 'ignore' });
  console.log('✓ Hooks git activés (core.hooksPath = scripts/hooks)');
} catch {
  // Pas un dépôt git, ou git indisponible : on n'empêche pas l'install.
}
