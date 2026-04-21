import { SpecSnapInspector } from '@tw199501/specsnap-inspector-react';
import type { Session } from '@tw199501/specsnap-inspector-react';
import './app.css';

export function App() {
  function onCopy(markdown: string): void {
    // eslint-disable-next-line no-console
    console.log('[demo-react] Copied MD length:', markdown.length);
  }

  function onCapture(payload: { frameIndex: number; session: Session }): void {
    // eslint-disable-next-line no-console
    console.log('[demo-react] Captured frame #' + payload.frameIndex, payload.session.frames.length, 'total');
  }

  return (
    <main className="page">
      <header>
        <h1>SpecSnap Inspector — React 18 demo</h1>
        <p className="lead">
          Click the blue ◎ button (bottom-right) to open the Inspector panel, then
          <strong> Start Inspect</strong>, then click any element below.
        </p>
      </header>

      <section className="targets">
        <div className="row">
          <button className="btn-primary">Save</button>
          <input className="input" placeholder="username" />
          <a className="link" href="#">Read the docs</a>
        </div>

        <div className="card">
          <h2>A dark card</h2>
          <p>with some <strong>styled text</strong> for inspection.</p>
        </div>

        <div className="grid">
          <div className="tile">Tile A</div>
          <div className="tile">Tile B</div>
          <div className="tile">Tile C</div>
        </div>
      </section>

      <SpecSnapInspector onCopy={onCopy} onCapture={onCapture} />
    </main>
  );
}
