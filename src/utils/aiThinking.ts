/**
 * Muestra un indicador "La IA está pensando..." con aparición retardada.
 *
 * El truco: el elemento se añade al DOM inmediatamente (invisible), y el CSS
 * aplica un `transition-delay: 2s` sobre la opacidad. Las transiciones CSS
 * corren en el compositor thread — siguen animándose aunque el hilo principal
 * esté bloqueado calculando minimax.
 *
 * Si la IA termina en <2s → el elemento se elimina antes de hacerse visible.
 * Si tarda >2s → aparece suavemente con fade-in al llegar a los 2s.
 *
 * @returns función para ocultar y eliminar el indicador
 */
export function showAiThinking(): () => void {
  const el = document.createElement('div');
  el.className = 'ai-thinking';
  el.innerHTML = `
    <div class="ai-thinking__card">
      <div class="ai-thinking__spinner"></div>
      <span>La IA está pensando...</span>
    </div>
  `;
  document.body.appendChild(el);
  // Un frame para que el browser pinte el estado inicial (opacity:0) antes de
  // añadir la clase que arranca la transition.
  requestAnimationFrame(() => el.classList.add('ai-thinking--show'));
  return () => el.remove();
}
